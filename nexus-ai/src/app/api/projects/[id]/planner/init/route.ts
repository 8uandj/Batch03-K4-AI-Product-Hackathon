import { randomUUID } from "node:crypto";
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

// Dynamic heuristic-based fallback draft generator
function generateDynamicFallbackTasks(
  projectName: string,
  projectDescription: string,
  members: MemberInfo[],
  deadlineDays: number,
): TaskDraft[] {
  const descLower = (projectDescription || "").toLowerCase();
  const nameLower = (projectName || "").toLowerCase();
  const context = descLower + " " + nameLower;

  const candidateTemplates = [
    {
      keywords: ["brief", "scope", "yêu cầu", "phạm vi", "kế hoạch", "analysis", "phân tích"],
      task: {
        title: "Phân tích yêu cầu và xác định phạm vi dự án",
        description: "Phân tích tài liệu project brief, làm rõ các tính năng cốt lõi, sơ đồ luồng dữ liệu và thống nhất các mốc bàn giao.",
        priority: "high" as const,
        skills: ["Product Analysis", "Documentation"],
      }
    },
    {
      keywords: ["backend", "db", "database", "api", "supabase", "server", "lưu trữ"],
      task: {
        title: "Thiết kế & Xây dựng Backend cùng API Endpoints",
        description: "Thiết lập cơ sở dữ liệu Supabase, lập trình các API endpoint xử lý logic nghiệp vụ và kết nối dữ liệu an toàn.",
        priority: "high" as const,
        skills: ["Development", "Supabase", "API"],
      }
    },
    {
      keywords: ["frontend", "ui", "ux", "giao diện", "react", "tailwind", "css"],
      task: {
        title: "Xây dựng giao diện Frontend & Tích hợp API",
        description: "Phát triển các màn hình responsive sử dụng React/Tailwind, đồng bộ dữ liệu từ API và tối ưu trạng thái loading/empty.",
        priority: "medium" as const,
        skills: ["UI/UX", "React", "Development"],
      }
    },
    {
      keywords: ["rag", "ai", "openai", "embeddings", "vector", "llm", "search", "tìm kiếm"],
      task: {
        title: "Tích hợp tính năng AI RAG & Tìm kiếm Vector",
        description: "Lập trình ingestion pipeline trích xuất văn bản, sinh embeddings qua OpenAI và thiết lập truy vấn ngữ nghĩa.",
        priority: "high" as const,
        skills: ["AI Integration", "OpenAI", "Supabase"],
      }
    },
    {
      keywords: ["test", "qa", "kiểm thử", "sửa lỗi", "bug", "lỗi"],
      task: {
        title: "Kiểm thử hệ thống & Khắc phục lỗi biên",
        description: "Thực hiện kiểm thử đầu cuối (End-to-End), rà soát bảo mật phân quyền và sửa các lỗi phát sinh trước khi bàn giao.",
        priority: "medium" as const,
        skills: ["QA", "Testing"],
      }
    },
    {
      keywords: ["document", "tài liệu", "hướng dẫn", "bàn giao", "slide", "guide"],
      task: {
        title: "Viết tài liệu bàn giao & Hướng dẫn vận hành",
        description: "Cập nhật tài liệu API, hướng dẫn chạy dự án local và chuẩn bị nội dung thuyết trình nghiệm thu dự án.",
        priority: "low" as const,
        skills: ["Documentation"],
      }
    }
  ];

  // Filter templates that match keywords in project context
  const selectedTemplates = candidateTemplates
    .filter(t => t.keywords.some(keyword => context.includes(keyword)))
    .map(t => t.task);

  // If no keywords matched, fallback to 4 standard pipeline tasks
  if (selectedTemplates.length === 0) {
    selectedTemplates.push(
      {
        title: "Khởi tạo dự án & Thống nhất yêu cầu",
        description: "Thiết lập cấu trúc dự án ban đầu, phân chia vai trò và xác định các tiêu chí hoàn thành công việc.",
        priority: "high" as const,
        skills: ["Product Analysis", "Documentation"],
      },
      {
        title: "Phát triển các API & Tính năng cốt lõi",
        description: "Viết các hàm xử lý logic nghiệp vụ và liên kết cơ sở dữ liệu backend vững chắc.",
        priority: "high" as const,
        skills: ["Development", "API"],
      },
      {
        title: "Lập trình Giao diện & Kết nối API",
        description: "Hoàn thiện thiết kế UI/UX trên frontend và kết nối đồng bộ dữ liệu từ backend.",
        priority: "medium" as const,
        skills: ["UI/UX", "React"],
      },
      {
        title: "Kiểm thử tổng thể & Đóng gói sản phẩm",
        description: "Kiểm tra toàn bộ luồng hoạt động, xử lý các trường hợp ngoại lệ và viết tài liệu bàn giao.",
        priority: "medium" as const,
        skills: ["Testing", "Documentation"],
      }
    );
  }

  // Map and distribute templates to members based on skill match
  return selectedTemplates.map((template, index) => {
    // Find member with the most matching skills, fallback to round-robin
    let assignedMember = members[index % members.length];
    let maxMatchCount = -1;

    for (const member of members) {
      const matchCount = member.skills.filter(s =>
        template.skills.some(ts => ts.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(ts.toLowerCase()))
      ).length;

      if (matchCount > maxMatchCount) {
        maxMatchCount = matchCount;
        assignedMember = member;
      }
    }

    const step = Math.max(1, Math.floor(deadlineDays / selectedTemplates.length));
    const due_in_days = Math.min(deadlineDays, Math.max(1, (index + 1) * step));

    return {
      title: template.title,
      description: template.description,
      priority: template.priority,
      assignee_id: assignedMember.id,
      required_skills: Array.from(new Set([...template.skills, ...assignedMember.skills.slice(0, 1)])),
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
      return Response.json(
        { error: "Không thể kết nối cơ sở dữ liệu." },
        { status: 503 },
      );
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
      tasks = generateDynamicFallbackTasks(projectRow.name, documentSummary, members, deadlineDays);
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
