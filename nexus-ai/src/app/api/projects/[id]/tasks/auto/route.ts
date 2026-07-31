import { randomUUID } from "node:crypto";

import OpenAI from "openai";

import type {
  AutoTaskingUser,
  KanbanMember,
  KanbanTask,
} from "@/features/kanban-board/types";
import { ProjectAccessError, requireProjectAccess } from "@/features/workspace/access";
import type { TaskPriority } from "@/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type TaskDraft = {
  title: string;
  description: string;
  priority: TaskPriority;
  assignee_id: string;
  required_skills: string[];
  due_in_days: number;
};

type ModelResult = {
  tasks: TaskDraft[];
};

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  skills: string[] | null;
};

const priorities: TaskPriority[] = ["low", "medium", "high"];

function normalizeUsers(value: unknown): AutoTaskingUser[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const user = item as Record<string, unknown>;
      const id = typeof user.id === "string" ? user.id.trim() : "";
      const name = typeof user.name === "string" ? user.name.trim() : "";
      const skills = Array.isArray(user.skills)
        ? user.skills
            .filter((skill): skill is string => typeof skill === "string")
            .map((skill) => skill.trim())
            .filter(Boolean)
            .slice(0, 20)
        : [];
      return id && name ? { id, name, skills } : null;
    })
    .filter((user): user is AutoTaskingUser => Boolean(user))
    .slice(0, 30);
}

function createMockDrafts(users: AutoTaskingUser[], count: number): TaskDraft[] {
  const templates = [
    {
      title: "Phân tích yêu cầu và chốt phạm vi",
      description:
        "Đọc project brief, làm rõ đầu ra, dependency và tiêu chí hoàn thành.",
      priority: "high" as const,
      skills: ["Product Analysis", "Documentation"],
    },
    {
      title: "Thiết kế kiến trúc giải pháp",
      description:
        "Đề xuất component, data flow và API contract cho luồng nghiệp vụ chính.",
      priority: "high" as const,
      skills: ["System Design", "API"],
    },
    {
      title: "Xây dựng chức năng cốt lõi",
      description:
        "Implement happy path theo contract và kết nối với dữ liệu dự án.",
      priority: "high" as const,
      skills: ["Development", "Integration"],
    },
    {
      title: "Hoàn thiện giao diện và trạng thái UX",
      description:
        "Bổ sung responsive, loading, empty, error state và accessibility.",
      priority: "medium" as const,
      skills: ["UI/UX", "Frontend"],
    },
    {
      title: "Kiểm thử và xử lý edge case",
      description:
        "Kiểm thử contract, quyền truy cập, dữ liệu lỗi và hành vi người dùng.",
      priority: "medium" as const,
      skills: ["QA", "Testing"],
    },
    {
      title: "Tích hợp và chuẩn bị demo",
      description:
        "Tích hợp các module, chuẩn bị dữ liệu mẫu và rehearsal demo end-to-end.",
      priority: "medium" as const,
      skills: ["Integration", "Presentation"],
    },
    {
      title: "Viết tài liệu bàn giao",
      description:
        "Cập nhật setup, API contract, acceptance criteria và hướng dẫn vận hành.",
      priority: "low" as const,
      skills: ["Documentation"],
    },
    {
      title: "Đánh giá rủi ro và tối ưu",
      description:
        "Rà soát hiệu năng, bảo mật, chi phí AI và các điểm có thể gây lỗi demo.",
      priority: "low" as const,
      skills: ["Security", "Optimization"],
    },
    {
      title: "Theo dõi tiến độ và blocker",
      description:
        "Cập nhật trạng thái, tổng hợp blocker và đề xuất hành động tiếp theo.",
      priority: "medium" as const,
      skills: ["Workflow", "Communication"],
    },
    {
      title: "Nghiệm thu đầu ra",
      description:
        "Đối chiếu sản phẩm với acceptance criteria và chốt phiên bản bàn giao.",
      priority: "high" as const,
      skills: ["QA", "Product"],
    },
  ];

  return templates.slice(0, count).map((template, index) => {
    const assignee = users[index % users.length];
    return {
      title: template.title,
      description: template.description,
      priority: template.priority,
      assignee_id: assignee.id,
      required_skills: Array.from(
        new Set([...template.skills, ...assignee.skills.slice(0, 1)]),
      ).slice(0, 4),
      due_in_days: Math.min(14, index + 2),
    };
  });
}

