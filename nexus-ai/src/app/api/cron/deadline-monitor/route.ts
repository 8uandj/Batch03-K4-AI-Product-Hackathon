import { scanDeadlineTasks } from "@/features/deadline-monitor/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json(
      { error: "Thiếu CRON_SECRET trên môi trường deploy." },
      { status: 503 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await scanDeadlineTasks();
    return Response.json({ success: true, ...result });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể chạy Deadline Monitor.",
      },
      { status: 500 },
    );
  }
}
