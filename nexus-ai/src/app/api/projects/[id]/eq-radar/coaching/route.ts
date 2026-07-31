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

// Mock coaching tips database
const mockCoachingData: Record<string, { stressAnalysis: string; tips: string[]; actionPlan: string }> = {
  "pm-01": {
    stressAnalysis: "PM đang gánh vác vai trò điều phối lớn, stress level trung bình (45%). Có dấu hiệu quá lo lắng về thời hạn nhưng kỹ năng quản lý cảm xúc tốt.",
    tips: [
      "Tránh tự mình giải quyết mọi sự cố phát sinh; hãy tin tưởng và giao quyền nhiều hơn cho các lead kỹ thuật.",
      "Sử dụng các kênh thông báo tự động (như Slack/Discord webhook) thay vì liên tục thúc giục trong team chat.",
      "Dành ra 15 phút tĩnh tâm trước các cuộc họp Sprint review để giữ bình tĩnh."
    ],
    actionPlan: "Lập bảng phân quyền (RACI) rõ ràng cho team trong tuần này."
  },
  "dev-rag": {
    stressAnalysis: "Dev RAG đang có workload cao (72% load, 4 tasks). Bạn ấy có dấu hiệu căng thẳng (stress level 75%) do lo ngại về sự thay đổi database schema liên tục từ PM.",
    tips: [
      "Hãy làm rõ API contract và sơ đồ DB trước khi yêu cầu bạn ấy viết code ingestion.",
      "Đánh giá lại workload và dời bớt các task phụ sang Sprint sau hoặc san sẻ cho Dev UI.",
      "Khi trao đổi, hãy ghi nhận sự đóng góp kỹ thuật của bạn ấy trước khi đưa ra thay đổi yêu cầu."
    ],
    actionPlan: "PM gặp riêng 5 phút để chốt cứng DB Schema và đóng băng cập nhật DB trong 3 ngày tới."
  },
  "dev-ui": {
    stressAnalysis: "Dev UI có stress level thấp (35%) nhưng dễ bị block (workload 58%). Tính cách cẩn thận, chi tiết nhưng ngại hỏi khi gặp blocker kỹ thuật.",
    tips: [
      "Chủ động hỏi thăm blocker của bạn ấy mỗi ngày thay vì chờ đợi bạn ấy báo cáo.",
      "Đảm bảo các file Figma hoặc tài liệu mô tả UX/UI được PM chốt sớm và không thay đổi muộn.",
      "Khuyến khích bạn ấy thảo luận nhiều hơn với Dev RAG về cách tích hợp API."
    ],
    actionPlan: "Tổ chức buổi pair-programming ngắn giữa Dev RAG và Dev UI để tháo gỡ điểm nghẽn tích hợp frontend."
  }
};

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

    // 1. Handle mock mode
    if (projectId === "demo" || memberId.startsWith("pm-") || memberId === "dev-rag" || memberId === "dev-ui") {
      const mockResult = mockCoachingData[memberId] || {
        stressAnalysis: "Thành viên có mức stress ổn định. Workload ở ngưỡng an toàn.",
        tips: [
          "Duy trì họp 1-1 hàng tuần để lắng nghe phản hồi.",
          "Tạo không gian để thành viên tự đề xuất giải pháp kỹ thuật."
        ],
        actionPlan: "Tiếp tục theo dõi hiệu suất và phản hồi trong cuộc họp tiếp theo."
      };
      return Response.json({ ...mockResult, mode: "mock" });
    }

    const supabase = access.supabase;
    if (!supabase) {
      throw new Error("Không thể kết nối dữ liệu project.");
    }

    // 2. Fetch live database data
    // Fetch member details
    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("id,name,email,skills,eq_answers,eq_summary")
      .eq("id", memberId)
      .maybeSingle();

    if (userError || !userRow) {
      return Response.json({ error: "Không tìm thấy thông tin thành viên." }, { status: 404 });
    }

    const user = userRow as UserRow;
    const name = user.name || user.email?.split("@")[0] || user.id.slice(0, 8);

    // Fetch active tasks for this member
    const { data: taskRows } = await supabase
      .from("tasks")
      .select("title,status,priority")
      .eq("project_id", projectId)
      .eq("assignee_id", memberId)
      .neq("status", "done");

    const activeTasks = (taskRows ?? []).map((t) => `- [${t.priority}] ${t.title} (${t.status})`).join("\n");
    const workloadPercentage = Math.min(100, (taskRows ?? []).length * 20);

    let stressAnalysis = `Thành viên ${name} đang chịu tải ${workloadPercentage}% với ${(taskRows ?? []).length} task đang mở.`;
    let tips = [
      "Họp ngắn để tháo gỡ khó khăn về mặt kỹ thuật.",
      "Động viên và hỏi thăm sức khỏe định kỳ."
    ];
    let actionPlan = "Họp 1-1 tháo gỡ blocker.";
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
                active_tasks: activeTasks || "Không có task chưa xong",
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
