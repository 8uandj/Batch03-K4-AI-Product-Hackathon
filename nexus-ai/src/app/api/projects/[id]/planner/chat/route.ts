import OpenAI from "openai";
import { createMockKanbanData } from "@/features/kanban-board/mock-data";
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

// Mock response for chat negotiation
function buildMockChatResponse(message: string, currentTasks: TaskDraft[], members: MemberInfo[]): { message: string; tasks: TaskDraft[] } {
  const lowercaseMsg = message.toLowerCase();
  let text = "Tôi đã ghi nhận ý kiến của bạn và cập nhật kế hoạch.";
  const updatedTasks = JSON.parse(JSON.stringify(currentTasks)) as TaskDraft[];

  if (lowercaseMsg.includes("dời") || lowercaseMsg.includes("deadline") || lowercaseMsg.includes("muộn") || lowercaseMsg.includes("sớm")) {
    // Simulate shifting deadlines
    updatedTasks.forEach((task) => {
      if (task.priority === "high") {
        task.due_in_days = Math.max(1, task.due_in_days + 1);
      } else {
        task.due_in_days = Math.max(1, task.due_in_days + 2);
      }
    });
    text = "Đã dời thời hạn (deadline) của các task sang muộn hơn từ 1-2 ngày theo ý bạn để giảm tải áp lực ban đầu.";
  } else if (lowercaseMsg.includes("giao") || lowercaseMsg.includes("chuyển") || lowercaseMsg.includes("thay")) {
    // Find member to reassign
    const targetMember = members.find(m => lowercaseMsg.includes(m.name.toLowerCase()));
    if (targetMember && updatedTasks.length > 0) {
      // Reassign first medium/low priority task to targetMember
      const taskToReassign = updatedTasks.find(t => t.priority !== "high") || updatedTasks[0];
      const oldAssignee = members.find(m => m.id === taskToReassign.assignee_id)?.name || "thành viên cũ";
      taskToReassign.assignee_id = targetMember.id;
      text = `Đã chuyển giao task "${taskToReassign.title}" từ ${oldAssignee} sang cho ${targetMember.name} phụ trách.`;
    } else {
      text = "Đã phân bổ lại công việc của một số task phụ để tối ưu hóa nhân sự theo yêu cầu của bạn.";
    }
  } else if (lowercaseMsg.includes("thêm") || lowercaseMsg.includes("tạo")) {
    const newMockTask: TaskDraft = {
      title: "Task bổ sung theo yêu cầu PM",
      description: "Nội dung cần thực hiện theo phản hồi trực tiếp của PM.",
      priority: "medium",
      assignee_id: members[0].id,
      required_skills: ["General"],
      due_in_days: 7
    };
    updatedTasks.push(newMockTask);
    text = "Đã thêm một task bổ sung vào danh sách và gán tạm thời cho bạn (PM) quản lý.";
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

    // 1. Fetch project details and members, or use the shared demo dataset.
    const supabase = access.supabase;
    let members: MemberInfo[];
    let deadlineDays = 14;

    if (!supabase) {
      members = createMockKanbanData().members;
    } else {
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
      const mockResult = buildMockChatResponse(userMessage, currentTasks, members);
      resultMessage = mockResult.message;
      updatedTasks = mockResult.tasks;
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
