import { supabase } from "./supabase"

const getProjectRef = (): string => {
  try {
    const url = new URL((supabase as any).supabaseUrl || (supabase as any)._supabaseUrl || "")
    // e.g. https://pvvkdtlkjulvutzyzaxb.supabase.co
    const host = url.host // pvvkdtlkjulvutzyzaxb.supabase.co
    const projectRef = host.split(".")[0]
    return projectRef
  } catch {
    return ""
  }
}

const getFunctionsBaseUrl = (): string => {
  const projectRef = getProjectRef()
  return projectRef ? `https://${projectRef}.functions.supabase.co` : ""
}

export interface LiveKitTokenResponse {
  token: string
  url: string
}

export const livekit = {
  getAccessToken: async (
    roomName: string,
    identity: string,
    options?: { autoCreate?: boolean; metadata?: Record<string, any>; participantName?: string; grants?: Record<string, any> },
  ): Promise<LiveKitTokenResponse> => {
    const base = getFunctionsBaseUrl()
    if (!base) throw new Error("Unable to resolve Supabase Functions URL")

    const { data: session } = await supabase.auth.getSession()
    const accessToken = session.session?.access_token
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`

    const res = await fetch(`${base}/livekit-token`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        roomName,
        identity,
        autoCreate: options?.autoCreate ?? false,
        metadata: options?.metadata,
        participantName: options?.participantName,
        grants: options?.grants,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || `Failed to get LiveKit token (${res.status})`)
    }

    const json = (await res.json()) as LiveKitTokenResponse
    if (!json?.token || !json?.url) throw new Error("Invalid token response")
    return json
  },
}