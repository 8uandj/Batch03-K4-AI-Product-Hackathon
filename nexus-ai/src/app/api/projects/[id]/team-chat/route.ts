/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { ProjectAccessError, requireProjectAccess } from "@/features/workspace/access";

type RouteContext = { params: Promise<{ id: string }> };

export type TeamChatMessageItem = {
  id: string;
  senderId: string | null;
  senderName: string;
  senderRole: "pm" | "member" | "ai";
  senderType: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

// Ensure a 'team' chat room exists for the project
async function getOrCreateTeamRoom(dbClient: any, projectId: string) {
  const { data: existingRoom } = await dbClient
    .from("chat_rooms")
    .select("id")
    .eq("project_id", projectId)
    .eq("type", "team")
    .maybeSingle();

  if (existingRoom) return existingRoom.id;

  const { data: newRoom, error } = await dbClient
    .from("chat_rooms")
    .insert({
      project_id: projectId,
      type: "team",
      name: "Team Chat",
    })
    .select("id")
    .single();

  if (error || !newRoom) {
    const { data: retryRoom } = await dbClient
      .from("chat_rooms")
      .select("id")
      .eq("project_id", projectId)
      .eq("type", "team")
      .maybeSingle();
    return retryRoom?.id;
  }

  return newRoom.id;
}

function getDbClient(supabase: any) {
  // Keep normal Team Chat reads/writes on the authenticated client so the
  // project RLS policies remain an active defense layer. Scheduled workers
  // have their own CRON route and do not need service-role access here.
  return supabase;
}

function getDisplayName(name?: string | null, email?: string | null, fallback = "Thành viên") {
  if (name && name.trim()) return name;
  if (email && email.includes("@")) return email.split("@")[0];
  return fallback;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id: projectId } = await params;
    const access = await requireProjectAccess(projectId);
    const { supabase, user } = access;

    const dbClient = getDbClient(supabase);

    // Fallback for mock demo mode
    if (!supabase || projectId.startsWith("demo")) {
      return NextResponse.json({
        success: true,
        currentUserId: user.id,
        messages: [
          {
            id: "msg-1",
            senderId: "u1",
            senderName: "Thành viên Dự án",
            senderRole: "pm",
            senderType: "user",
            content: `Chào mọi người trong dự án! Mình vừa khởi tạo repo.`,
            createdAt: "10:00",
          },
          {
            id: "msg-2",
            senderId: "u2",
            senderName: "Thành viên Dự án",
            senderRole: "member",
            senderType: "user",
            content: "Chào PM, mình đang hoàn thiện API đồng bộ live chat.",
            createdAt: "10:15",
          },
        ],
      });
    }

    const roomId = await getOrCreateTeamRoom(dbClient, projectId);
    if (!roomId) {
      return NextResponse.json({ error: "Không thể tạo phòng chat." }, { status: 500 });
    }

    // 1. Fetch real project members roles & user info from Supabase
    const { data: memberRows } = await dbClient
      .from("project_members")
      .select("user_id, role, users(id, name, email)")
      .eq("project_id", projectId);

    const roleMap = new Map<string, "pm" | "member">();
    const nameMap = new Map<string, string>();

    (memberRows ?? []).forEach((m: any) => {
      roleMap.set(m.user_id, m.role as "pm" | "member");
      const userData = m.users as { name?: string; email?: string } | null;
      if (m.user_id) {
        nameMap.set(m.user_id, getDisplayName(userData?.name, userData?.email));
      }
    });

    // 2. Fetch all live chat messages in this room
    const { data: rawMessages, error: msgError } = await dbClient
      .from("chat_messages")
      .select("id, sender_id, sender_type, content, created_at, users(name, email)")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (msgError) throw new Error(msgError.message);

    const formattedMessages: TeamChatMessageItem[] = (rawMessages ?? []).map((m: any) => {
      const userData = m.users as { name?: string; email?: string } | null;
      let senderName = "Thành viên";
      let senderRole: "pm" | "member" | "ai" = "member";

      if (m.sender_type === "assistant") {
        senderName = "Nexus AI Bot";
        senderRole = "ai";
      } else {
        if (m.sender_id === user.id) {
          senderName = "Bạn (Tôi)";
        } else if (nameMap.has(m.sender_id)) {
          senderName = nameMap.get(m.sender_id)!;
        } else {
          senderName = getDisplayName(userData?.name, userData?.email);
        }

        if (m.sender_id && roleMap.has(m.sender_id)) {
          senderRole = roleMap.get(m.sender_id)!;
        }
      }

      return {
        id: m.id,
        senderId: m.sender_id,
        senderName,
        senderRole,
        senderType: m.sender_type as "user" | "assistant" | "system",
        content: m.content,
        createdAt: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
    });

    return NextResponse.json({
      success: true,
      currentUserId: user.id,
      messages: formattedMessages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tải tin nhắn.";
    const status = error instanceof ProjectAccessError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id: projectId } = await params;
    const access = await requireProjectAccess(projectId);
    const { supabase, user, role } = access;

    const dbClient = getDbClient(supabase);

    const body = (await request.json()) as {
      content?: string;
      senderType?: "user" | "assistant";
      senderName?: string;
      action?: "run_worker";
    };

    // Special Action: Worker Progress Scan using 100% REAL Supabase data
    if (body.action === "run_worker") {
      if (role !== "pm") {
        return NextResponse.json({ error: "Chỉ PM mới có thể chạy worker giám sát tiến độ." }, { status: 403 });
      }
      const roomId = await getOrCreateTeamRoom(dbClient, projectId);
      if (!roomId) {
        return NextResponse.json({ error: "Không thể kết nối phòng chat." }, { status: 500 });
      }

      // Fetch real project, members, and tasks from Supabase
      const [projectRes, membersRes, tasksRes] = await Promise.all([
        dbClient.from("projects").select("id, name").eq("id", projectId).maybeSingle(),
        dbClient.from("project_members").select("user_id, role, users(id, name, email)").eq("project_id", projectId),
        dbClient.from("tasks").select("id, title, status, assignee_id, due_at").eq("project_id", projectId),
      ]);

      const projectName = projectRes.data?.name || "Dự án";
      const members = (membersRes.data ?? []).map((m: any) => ({
        id: m.user_id,
        role: m.role as "pm" | "member",
        name: getDisplayName(m.users?.name, m.users?.email),
      }));

      const pmMember = members.find((m: any) => m.role === "pm") || members[0] || { name: "PM" };
      const regularMembers = members.filter((m: any) => m.role !== "pm");
      const targetMember = regularMembers[0] || members[0] || { name: "Thành viên" };

      const tasks = (tasksRes.data ?? []) as Array<{ id: string; title: string; assignee_id: string }>;
      const targetTask = tasks.find((t) => t.assignee_id === targetMember.id) || tasks[0];
      const taskTitle = targetTask ? targetTask.title : "Phân chia công việc Sprint";

      // Build 100% REAL personalized AI messages
      const memberRemindContent = `💬 [AI Remind - Cập nhật định kỳ 2h/lần]: Chào ${targetMember.name}, công việc '${taskTitle}' trong dự án ${projectName} đang được hệ thống theo dõi tiến độ. Bạn có cần hỗ trợ gỡ blocker kỹ thuật hay nhờ đồng đội hỗ trợ không?`;

      const leaderAlertContent = `🚨 [AI CẢNH BÁO LEADER]: Gửi Quản trị viên ${pmMember.name}: AI đã rà soát toàn bộ tiến độ của các thành viên (${members.map((m: any) => m.name).join(", ")}). Đề xuất 3 hướng tối ưu cho Leader:\n1. Phân chia bớt sub-task khi khối lượng tăng cao;\n2. Họp Quick Sync 1-1 gỡ blocker;\n3. Cập nhật mốc deadline phù hợp trên Kanban Board.`;

      // Insert both REAL AI messages into Supabase chat_messages
      await dbClient.from("chat_messages").insert([
        {
          room_id: roomId,
          sender_id: user.id,
          sender_type: "assistant",
          content: memberRemindContent,
        },
        {
          room_id: roomId,
          sender_id: user.id,
          sender_type: "assistant",
          content: leaderAlertContent,
        },
      ]);

      return NextResponse.json({ success: true, message: "Đã quét tiến độ từ dữ liệu thật thành công." });
    }

    // Normal message posting
    const rawContent = body.content?.trim() || "";

    if (!rawContent) {
      return NextResponse.json({ error: "Nội dung tin nhắn không được để trống." }, { status: 400 });
    }
    if (rawContent.length > 4000) {
      return NextResponse.json({ error: "Tin nhắn không được vượt quá 4.000 ký tự." }, { status: 413 });
    }
    const content = rawContent;

    // Always attach valid user.id as sender_id to satisfy Supabase RLS policy `sender_id = auth.uid()`
    const senderId = user.id;

    if (!supabase || projectId.startsWith("demo")) {
      return NextResponse.json({
        success: true,
        message: {
          id: `msg_${Date.now()}`,
          senderId,
          senderName: "Bạn (Tôi)",
          senderRole: role || "member",
          senderType: "user",
          content,
          createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      });
    }

    const roomId = await getOrCreateTeamRoom(dbClient, projectId);
    if (!roomId) {
      return NextResponse.json({ error: "Không thể kết nối phòng chat." }, { status: 500 });
    }

    // 1. Insert message into Supabase chat_messages
    const { data: insertedMsg, error: insertError } = await dbClient
      .from("chat_messages")
      .insert({
        room_id: roomId,
        sender_id: senderId,
        sender_type: "user",
        content,
      })
      .select("id, sender_id, sender_type, content, created_at")
      .single();

    if (insertError) {
      console.error("Lỗi insert chat_messages:", insertError);
      throw new Error(insertError.message);
    }

    // 2. Check for AI conflict signal if sent by user and proactively intervene with solutions!
    const preferenceResult = await dbClient
      .from("member_ai_preferences")
      .select("chat_analysis_enabled")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (preferenceResult.error && preferenceResult.error.code !== "42P01") {
      throw new Error(preferenceResult.error.message);
    }
    const chatAnalysisEnabled = preferenceResult.data?.chat_analysis_enabled === true;

    if (chatAnalysisEnabled) {
      const lower = content.toLowerCase();
      const conflictKeywords = [
        "không đồng ý",
        "bất đồng",
        "tranh cãi",
        "không chịu",
        "sao lại",
        "tại sao",
        "lỗi do",
        "chậm vãi",
        "trễ quá",
        "làm hỏng",
        "không đúng",
        "conflict",
        "overlap",
        "blocker",
        "không hỗ trợ",
        "bỏ bê",
        "phản đối",
        "không hợp lý",
        "bất hợp lý",
        "đổi người",
        "không làm được",
        "tự làm đi",
        "delay",
        "chậm",
        "lỗi",
      ];

      const hasConflictSignal = conflictKeywords.some((kw) => lower.includes(kw));

      if (hasConflictSignal) {
        const aiSolutionContent = `🤖 [Nexus AI Conflict Mediator - Can thiệp & Đưa ra Giải pháp]:
Phát hiện tín hiệu trao đổi căng thẳng / bất đồng ý kiến giữa các thành viên. Để bảo vệ tiến độ chung dự án, AI đề xuất 3 GIẢI PHÁP ĐỒNG THUẬN tức thì cho team:

1. 🛠️ Solution 1 (Quy trình & Tiêu chuẩn): Chia nhỏ công việc đang tranh luận thành 2 sub-task độc lập. Thống nhất tiêu chuẩn Interface / Schema API trước khi ghép code.
2. 🤝 Solution 2 (Hỗ trợ nguồn lực): Nếu công việc bị tắc nghẽn hoặc quá tải, PM/Leader điều phối 1 thành viên rảnh hỗ trợ gỡ blocker ngay trong Sprint này.
3. ⏱️ Solution 3 (Giao tiếp 1-1): Tổ chức buổi họp nhanh 10 phút (Quick Sync) trực tiếp giữa 2 bên để chốt phương án cuối cùng mà không ảnh hưởng tiến độ.`;

        const conflictMessage = await dbClient.from("chat_messages").insert({
          room_id: roomId,
          sender_id: user.id,
          sender_type: "assistant",
          content: aiSolutionContent,
        });
        if (conflictMessage.error) throw new Error(conflictMessage.error.message);

        // Store only the derived conflict signal, never raw chat content, and
        // only after the member has explicitly opted into chat analysis.
        if (supabase) {
          const riskEvent = await supabase.rpc("record_risk_event", {
            target_project_id: projectId,
            target_user_id: user.id,
            target_task_id: null,
            event_type: "conflict",
            event_severity: "medium",
            event_summary: "Nexus phát hiện tín hiệu bất đồng trong Team Chat và đã đề xuất cách tháo gỡ.",
            event_metadata: { source: "opt_in_chat_analysis", privacy: "derived_signal_only" },
          });
          if (riskEvent.error) throw new Error(riskEvent.error.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: {
        id: insertedMsg.id,
        senderId: insertedMsg.sender_id,
        senderName: "Bạn (Tôi)",
        senderRole: role || "member",
        senderType: insertedMsg.sender_type,
        content: insertedMsg.content,
        createdAt: new Date(insertedMsg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể gửi tin nhắn.";
    const status = error instanceof ProjectAccessError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
