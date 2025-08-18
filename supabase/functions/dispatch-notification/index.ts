// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1"

interface Payload {
  target_user_id: string
  type: string
  title: string
  body: string
  data?: Record<string, any>
}

// Optional external providers via env vars
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
const RESEND_KEY = Deno.env.get("RESEND_API_KEY")
const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID")
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")
const TWILIO_FROM = Deno.env.get("TWILIO_FROM_NUMBER")

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
)

async function inQuietHours(userId: string): Promise<{ quiet: boolean; settings: any }> {
  const { data: settings } = await supabase
    .from("notification_settings")
    .select("push_enabled, email_enabled, sms_enabled, sound_enabled, vibration_enabled, quiet_hours_enabled, quiet_start, quiet_end")
    .eq("user_id", userId)
    .single()

  if (!settings || settings.quiet_hours_enabled !== true) {
    return { quiet: false, settings: settings || {} }
  }

  const now = new Date()
  const [sh, sm] = (settings.quiet_start || "22:00").split(":").map((n: string) => parseInt(n, 10))
  const [eh, em] = (settings.quiet_end || "08:00").split(":").map((n: string) => parseInt(n, 10))
  const start = new Date(now)
  start.setHours(sh, sm || 0, 0, 0)
  const end = new Date(now)
  end.setHours(eh, em || 0, 0, 0)

  let quiet = false
  if (start <= end) quiet = now >= start && now <= end
  else quiet = now >= start || now <= end

  return { quiet, settings }
}

async function sendPush(userId: string, title: string, body: string, data?: any, sound = true) {
  const { data: tokens } = await supabase
    .from("push_tokens")
    .select("token")
    .eq("user_id", userId)

  if (!tokens || tokens.length === 0) return { ok: true }

  const messages = tokens.map((t: any) => ({
    to: t.token,
    title,
    body,
    data,
    sound: sound ? "default" : undefined,
  }))

  const resp = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notifications: messages }),
  })
  if (!resp.ok) throw new Error(`Expo push failed: ${await resp.text()}`)
  return { ok: true }
}

async function sendEmail(userId: string, subject: string, text: string) {
  const { data: user } = await supabase.from("users").select("email, name").eq("id", userId).single()
  if (!user?.email) return { ok: true }
  if (!RESEND_KEY) return { ok: true } // Skip if not configured

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "noreply@notifications.yourapp.com",
      to: [user.email],
      subject,
      text,
    }),
  })
  if (!resp.ok) throw new Error(`Email failed: ${await resp.text()}`)
  return { ok: true }
}

async function sendSms(userId: string, text: string) {
  // Expect a phone number in profiles.phone if present
  const { data: user } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", userId)
    .single()
  const to = user?.phone
  if (!to) return { ok: true }
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) return { ok: true }

  const form = new URLSearchParams()
  form.append("To", to)
  form.append("From", TWILIO_FROM)
  form.append("Body", text)

  const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`),
    },
    body: form,
  })
  if (!resp.ok) throw new Error(`SMS failed: ${await resp.text()}`)
  return { ok: true }
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 })
    const payload = (await req.json()) as Payload

    if (!payload?.target_user_id || !payload?.title || !payload?.body) {
      return new Response(JSON.stringify({ error: "invalid_payload" }), { status: 400 })
    }

    const { quiet, settings } = await inQuietHours(payload.target_user_id)

    // Always store in-app notification
    await supabase.from("notifications").insert({
      user_id: payload.target_user_id,
      title: payload.title,
      message: payload.body,
      type: payload.type,
      data: payload.data || {},
    })

    // Dispatch by channel
    const pushEnabled = settings?.push_enabled !== false
    const emailEnabled = settings?.email_enabled === true
    const smsEnabled = settings?.sms_enabled === true
    const allowSound = settings?.sound_enabled !== false

    const tasks: Promise<any>[] = []
    if (pushEnabled && !quiet) tasks.push(sendPush(payload.target_user_id, payload.title, payload.body, payload.data, allowSound))
    if (emailEnabled) tasks.push(sendEmail(payload.target_user_id, payload.title, payload.body))
    if (smsEnabled) tasks.push(sendSms(payload.target_user_id, payload.body))

    await Promise.all(tasks)
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "unknown_error" }), { status: 500 })
  }
})

