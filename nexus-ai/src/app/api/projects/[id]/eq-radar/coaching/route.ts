import OpenAI from "openai";
import { requireProjectAccess } from "@/features/workspace/access";

type RouteContext = { params: Promise<{ id: string }> };
type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  skills: string[] | null;
  eq_answers: unknown;
  eq_summary: unknown;
};

type CoachingReport = {
  stressAnalysis: string;
  tips: string[];
  actionPlan: string;
};

// Dynamic rule-based expert coaching suggestion generator
function generateDynamicCoaching(
  name: string,
  skills: string[],
  activeTasksCount: number,
  workloadPercentage: number,
  eqAnswers: Record<string, string> = {}
): CoachingReport {
  const stressLevel = Math.min(100, Math.max(10, workloadPercentage + activeTasksCount * 10));

  let stressAnalysis = "";
  if (workloadPercentage > 70) {
    stressAnalysis = `Thành viên ${name} đang có dấu hiệu quá tải công việc (tải việc ${workloadPercentage}%). Mức độ stress rất cao (${stressLevel}%) do phải gánh ${activeTasksCount} task chưa hoàn thành cùng lúc. Cần PM sớm san sẻ tải việc để tránh burnout.`;
  } else if (workloadPercentage > 40) {
    stressAnalysis = `Thành viên ${name} đang ở mức chịu tải trung bình (tải việc ${workloadPercentage}%). Mức độ stress ở ngưỡng kiểm soát được (${stressLevel}%), tuy nhiên cần PM định kỳ thăm hỏi các blocker phát sinh để tránh dồn ứ công việc.`;
  } else {
    stressAnalysis = `Thành viên ${name} có mức tải việc an toàn (${workloadPercentage}%). Trạng thái tinh thần thoải mái, stress level thấp (${stressLevel}%), tinh thần năng nổ và sẵn sàng tiếp nhận thêm công việc hoặc hỗ trợ đồng đội.`;
  }

  const tips: string[] = [];

  // Tip 1: Skill based communication suggestion
  const skillsLower = (skills || []).map((s) => s.toLowerCase());
  if (
    skillsLower.some(
      (s) =>
        s.includes("react") ||
        s.includes("next") ||
        s.includes("ui") ||
        s.includes("frontend"),
    )
  ) {
    tips.push(
      "Thống nhất chi tiết file Figma, layout và các tiêu chí phản hồi người dùng trước khi bạn ấy bắt tay code frontend.",
    );
  } else if (
    skillsLower.some(
      (s) =>
        s.includes("supabase") ||
        s.includes("sql") ||
        s.includes("python") ||
        s.includes("backend") ||
        s.includes("api"),
    )
  ) {
    tips.push(
      "Làm rõ API contract, kiểu dữ liệu trả về và cấu trúc database trước khi yêu cầu bạn ấy viết logic nghiệp vụ.",
    );
  } else {
    tips.push(
      "Làm rõ mục tiêu cốt lõi và các tiêu chí hoàn thành (Acceptance Criteria) cho công việc được giao.",
    );
  }

  // Tip 2: Workload based suggestion
  if (workloadPercentage > 70) {
    tips.push(
      "Chủ động rà soát lại các task phụ của bạn ấy và đề xuất dời bớt thời hạn sang Sprint tiếp theo.",
    );
  } else if (workloadPercentage < 45) {
    tips.push(
      "Khuyến khích bạn ấy tham gia hỗ trợ các task tích hợp hoặc hướng dẫn (pair-programming) cho thành viên khác đang quá tải.",
    );
  } else {
    tips.push(
      "Hỏi thăm tình trạng các blocker và khuyến khích cập nhật tiến độ đều đặn trên bảng Kanban của nhóm.",
    );
  }

  // Tip 3: EQ style suggestion
  const q1 = eqAnswers?.q1_bugHandling || "";
  const q2 = eqAnswers?.q2_taskPreference || "";
  if (q1.includes("A") || q1.toLowerCase().includes("tự tìm cách")) {
    tips.push(
      "Khuyên bạn ấy chủ động ping hỏi nhóm sau 30 phút tự gỡ lỗi không thành công để tránh bị bottleneck tiến độ.",
    );
  } else if (q2.includes("A") || q2.toLowerCase().includes("chẻ nhỏ")) {
    tips.push(
      "Chia nhỏ công việc thành checklist cụ thể từng ngày thay vì giao mục tiêu lớn làm bạn ấy bối rối.",
    );
  } else {
    tips.push(
      "Tạo không gian giao tiếp cởi mở để thành viên tự đề xuất giải pháp kỹ thuật thay vì PM chỉ định áp đặt.",
    );
  }

  // Action plan
  let actionPlan = "";
  if (workloadPercentage > 70) {
    actionPlan =
      "PM hẹn gặp riêng 5 phút để rà soát danh sách task đang gánh và bàn giao bớt 1 task phụ cho người khác.";
  } else if (
    skillsLower.some((s) => s.includes("development") || s.includes("supabase"))
  ) {
    actionPlan =
      "PM tổ chức một buổi review code ngắn và chốt cứng sơ đồ dữ liệu để thành viên yên tâm làm việc.";
  } else {
    actionPlan =
      "PM thăm hỏi nhanh tình hình công việc của bạn ấy trong buổi họp daily tiếp theo.";
  }

  return { stressAnalysis, tips, actionPlan };
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id: projectId } = await params;
    const body = (await request.json()) as { memberId: string };
    const memberId = body.memberId;

    if (!memberId) {
      return Response.json({ error: "Thiếu member ID." }, { status: 400 });
    }

    const access = await requireProjectAccess(projectId);
    if (access.role !== "pm") {
      return Response.json(
        { error: "Chỉ PM của project mới được xem gợi ý coaching." },
        { status: 403 },
      );
    }

    // 1. Fetch live database data
    let user: UserRow | null = null;
    let name = "Thành viên";
    let activeTasksCount = 0;
    let workloadPercentage = 0;
    let activeTasksStr = "";

    const { supabase } = access;
    if (supabase) {
      const { data: userRow } = await supabase
        .from("users")
        .select("id,name,email,skills,eq_answers,eq_summary")
        .eq("id", memberId)
        .maybeSingle();

      if (userRow) {
        user = userRow as UserRow;
        name = user.name || user.email?.split("@")[0] || user.id.slice(0, 8);

        const { data: taskRows } = await supabase
          .from("tasks")
          .select("title,status,priority")
          .eq("project_id", projectId)
          .eq("assignee_id", memberId)
          .neq("status", "done");

        activeTasksCount = (taskRows ?? []).length;
        workloadPercentage = Math.min(100, activeTasksCount * 20);
        activeTasksStr = (taskRows ?? [])
          .map((t) => `- [${t.priority}] ${t.title} (${t.status})`)
          .join("\n");
      }
    }

    if (!user) {
      return Response.json({ error: "Không tìm thấy thông tin thành viên." }, { status: 404 });
    }

    let stressAnalysis = "";
    let tips: string[] = [];
    let actionPlan = "";

    let processed = false;

    // 3. Call OpenAI for live coaching tips if key is present
    if (process.env.OPENAI_API_KEY) {
      try {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await client.chat.completions.create({
          model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content: [
                "Bạn là trợ lý Nexus EQ Coaching, chuyên gia tâm lý học hành vi và quản trị nhân sự trong dự án agile.",
                "Nhiệm vụ của bạn là đọc thông tin về một thành viên dự án và đưa ra lời khuyên thiết thực giúp PM coaching và giao tiếp với bạn ấy tốt hơn.",
                "Hãy phân tích mức độ stress/áp lực dựa trên kỹ năng, workload (danh sách task chưa xong) và tín hiệu EQ sẵn có.",
                "Hãy đưa ra 3 lời khuyên giao tiếp thực tế và 1 hành động cụ thể cho PM.",
                "Trả về kết quả bằng tiếng Việt dưới định dạng JSON với schema được cung cấp.",
              ].join("\n"),
            },
            {
              role: "user",
              content: JSON.stringify({
                member_name: name,
                skills: user.skills || [],
                eq_answers: user.eq_answers || {},
                eq_summary: user.eq_summary || {},
                workload_load: `${workloadPercentage}%`,
                active_tasks: activeTasksStr || "Không có task chưa xong",
              }),
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "nexus_coaching_suggestion",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  stressAnalysis: { type: "string" },
                  tips: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 3,
                    maxItems: 3
                  },
                  actionPlan: { type: "string" }
                },
                required: ["stressAnalysis", "tips", "actionPlan"]
              }
            }
          }
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content) as { stressAnalysis: string; tips: string[]; actionPlan: string };
          stressAnalysis = parsed.stressAnalysis;
          tips = parsed.tips;
          actionPlan = parsed.actionPlan;
          processed = true;
        }
      } catch (err) {
        console.error("OpenAI call in eq-radar/coaching failed", err);
      }
    }

    // 3. Fallback response generated programmatically
    if (!processed) {
      const fallbackReport = generateDynamicCoaching(
        name,
        user.skills || [],
        activeTasksCount,
        workloadPercentage,
        (user.eq_answers as Record<string, string>) || {},
      );
      stressAnalysis = fallbackReport.stressAnalysis;
      tips = fallbackReport.tips;
      actionPlan = fallbackReport.actionPlan;
    }

    return Response.json({
      stressAnalysis,
      tips,
      actionPlan,
      mode: processed ? "openai" : "fallback"
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Không thể sinh lời khuyên coaching." },
      { status: 500 },
    );
  }
}
