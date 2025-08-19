"use client"

import { useMemo } from "react"
import { View, TouchableOpacity, Text, StyleSheet, Platform } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { WebView } from "react-native-webview"

interface VoiceCallWebViewProps {
  roomId: string
  isHost: boolean
  onClose: () => void
}

const buildHtml = (roomId: string, isHost: boolean) => `<!doctype html>
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
    <script src="https://unpkg.com/@peerjs/peerjs@1.5.2/dist/peerjs.min.js"></script>
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
        const hostId = roomId + '-host'
        const callerId = roomId + '-caller'

        function setStatus(text, color) {
          document.getElementById('status').innerText = text
          if (color) document.getElementById('dot').style.background = color
          document.getElementById('label').innerText = text
        }

        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          const peer = new Peer(isHost ? hostId : callerId, { debug: 0 })

          peer.on('open', (id) => {
            setStatus(isHost ? 'Waiting for caller…' : 'Dialing…', isHost ? '#f90' : '#09f')
            if (!isHost) {
              const call = peer.call(hostId, stream)
              call.on('stream', (remoteStream) => {
                const audio = new Audio()
                audio.srcObject = remoteStream
                audio.autoplay = true
                setStatus('Connected', '#0f0')
              })
              call.on('close', () => setStatus('Call ended', '#999'))
              call.on('error', () => setStatus('Call error', '#f33'))
            }
          })

          peer.on('call', (call) => {
            call.answer(stream)
            call.on('stream', (remoteStream) => {
              const audio = new Audio()
              audio.srcObject = remoteStream
              audio.autoplay = true
              setStatus('Connected', '#0f0')
            })
            call.on('close', () => setStatus('Call ended', '#999'))
            call.on('error', () => setStatus('Call error', '#f33'))
          })

          peer.on('error', (err) => {
            setStatus('Peer error: ' + (err && err.type ? err.type : 'unknown'), '#f33')
          })
        } catch (e) {
          setStatus('Microphone permission required', '#f33')
        }
      })();
    </script>
  </body>
  </html>`

export default function VoiceCallWebView({ roomId, isHost, onClose }: VoiceCallWebViewProps) {
  const html = useMemo(() => buildHtml(roomId, isHost), [roomId, isHost])
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