function validateModelResult(
  value: unknown,
  users: AutoTaskingUser[],
  count: number,
): TaskDraft[] {
  const rawTasks =
    value && typeof value === "object" && Array.isArray((value as ModelResult).tasks)
      ? (value as ModelResult).tasks
      : [];
  const userIds = new Set(users.map((user) => user.id));

  const tasks = rawTasks.slice(0, count).map((task, index) => {
    const fallbackUser = users[index % users.length];
    const priority = priorities.includes(task.priority) ? task.priority : "medium";
    return {
      title: String(task.title || "").trim().slice(0, 160),
      description: String(task.description || "").trim().slice(0, 1200),
      priority,
      assignee_id: userIds.has(task.assignee_id)
        ? task.assignee_id
        : fallbackUser.id,
      required_skills: Array.isArray(task.required_skills)
        ? task.required_skills
            .filter((skill): skill is string => typeof skill === "string")
            .map((skill) => skill.trim())
            .filter(Boolean)
            .slice(0, 5)
        : [],
      due_in_days: Math.max(
        1,
        Math.min(30, Number.isFinite(task.due_in_days) ? task.due_in_days : index + 2),
      ),
    };
  });

  if (!tasks.length || tasks.some((task) => !task.title || !task.description)) {
    throw new Error("OpenAI trả về danh sách task không hợp lệ.");
  }

  return tasks;
}

async function generateDrafts(
  users: AutoTaskingUser[],
  documentSummary: string,
  count: number,
) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      tasks: createMockDrafts(users, count),
      mode: "mock" as const,
      warning:
        "OPENAI_API_KEY chưa được cấu hình; Nexus đã dùng mock generator và vẫn lưu task vào board.",
    };
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: [
            "Bạn là Nexus AI, chuyên gia Work Breakdown Structure.",
            "Hãy chia project thành các task độc lập, có đầu ra kiểm chứng được.",
            "Chỉ dùng assignee_id có trong danh sách thành viên.",
            "Gán người dựa trên skills và cân bằng workload.",
            "Task mới luôn bắt đầu ở trạng thái todo.",
            "Không tạo task mơ hồ như 'làm dự án' hoặc 'nghiên cứu thêm'.",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            instruction: `Tạo chính xác ${count} task và gán assignee_id phù hợp.`,
            document_summary: documentSummary,
            users,
          }),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "nexus_auto_tasks",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              tasks: {
                type: "array",
                minItems: count,
                maxItems: count,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    priority: {
                      type: "string",
                      enum: ["low", "medium", "high"],
                    },
                    assignee_id: {
                      type: "string",
                      enum: users.map((user) => user.id),
                    },
                    required_skills: {
                      type: "array",
                      items: { type: "string" },
                      maxItems: 5,
                    },
                    due_in_days: {
                      type: "integer",
                      minimum: 1,
                      maximum: 30,
                    },
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
    if (!content) throw new Error("OpenAI không trả về nội dung.");

    return {
      tasks: validateModelResult(JSON.parse(content), users, count),
      mode: "openai" as const,
      warning: undefined,
    };
  } catch (error) {
    console.error("[kanban] Auto-Tasking OpenAI failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return {
      tasks: createMockDrafts(users, count),
      mode: "mock" as const,
      warning:
        "OpenAI tạm thời không khả dụng; Nexus đã dùng mock generator để không gián đoạn demo.",
    };
  }
}
function dueDate(days: number) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + days);
  value.setUTCHours(16, 59, 0, 0);
  return value.toISOString();
}

