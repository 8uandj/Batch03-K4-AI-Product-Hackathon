import OpenAI from "openai";
import { requireProjectAccess } from "@/features/workspace/access";
import type { TaskPriority } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

type TaskDraft = {
  title: string;
  description: string;
  priority: TaskPriority;
  assignee_id: string;
  required_skills: string[];
  due_in_days: number;
};

type MemberInfo = {
  id: string;
  name: string;
  skills: string[];
};

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  skills: string[] | null;
};

function removeDiacritics(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function negotiateTasksProgrammatically(
  message: string,
  currentTasks: TaskDraft[],
  members: MemberInfo[]
): { message: string; tasks: TaskDraft[] } {
  const lowercaseMsg = message.toLowerCase();
  const normMsg = removeDiacritics(lowercaseMsg);
  let text = "Tôi đã ghi nhận ý kiến của bạn và cập nhật danh sách task.";
  const updatedTasks = JSON.parse(JSON.stringify(currentTasks)) as TaskDraft[];

  // Case 1: Shift deadlines
  if (
    normMsg.includes("doi") ||
    normMsg.includes("deadline") ||
    normMsg.includes("tre") ||
    normMsg.includes("muon") ||
    normMsg.includes("som") ||
    normMsg.includes("tang") ||
    normMsg.includes("giam")
  ) {
    const dayMatch = lowercaseMsg.match(/(\d+)\s*ngày/);
    let daysToAdd = 2; // Default fallback
    if (dayMatch && dayMatch[1]) {
      daysToAdd = parseInt(dayMatch[1], 10);
    }

    if (normMsg.includes("som") || normMsg.includes("giam")) {
      daysToAdd = -Math.abs(daysToAdd);
    }

    updatedTasks.forEach((task) => {
      task.due_in_days = Math.max(1, task.due_in_days + daysToAdd);
    });

    if (daysToAdd > 0) {
      text = `Đã dời thời hạn của các task trễ thêm ${daysToAdd} ngày để hỗ trợ tiến độ dự án.`;
    } else {
      text = `Đã rút ngắn thời hạn của các task xuống ${Math.abs(daysToAdd)} ngày theo yêu cầu đẩy nhanh tiến độ.`;
    }
  }
  // Case 2: Reassign tasks
  else if (
    normMsg.includes("giao") ||
    normMsg.includes("chuyen") ||
    normMsg.includes("thay") ||
    normMsg.includes("phan")
  ) {
    const targetMember = members.find((m) => {
      const normName = removeDiacritics(m.name.toLowerCase());
      const parts = normName.split(" ");
      const firstName = parts[parts.length - 1];
      return (
        normMsg.includes(normName) ||
        (firstName && firstName.length > 2 && normMsg.includes(firstName))
      );
    });

    if (targetMember && updatedTasks.length > 0) {
      const taskToReassign =
        updatedTasks.find((t) => t.assignee_id !== targetMember.id) ||
        updatedTasks[0];
      const oldAssignee =
        members.find((m) => m.id === taskToReassign.assignee_id)?.name ||
        "thành viên cũ";
      taskToReassign.assignee_id = targetMember.id;
      taskToReassign.required_skills = Array.from(
        new Set([...taskToReassign.required_skills, ...targetMember.skills.slice(0, 1)]),
      );
      text = `Đã chuyển giao task "${taskToReassign.title}" từ ${oldAssignee} sang cho ${targetMember.name} và đồng bộ các kỹ năng cần thiết.`;
    } else {
      text = "Đã phân bổ lại nhân sự cho các công việc phù hợp để cân bằng khối lượng công việc.";
    }
  }
  // Case 3: Add new task
  else if (
    normMsg.includes("them") ||
    normMsg.includes("tao") ||
    normMsg.includes("bo sung")
  ) {
    let taskTitle = "Task bổ sung theo yêu cầu PM";
    const quoteMatch = message.match(/["'“«]([^"'”»]+)["'”»]/);
    if (quoteMatch && quoteMatch[1]) {
      taskTitle = quoteMatch[1];
    } else {
      const keywordIdx = Math.max(
        lowercaseMsg.indexOf("thêm task"),
        lowercaseMsg.indexOf("thêm việc"),
      );
      if (keywordIdx !== -1) {
        const textAfter = message.slice(keywordIdx + 9).trim();
        if (textAfter.length > 3) {
          taskTitle = textAfter;
        }
      }
    }

    const newFallbackTask: TaskDraft = {
      title: taskTitle,
      description: "Công việc được bổ sung trực tiếp thông qua phản hồi thương thảo của Project Manager.",
      priority: "medium",
      assignee_id: members[0]?.id || "pm",
      required_skills: ["General"],
      due_in_days: 5,
    };
    updatedTasks.push(newFallbackTask);
    text = `Đã bổ sung task mới "${taskTitle}" vào kế hoạch và gán tạm thời cho ${members[0]?.name || "PM"}.`;
  }

  return { message: text, tasks: updatedTasks };
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id: projectId } = await params;
    const access = await requireProjectAccess(projectId);

    if (access.role !== "pm") {
      return Response.json(
        { error: "Chỉ PM mới có quyền trao đổi với AI Planner." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as {
      recommendationId?: string;
      message?: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
      tasks?: TaskDraft[];
    };

    const userMessage = body.message?.trim();
    const currentTasks = body.tasks ?? [];
    const history = body.history ?? [];

    if (!userMessage) {
      return Response.json({ error: "Nội dung phản hồi không được để trống." }, { status: 400 });
    }

    // 1. Fetch project details and members
    const supabase = access.supabase;
    if (!supabase) {
      return Response.json(
        { error: "Không thể kết nối cơ sở dữ liệu." },
        { status: 503 },
      );
    }

    let members: MemberInfo[];
    let deadlineDays = 14;

    {
      const { data: projectRow } = await supabase
        .from("projects")
        .select("id,name,deadline_at")
        .eq("id", projectId)
        .maybeSingle();

      const { data: membershipRows } = await supabase
        .from("project_members")
        .select("user_id")
        .eq("project_id", projectId);

      const memberIds = (membershipRows ?? []).map((m) => m.user_id);
      const { data: userRows } = await supabase
        .from("users")
        .select("id,name,email,skills")
        .in("id", memberIds);

      members = ((userRows ?? []) as UserRow[]).map((user) => ({
        id: user.id,
        name: user.name || user.email?.split("@")[0] || user.id.slice(0, 8),
        skills: user.skills ?? [],
      }));

      if (projectRow?.deadline_at) {
        const diffTime =
          new Date(projectRow.deadline_at).getTime() - new Date().getTime();
        deadlineDays = Math.max(
          2,
          Math.ceil(diffTime / (1000 * 60 * 60 * 24)),
        );
      }
    }

    let resultMessage = "";
    let updatedTasks: TaskDraft[] = [];
    let processed = false;

    // 2. Call OpenAI if available
    if (process.env.OPENAI_API_KEY && projectId !== "demo") {
      try {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await client.chat.completions.create({
          model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content: [
                "Bạn là trợ lý Nexus AI, phụ trách hỗ trợ PM lập kế hoạch.",
                "Bạn đang thương lượng với PM về thời hạn và việc phân chia task.",
                "PM có thể yêu cầu dời deadline, đổi người gán việc, thêm/bớt task.",
                `Dự án phải hoàn thành trong tối đa ${deadlineDays} ngày kể từ hôm nay.`,
                "Hãy trả về phản hồi lịch sự bằng tiếng Việt giải thích những gì bạn đã làm, ĐỒNG THỜI cập nhật danh sách task trong schema trả về.",
                "Chỉ gán task cho assignee_id có trong danh sách thành viên được cung cấp.",
                "Hãy giữ nguyên các task khác không bị ảnh hưởng bởi yêu cầu của PM.",
              ].join("\n"),
            },
            ...history.slice(-8), // Send last 8 messages
            {
              role: "user",
              content: JSON.stringify({
                instruction: userMessage,
                current_tasks: currentTasks,
                members,
                deadline_days: deadlineDays,
              }),
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "nexus_planner_negotiate",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  message: { type: "string" },
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        priority: { type: "string", enum: ["low", "medium", "high"] },
                        assignee_id: { type: "string", enum: members.map((m) => m.id) },
                        required_skills: { type: "array", items: { type: "string" } },
                        due_in_days: { type: "integer", minimum: 1, maximum: deadlineDays },
                      },
                      required: [
                        "title",
                        "description",
                        "priority",
                        "assignee_id",
                        "required_skills",
                        "due_in_days",
                      ],
                    },
                  },
                },
                required: ["message", "tasks"],
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content) as { message: string; tasks: TaskDraft[] };
          resultMessage = parsed.message;
          updatedTasks = parsed.tasks;
          processed = true;
        }
      } catch (err) {
        console.error("OpenAI call in planner/chat failed, using mock fallback", err);
      }
    }

    // 3. Simulated fallback response
    if (!processed) {
      const fallbackResult = negotiateTasksProgrammatically(userMessage, currentTasks, members);
      resultMessage = fallbackResult.message;
      updatedTasks = fallbackResult.tasks;
    }

    // 4. Update the stored recommendation payload
    if (supabase && body.recommendationId) {
      await supabase
        .from("ai_recommendations")
        .update({
          payload: { tasks: updatedTasks, mode: processed ? "openai" : "mock", deadlineDays },
          created_at: new Date().toISOString(),
        })
        .eq("id", body.recommendationId);
    }

    return Response.json({
      message: resultMessage,
      tasks: updatedTasks,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Không thể đàm phán với AI." },
      { status: 500 },
    );
  }
}
