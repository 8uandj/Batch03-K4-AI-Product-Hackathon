import { NextResponse } from "next/server";
import { ProjectAccessError, requireProjectAccess } from "@/features/workspace/access";

type RouteContext = { params: Promise<{ id: string }> };

export type TeamChatMessageItem = {
  id: string;
  senderId: string | null;
  senderName: string;
  senderType: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

// Ensure a 'team' chat room exists for the project
async function getOrCreateTeamRoom(supabase: any, projectId: string) {
  const { data: existingRoom } = await supabase
    .from("chat_rooms")
    .select("id")
    .eq("project_id", projectId)
    .eq("type", "team")
    .maybeSingle();

  if (existingRoom) return existingRoom.id;

  // Insert team room
  const { data: newRoom, error } = await supabase
    .from("chat_rooms")
    .insert({
      project_id: projectId,
      type: "team",
      name: "Team Chat",
    })
    .select("id")
    .single();

  if (error || !newRoom) {
    // If concurrent insert happened, fetch again
    const { data: retryRoom } = await supabase
      .from("chat_rooms")
      .select("id")
      .eq("project_id", projectId)
      .eq("type", "team")
      .single();
    return retryRoom?.id;
  }

  return newRoom.id;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id: projectId } = await params;
    const access = await requireProjectAccess(projectId);
    const { supabase, user } = access;

    // Demo fallback for unauthenticated / mock mode
    if (!supabase || projectId.startsWith("demo")) {
      return NextResponse.json({
        success: true,
        messages: [
          {
            id: "msg-1",
            senderId: "u1",
            senderName: "Nguyễn Văn Tuấn (Frontend Lead)",
            senderType: "user",
            content: `Chào mọi người trong phòng chat dự án ${projectId}! Mình vừa khởi tạo repo.`,
            createdAt: "10:00",
          },
          {
            id: "msg-2",
            senderId: "u2",
            senderName: "Trần Minh Hoàng (Backend Lead)",
            senderType: "user",
            content: "Chào bạn, mình đang hoàn thiện API Supabase đồng bộ live.",
            createdAt: "10:15",
          },
        ],
      });
    }

    const roomId = await getOrCreateTeamRoom(supabase, projectId);
    if (!roomId) {
      return NextResponse.json({ error: "Không thể tạo phòng chat." }, { status: 500 });
    }

    const { data: rawMessages, error: msgError } = await supabase
      .from("chat_messages")
      .select("id, sender_id, sender_type, content, created_at, users(name, email)")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (msgError) throw new Error(msgError.message);

    const formattedMessages: TeamChatMessageItem[] = (rawMessages ?? []).map((m: any) => {
      const userData = m.users as { name?: string; email?: string } | null;
      let senderName = "Thành viên";
      if (m.sender_type === "assistant") {
        senderName = "Nexus AI Bot";
      } else if (m.sender_id === user.id) {
        senderName = "Bạn (Tôi)";
      } else if (userData?.name) {
        senderName = userData.name;
      } else if (userData?.email) {
        senderName = userData.email.split("@")[0];
      }

      return {
        id: m.id,
        senderId: m.sender_id,
        senderName,
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
    const { supabase, user } = access;

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
          senderType: "user",
          content,
          createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      });
    }

    const roomId = await getOrCreateTeamRoom(supabase, projectId);
    if (!roomId) {
      return NextResponse.json({ error: "Không thể kết nối phòng chat." }, { status: 500 });
    }

    // 1. Insert user message to chat_messages
    const { data: insertedMsg, error: insertError } = await supabase
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

    // 2. Check for AI conflict signal
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
      await supabase.from("chat_messages").insert({
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
