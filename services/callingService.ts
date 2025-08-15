import type { LiveKitTokenResponse } from "../lib/livekit"
import { livekit } from "../lib/livekit"
import { supabase } from "../lib/supabase"

export interface CallSession {
  id: string
  caller_id: string
  callee_id: string
  type: "voice" | "video"
  status: "ringing" | "active" | "ended" | "declined"
  room_name: string
  lk_url?: string
  lk_token?: string
  started_at?: string
  ended_at?: string
  duration?: number
}

export interface ScreenShareSession {
  id: string
  host_id: string
  live_event_id: string
  is_active: boolean
  started_at: string
  ended_at?: string
}

const buildRoomName = (a: string, b: string) => `call_${[a, b].sort().join("_")}`

export const callingService = {
  // Voice/Video Calling (LiveKit room per conversation)
  initiateCall: async (callerId: string, calleeId: string, type: "voice" | "video"): Promise<CallSession> => {
    const roomName = buildRoomName(callerId, calleeId)
    const tok: LiveKitTokenResponse = await livekit.getAccessToken(roomName, callerId, {
      autoCreate: true,
      participantName: "caller",
    })

    // Optionally notify callee via notification table
    await supabase.rpc("create_notification", {
      user_id: calleeId,
      title: type === "video" ? "Incoming Video Call" : "Incoming Voice Call",
      message: "Tap to join the call",
      type: "call_invite",
      data: { room: roomName, callerId, type },
    })

    return {
      id: Math.random().toString(36).slice(2),
      caller_id: callerId,
      callee_id: calleeId,
      type,
      status: "ringing",
      room_name: roomName,
      lk_url: tok.url,
      lk_token: tok.token,
      started_at: new Date().toISOString(),
    }
  },

  answerCall: async (_callId: string): Promise<void> => {
    // UI joins the same LiveKit room using fetched token for authenticated user
    return
  },

  declineCall: async (_callId: string): Promise<void> => {
    return
  },

  endCall: async (_callId: string): Promise<void> => {
    return
  },

  // Screen Sharing (handled by LiveKit; keep API surface)
  startScreenShare: async (hostId: string, liveEventId: string): Promise<ScreenShareSession> => {
    return {
      id: Math.random().toString(36).slice(2),
      host_id: hostId,
      live_event_id: liveEventId,
      is_active: true,
      started_at: new Date().toISOString(),
    }
  },

  stopScreenShare: async (_sessionId: string): Promise<void> => {
    return
  },

  toggleMute: async (_callId: string, _isMuted: boolean): Promise<void> => {
    return
  },

  toggleVideo: async (_callId: string, _isVideoOn: boolean): Promise<void> => {
    return
  },

  switchCamera: async (_callId: string): Promise<void> => {
    return
  },
}
