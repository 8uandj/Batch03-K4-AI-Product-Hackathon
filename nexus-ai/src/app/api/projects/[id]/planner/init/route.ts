import { randomUUID } from "node:crypto";
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

// Mock draft generator
function createMockDrafts(members: MemberInfo[], deadlineDays: number): TaskDraft[] {
  const templates = [
    {
      title: "Phân tích yêu cầu và chốt phạm vi",
      description: "Đọc project brief, làm rõ các đầu ra, dependency và tiêu chí hoàn thành.",
      priority: "high" as const,
      skills: ["Product Analysis", "Documentation"],
    },
    {
      title: "Thiết kế kiến trúc giải pháp & Database contract",
      description: "Đề xuất các component chính, luồng dữ liệu và API contract giữa Frontend - Backend.",
      priority: "high" as const,
      skills: ["System Design", "API"],
    },
    {
      title: "Xây dựng backend cốt lõi & API endpoint",
      description: "Implement luồng happy path lưu dữ liệu và kết nối cơ sở dữ liệu Supabase.",
      priority: "high" as const,
      skills: ["Development", "Supabase"],
    },
    {
      title: "Hoàn thiện giao diện UI & Kết nối dữ liệu",
      description: "Xây dựng các responsive component bằng React/Tailwind, xử lý loading/empty state.",
      priority: "medium" as const,
      skills: ["UI/UX", "React"],
    },
    {
      title: "Kiểm thử đầu cuối & Xử lý lỗi",
      description: "Kiểm tra phân quyền, dữ liệu lỗi và các trường hợp biên của hệ thống.",
      priority: "medium" as const,
      skills: ["QA", "Testing"],
    },
    {
      title: "Viết tài liệu bàn giao & Hướng dẫn vận hành",
      description: "Cập nhật tài liệu kỹ thuật, cách chạy local và chuẩn bị slide giới thiệu.",
      priority: "low" as const,
      skills: ["Documentation"],
    },
  ];

  return templates.map((template, index) => {
    const assignee = members[index % members.length];
    // Spread tasks within the project deadline days
    const step = Math.max(1, Math.floor(deadlineDays / templates.length));
    const due_in_days = Math.min(deadlineDays, Math.max(1, (index + 1) * step));

    return {
      title: template.title,
      description: template.description,
      priority: template.priority,
      assignee_id: assignee.id,
      required_skills: Array.from(new Set([...template.skills, ...assignee.skills.slice(0, 1)])),
      due_in_days,
    };
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id: projectId } = await params;
    const access = await requireProjectAccess(projectId);

    if (access.role !== "pm") {
      return Response.json(
        { error: "Chỉ PM mới có quyền khởi chạy AI Planner." },
        { status: 403 },
      );
    }

    const supabase = access.supabase;
    if (!supabase) {
      const mockData = createMockKanbanData();
      const deadlineDays = 14;
      const tasks = createMockDrafts(mockData.members, deadlineDays);

      return Response.json({
        recommendationId: randomUUID(),
        tasks,
        mode: "mock",
        deadlineDays,
      });
    }

    // 1. Fetch project details and members
    const { data: projectRow, error: projectError } = await supabase
      .from("projects")
      .select("id,name,description,deadline_at")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError || !projectRow) {
      return Response.json({ error: "Không tìm thấy dự án." }, { status: 404 });
    }

    const { data: membershipRows, error: memberError } = await supabase
      .from("project_members")
      .select("user_id")
      .eq("project_id", projectId);
    if (memberError) throw new Error(memberError.message);

    const memberIds = (membershipRows ?? []).map((m) => m.user_id);
    const { data: userRows, error: userError } = await supabase
      .from("users")
      .select("id,name,email,skills")
      .in("id", memberIds);
    if (userError) throw new Error(userError.message);

    const members = ((userRows ?? []) as UserRow[]).map((user) => ({
      id: user.id,
      name: user.name || user.email?.split("@")[0] || user.id.slice(0, 8),
      skills: user.skills ?? [],
    }));

    if (!members.length) {
      return Response.json(
        { error: "Project chưa có thành viên để phân công." },
        { status: 400 },
      );
    }

    // 2. Fetch document summary context
    const { data: summaryRow } = await supabase
      .from("ai_summaries")
      .select("content")
      .eq("project_id", projectId)
      .eq("type", "project_brief")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const documentSummary = summaryRow?.content || projectRow.description || "Dự án Nexus AI";

    // Calculate deadline days
    const deadlineAt = projectRow.deadline_at;
    let deadlineDays = 14; // Default to 2 weeks
    if (deadlineAt) {
      const diffTime = new Date(deadlineAt).getTime() - new Date().getTime();
      deadlineDays = Math.max(2, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    let tasks: TaskDraft[] = [];
    let mode: "openai" | "mock" = "mock";

    // 3. Call OpenAI if API key exists, otherwise fall back to mock
    if (process.env.OPENAI_API_KEY && projectId !== "demo") {
      try {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await client.chat.completions.create({
          model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: [
                "Bạn là Nexus AI, chuyên gia lập kế hoạch dự án và phân chia công việc.",
                "Nhiệm vụ của bạn là đọc thông tin dự án, danh sách thành viên và thời hạn để phân rã dự án thành các task cụ thể.",
                `Dự án phải hoàn thành trong vòng tối đa ${deadlineDays} ngày kể từ hôm nay.`,
                "Hãy gán công việc dựa trên năng lực (skills) của từng thành viên và phân bổ khối lượng hợp lý.",
                "Chỉ gán task cho assignee_id có trong danh sách thành viên được cung cấp.",
                "Không tạo các task chung chung. Task phải mô tả rõ ràng đầu ra.",
              ].join("\n"),
            },
            {
              role: "user",
              content: JSON.stringify({
                project_name: projectRow.name,
                project_description: documentSummary,
                members,
                deadline_days: deadlineDays,
              }),
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "nexus_planner_tasks",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
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
                required: ["tasks"],
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content) as { tasks: TaskDraft[] };
          tasks = parsed.tasks;
          mode = "openai";
        }
      } catch (err) {
        console.error("OpenAI call in planner/init failed, using mock", err);
      }
    }

    if (!tasks.length) {
      tasks = createMockDrafts(members, deadlineDays);
      mode = "mock";
    }

    // 4. Save recommendation as suggested draft (only in database mode)
    let recommendationId = randomUUID();
    if (projectId !== "demo") {
      // Clear any existing active planners
      await supabase
        .from("ai_recommendations")
        .delete()
        .eq("project_id", projectId)
        .eq("type", "task_assignment")
        .eq("status", "suggested");

      const { data: recData, error: recError } = await supabase
        .from("ai_recommendations")
        .insert({
          project_id: projectId,
          type: "task_assignment",
          title: "Dự thảo phân chia công việc",
          rationale: "Khởi tạo từ tài liệu dự án và thông tin kỹ năng thành viên.",
          payload: { tasks, mode, deadlineDays },
          status: "suggested",
        })
        .select("id")
        .single();

      if (recError) throw new Error(recError.message);
      recommendationId = recData.id;
    }

    return Response.json({
      recommendationId,
      tasks,
      mode,
      deadlineDays,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Không thể khởi tạo AI Planner." },
      { status: 500 },
    );
  }
}
