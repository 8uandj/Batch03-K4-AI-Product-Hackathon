import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  try {
    return createAdminClient();
  } catch {
    return supabase;
  }
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
            senderName: "Nguyễn Văn Tuấn",
            senderRole: "pm",
            senderType: "user",
            content: `Chào mọi người trong dự án! Mình vừa khởi tạo repo.`,
            createdAt: "10:00",
          },
          {
            id: "msg-2",
            senderId: "u2",
            senderName: "Trần Minh Hoàng",
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

    // 1. Fetch project members roles map (userId -> 'pm' | 'member')
    const { data: memberRows } = await dbClient
      .from("project_members")
      .select("user_id, role")
      .eq("project_id", projectId);

    const roleMap = new Map<string, "pm" | "member">();
    (memberRows ?? []).forEach((m: any) => roleMap.set(m.user_id, m.role as "pm" | "member"));

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
        } else if (userData?.name) {
          senderName = userData.name;
        } else if (userData?.email) {
          senderName = userData.email.split("@")[0];
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

    const body = (await request.json()) as { content?: string };
    const content = body.content?.trim();

    if (!content) {
      return NextResponse.json({ error: "Nội dung tin nhắn không được để trống." }, { status: 400 });
    }

    if (!supabase || projectId.startsWith("demo")) {
      return NextResponse.json({
        success: true,
        message: {
          id: `msg_${Date.now()}`,
          senderId: user.id,
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

    // 1. Insert user message into Supabase chat_messages
    const { data: insertedMsg, error: insertError } = await dbClient
      .from("chat_messages")
      .insert({
        room_id: roomId,
        sender_id: user.id,
        sender_type: "user",
        content,
      })
      .select("id, sender_id, sender_type, content, created_at")
      .single();

    if (insertError) throw new Error(insertError.message);

    // 2. Check for AI conflict signal and auto-respond if present
    const lower = content.toLowerCase();
    const hasConflictSignal = [
      "không đồng ý",
      "bất đồng",
      "lỗi",
      "delay",
      "chậm",
      "conflict",
      "tranh cãi",
      "phản đối",
      "sao lại",
    ].some((kw) => lower.includes(kw));

    if (hasConflictSignal) {
      await dbClient.from("chat_messages").insert({
        room_id: roomId,
        sender_id: null,
        sender_type: "assistant",
        content:
          "🤖 [Nexus AI Conflict Mediator]: Phát hiện tín hiệu bất đồng/trễ hạn trong cuộc thảo luận. AI đề xuất team chia nhỏ task thành các tiêu chí kiểm thử rõ ràng và thống nhất tiến độ trong buổi họp daily sắp tới.",
      });
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
