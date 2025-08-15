// supabase edge function: livekit-token (disabled)
// This project build uses Jitsi via WebView in Expo Go. LiveKit token script is kept for reference but unused.

export {}

// Minimal implementation without importing server SDK to keep footprint small here.
// In your real function, use @livekit/server-sdk to generate a JWT with grants.

// Ambient globals for Edge environments
declare const Deno: { env: { get(key: string): string | undefined } }

export default async (req: Request): Promise<Response> => {
  try {
    const { roomName, identity, autoCreate, metadata, participantName, grants } = await req.json()
    if (!roomName || !identity) return new Response("Missing roomName/identity", { status: 400 })

    const url = Deno.env.get("LIVEKIT_URL")
    const apiKey = Deno.env.get("LIVEKIT_API_KEY")
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET")
    if (!url || !apiKey || !apiSecret) return new Response("LiveKit env not configured", { status: 500 })

    // Build a JWT manually (simplified). Replace with @livekit/server-sdk for production.
    const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    const now = Math.floor(Date.now() / 1000)
    const payload = base64url(
      JSON.stringify({
        iss: apiKey,
        sub: identity,
        name: participantName,
        nbf: now - 10,
        exp: now + 60 * 60,
        video: {
          room: roomName,
          roomCreate: !!autoCreate,
          canPublish: grants?.canPublish ?? true,
          canSubscribe: grants?.canSubscribe ?? true,
        },
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      }),
    )
    const unsigned = `${header}.${payload}`
    const signature = await hmacSha256(unsigned, apiSecret)
    const token = `${unsigned}.${signature}`

    return json({ token, url })
  } catch (e: any) {
    const message = typeof e === "object" && e && "message" in e ? (e as any).message : String(e)
    return new Response(String(message), { status: 500 })
  }
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } })
}

function base64url(input: string): string {
  return btoa(input).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

async function hmacSha256(input: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]) 
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(input))
  const bytes = String.fromCharCode(...new Uint8Array(sig))
  return base64url(bytes)
}