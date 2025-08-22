"use client"

import { useMemo } from "react"
import { View, TouchableOpacity, Text, StyleSheet, Platform } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { WebView } from "react-native-webview"
import Constants from "expo-constants"

interface VoiceCallWebViewProps {
  roomId: string
  isHost: boolean
  onClose: () => void
}

const readConfigValue = (value?: string) => (typeof value === 'string' ? value.trim() : '')
const getSupabaseConfig = () => {
  const envUrl = readConfigValue(process.env.EXPO_PUBLIC_SUPABASE_URL as string)
  const envKey = readConfigValue(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string)
  const extra = (Constants?.expoConfig as any)?.extra || (Constants?.manifest as any)?.extra || {}
  const extraUrl = readConfigValue(extra?.supabaseUrl)
  const extraKey = readConfigValue(extra?.supabaseAnonKey)
  return { url: envUrl || extraUrl, anon: envKey || extraKey }
}

const buildHtml = (roomId: string, isHost: boolean, url: string, anon: string) => `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <style>
      body { margin: 0; font-family: -apple-system, Segoe UI, Roboto, sans-serif; background: #111; color: #fff; }
      .wrap { display: flex; flex-direction: column; height: 100vh; }
      .status { padding: 12px; background: #222; font-size: 14px; }
      .content { flex: 1; display: flex; align-items: center; justify-content: center; }
      .dot { width: 12px; height: 12px; border-radius: 6px; margin-right: 8px; display: inline-block; }
      .row { display: flex; align-items: center; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  </head>
  <body>
    <div class="wrap">
      <div id="status" class="status">Preparing call...</div>
      <div class="content">
        <div class="row"><span id="dot" class="dot" style="background:#f90"></span><span id="label">Connecting…</span></div>
      </div>
    </div>
    <script>
      (async function() {
        const roomId = ${JSON.stringify(roomId)}
        const isHost = ${JSON.stringify(isHost)}
        const supabaseUrl = ${JSON.stringify(url)}
        const supabaseAnonKey = ${JSON.stringify(anon)}
        const hostId = roomId + '-host'
        const callerId = roomId + '-caller'

        function setStatus(text, color) {
          document.getElementById('status').innerText = text
          if (color) document.getElementById('dot').style.background = color
          document.getElementById('label').innerText = text
        }

        // Supabase Realtime signaling with native WebRTC in browser
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
        const supa = window.supabase.createClient(supabaseUrl, supabaseAnonKey)
        const channel = supa.channel('webrtc_' + roomId)

        function setStatus(text, color) {
          document.getElementById('status').innerText = text
          if (color) document.getElementById('dot').style.background = color
          document.getElementById('label').innerText = text
        }

        const localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }).catch(() => null)
        if (!localStream) {
          setStatus('Microphone permission required', '#f33')
          return
        }
        localStream.getTracks().forEach(t => pc.addTrack(t, localStream))
        pc.ontrack = (e) => {
          const audio = new Audio()
          audio.srcObject = e.streams[0]
          audio.autoplay = true
          setStatus('Connected', '#0f0')
        }
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            channel.send({ type: 'broadcast', event: 'ice', payload: { from: isHost ? hostId : callerId, candidate: event.candidate } })
          }
        }

        await channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            setStatus(isHost ? 'Waiting for caller…' : 'Dialing…', isHost ? '#f90' : '#09f')
            if (isHost) {
              const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false })
              await pc.setLocalDescription(offer)
              channel.send({ type: 'broadcast', event: 'offer', payload: { sdp: offer } })
            } else {
              channel.send({ type: 'broadcast', event: 'join', payload: { callerId } })
            }
          }
        })

        channel.on('broadcast', { event: 'offer' }, async (payload) => {
          if (isHost) return
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          channel.send({ type: 'broadcast', event: 'answer', payload: { sdp: answer } })
        })

        channel.on('broadcast', { event: 'answer' }, async (payload) => {
          if (!isHost) return
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
        })

        channel.on('broadcast', { event: 'ice' }, async (payload) => {
          if (!payload || !payload.candidate) return
          try { await pc.addIceCandidate(payload.candidate) } catch {}
        })
      })();
    </script>
  </body>
  </html>`

export default function VoiceCallWebView({ roomId, isHost, onClose }: VoiceCallWebViewProps) {
  const { url, anon } = getSupabaseConfig()
  const html = useMemo(() => buildHtml(roomId, isHost, url, anon), [roomId, isHost, url, anon])
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.close}>
          <MaterialIcons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Voice Call</Text>
        <View style={{ width: 24 }} />
      </View>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        style={{ flex: 1, backgroundColor: "#000" }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        {...(Platform.OS === 'android' ? { onPermissionRequest: (e: any) => e.grant(e.resources) } : {})}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    height: 52,
    backgroundColor: "#111",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  close: { padding: 8 },
  title: { color: "#fff", fontSize: 16, fontWeight: "600" },
})