function mapTask(
  row: {
    id: string;
    title: string;
    description: string | null;
    status: "todo" | "doing" | "done";
    priority: TaskPriority;
    assignee_id: string;
    required_skills: string[] | null;
    due_at: string | null;
    created_at: string;
    updated_at: string;
  },
  member: KanbanMember,
): KanbanTask {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assigneeId: row.assignee_id,
    assigneeName: member.name,
    assigneeAvatarUrl: member.avatarUrl,
    requiredSkills: row.required_skills ?? [],
    dueAt: row.due_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id: projectId } = await params;
    const body = (await request.json()) as {
      users?: unknown;
      documentSummary?: unknown;
      taskCount?: unknown;
    };
    const requestedUsers = normalizeUsers(body.users);
    const documentSummary =
      typeof body.documentSummary === "string"
        ? body.documentSummary.trim().slice(0, 12000)
        : "";
    const taskCount = Math.max(
      3,
      Math.min(10, Number.isFinite(Number(body.taskCount)) ? Number(body.taskCount) : 6),
    );

    if (documentSummary.length < 30) {
      return Response.json(
        { error: "Project brief cần tối thiểu 30 ký tự." },
        { status: 400 },
      );
    }
    if (!requestedUsers.length) {
      return Response.json(
        { error: "Cần ít nhất một thành viên để AI phân công." },
        { status: 400 },
      );
    }

    if (projectId === "demo") {
      const generated = await generateDrafts(
        requestedUsers,
        documentSummary,
        taskCount,
      );
      const now = new Date().toISOString();
      const memberById = new Map(
        requestedUsers.map((user) => [
          user.id,
          { ...user, avatarUrl: null } satisfies KanbanMember,
        ]),
      );
      const tasks = generated.tasks.map((draft) =>
        mapTask(
          {
            id: randomUUID(),
            title: draft.title,
            description: draft.description,
            status: "todo",
            priority: draft.priority,
            assignee_id: draft.assignee_id,
            required_skills: draft.required_skills,
            due_at: dueDate(draft.due_in_days),
            created_at: now,
            updated_at: now,
          },
          memberById.get(draft.assignee_id)!,
        ),
      );
      return Response.json({
        tasks,
        mode: generated.mode,
        warning: generated.warning,
        persisted: false,
      });
    }

    const access = await requireProjectAccess(projectId);
    if (access.role !== "pm") {
      return Response.json(
        { error: "Chỉ PM của project mới có thể chạy Auto-Tasking." },
        { status: 403 },
      );
    }

    const supabase = access.supabase;
    if (!supabase) {
      throw new Error("Không thể kết nối dữ liệu project.");
    }

    const { data: membershipRows, error: memberError } = await supabase
      .from("project_members")
      .select("user_id")
      .eq("project_id", projectId);
    if (memberError) throw new Error(memberError.message);

    const memberIds = (membershipRows ?? []).map((member) => member.user_id);
    const { data: userRows, error: userError } = await supabase
      .from("users")
      .select("id,name,email,avatar_url,skills")
      .in("id", memberIds);
    if (userError) throw new Error(userError.message);

    const members: KanbanMember[] = ((userRows ?? []) as UserRow[]).map((user) => ({
      id: user.id,
      name: user.name || user.email?.split("@")[0] || user.id.slice(0, 8),
      skills: user.skills ?? [],
      avatarUrl: user.avatar_url,
    }));
    if (!members.length) {
      return Response.json(
        { error: "Project chưa có thành viên để phân công." },
        { status: 400 },
      );
    }

    const generated = await generateDrafts(members, documentSummary, taskCount);
    const rows = generated.tasks.map((task) => ({
      project_id: projectId,
      title: task.title,
      description: task.description,
      status: "todo" as const,
      priority: task.priority,
      assignee_id: task.assignee_id,
      required_skills: task.required_skills,
      due_at: dueDate(task.due_in_days),
    }));
    const { data: inserted, error: insertError } = await supabase
      .from("tasks")
      .insert(rows)
      .select(
        "id,title,description,status,priority,assignee_id,required_skills,due_at,created_at,updated_at",
      );
    if (insertError) throw new Error(insertError.message);

    const memberById = new Map(members.map((member) => [member.id, member]));
    const tasks = (inserted ?? []).map((task) =>
      mapTask(task, memberById.get(task.assignee_id)!),
    );

    return Response.json({
      tasks,
      mode: generated.mode,
      warning: generated.warning,
      persisted: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể chạy Auto-Tasking.";
    const status = error instanceof ProjectAccessError ? error.status : 500;
    return Response.json({ error: message }, { status });
  }
}
