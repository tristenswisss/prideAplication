"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert, Platform } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { callingService, type CallSession } from "../services/callingService"
import { WebView } from "react-native-webview"

interface CallInterfaceProps {
  callSession: CallSession
  onEndCall: () => void
  isIncoming?: boolean
}

const { height: screenHeight } = Dimensions.get("window")

const extractRoomName = (url: string): string | null => {
  try {
    const noHash = url.split("#")[0]
    const parts = noHash.split("/")
    const last = parts[parts.length - 1]
    return last || null
  } catch {
    return null
  }
}

export default function CallInterface({ callSession, onEndCall, isIncoming = false }: CallInterfaceProps) {
  const [isMuted, setIsMuted] = useState(callSession.type === "voice")
  const [isVideoOn, setIsVideoOn] = useState(callSession.type === "video")
  const [callDuration, setCallDuration] = useState(0)
  const [callStatus, setCallStatus] = useState(callSession.status)
  const webRef = useRef<WebView>(null)

  const roomName = useMemo(() => (callSession.jitsi_url ? extractRoomName(callSession.jitsi_url) : null), [callSession.jitsi_url])

  const jitsiHtml = useMemo(() => {
    const startAudioMuted = callSession.type === "voice"
    const startVideoMuted = callSession.type !== "video"
    const rnBridge = `window.ReactNativeWebView && window.ReactNativeWebView.postMessage`
    return `<!doctype html><html><head><meta name=viewport content="initial-scale=1, maximum-scale=1"><style>html,body,#root{height:100%;margin:0;background:#000}</style></head><body><div id="root"></div><script src="https://meet.jit.si/external_api.js"></script><script>(function(){
      const domain='meet.jit.si';
      const options={
        roomName: ${JSON.stringify(roomName || "")},
        parentNode: document.querySelector('#root'),
        configOverwrite:{
          startWithAudioMuted:${startAudioMuted},
          startWithVideoMuted:${startVideoMuted},
          prejoinConfig:{enabled:false},
          disableDeepLinking:true
        },
        interfaceConfigOverwrite:{
          TOOLBAR_BUTTONS: [],
          DEFAULT_REMOTE_DISPLAY_NAME: 'Guest'
        },
        userInfo:{displayName:'You'}
      };
      const api=new JitsiMeetExternalAPI(domain,options);
      window.__execute=function(cmd){
        try{
          if(cmd==='toggleAudio') api.executeCommand('toggleAudio');
          if(cmd==='toggleVideo') api.executeCommand('toggleVideo');
          if(cmd==='hangup') api.executeCommand('hangup');
        }catch(e){}
      };
      api.on('videoConferenceJoined',()=>{try{${rnBridge} && ${rnBridge}(JSON.stringify({type:'joined'}));}catch(e){}});
      api.on('videoConferenceLeft',()=>{try{${rnBridge} && ${rnBridge}(JSON.stringify({type:'left'}));}catch(e){}});
    })();</script></body></html>`
  }, [roomName, callSession.type])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (callStatus === "active") {
      interval = setInterval(() => setCallDuration((prev) => prev + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [callStatus])

  const handleConnect = async () => {
    if (!callSession.jitsi_url || !roomName) {
      Alert.alert("Error", "Missing call URL")
      return
    }
    setCallStatus("active")
  }

  useEffect(() => {
    if (!isIncoming) {
      handleConnect()
    }
  }, [])

  const handleAnswerCall = async () => {
    try {
      await callingService.answerCall(callSession.id)
      await handleConnect()
    } catch (error) {
      Alert.alert("Error", "Failed to answer call")
    }
  }

  const handleDeclineCall = async () => {
    try {
      await callingService.declineCall(callSession.id)
      onEndCall()
    } catch (error) {
      Alert.alert("Error", "Failed to decline call")
    }
  }

  const handleEndCall = async () => {
    try {
      // Ask Jitsi to hang up, then close
      webRef.current?.injectJavaScript(`window.__execute && window.__execute('hangup'); true;`)
      await callingService.endCall(callSession.id)
      onEndCall()
    } catch (error) {
      Alert.alert("Error", "Failed to end call")
    }
  }

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev)
    webRef.current?.injectJavaScript(`window.__execute && window.__execute('toggleAudio'); true;`)
  }

  const handleToggleVideo = () => {
    if (callSession.type === "voice") return
    setIsVideoOn((prev) => !prev)
    webRef.current?.injectJavaScript(`window.__execute && window.__execute('toggleVideo'); true;`)
  }

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        {callStatus === "active" && callSession.jitsi_url ? (
          <WebView
            ref={webRef}
            originWhitelist={["*"]}
            source={{ html: jitsiHtml }}
            style={{ flex: 1 }}
            allowsFullscreenVideo
            javaScriptEnabled
            domStorageEnabled
            mediaPlaybackRequiresUserAction={false}
            startInLoadingState
            onHttpError={() => {}}
            onError={() => {}}
            onMessage={(e) => {
              try {
                const msg = JSON.parse(e.nativeEvent.data || "{}")
                if (msg.type === "left") {
                  onEndCall()
                }
              } catch {}
            }}
            {...(Platform.OS === "android"
              ? { onPermissionRequest: (event: any) => event.grant(event.resources) }
              : {})}
          />
        ) : (
          <LinearGradient colors={["#333", "#666"]} style={styles.audioPlaceholder}>
            <MaterialIcons name="person" size={100} color="white" />
            <Text style={styles.callerName}>{callStatus === "ringing" ? "Ringing..." : "Connecting..."}</Text>
          </LinearGradient>
        )}

        <View style={styles.callStatus}>
          <Text style={styles.callStatusText}>
            {callStatus === "ringing" ? "Ringing..." : callStatus === "active" ? `${callDuration}s` : callStatus}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        {callStatus === "active" && (
          <View style={styles.activeControls}>
            <TouchableOpacity style={[styles.controlButton, isMuted && styles.activeControlButton]} onPress={handleToggleMute}>
              <MaterialIcons name={isMuted ? "mic-off" : "mic"} size={24} color={isMuted ? "white" : "#333"} />
            </TouchableOpacity>
            {callSession.type === "video" && (
              <TouchableOpacity style={[styles.controlButton, !isVideoOn && styles.activeControlButton]} onPress={handleToggleVideo}>
                <MaterialIcons name={isVideoOn ? "videocam" : "videocam-off"} size={24} color={!isVideoOn ? "white" : "#333"} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.callActions}>
          {isIncoming && callStatus === "ringing" ? (
            <>
              <TouchableOpacity style={styles.declineButton} onPress={handleDeclineCall}>
                <MaterialIcons name="call-end" size={32} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.answerButton} onPress={handleAnswerCall}>
                <MaterialIcons name="call" size={32} color="white" />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
              <MaterialIcons name="call-end" size={32} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  videoContainer: { flex: 1, position: "relative" },
  audioPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  callerName: { color: "white", fontSize: 24, fontWeight: "bold", marginTop: 20 },
  callStatus: { position: "absolute", top: 60, left: 0, right: 0, alignItems: "center" },
  callStatusText: { color: "white", fontSize: 16, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  controlsContainer: { paddingBottom: 50, paddingHorizontal: 30 },
  activeControls: { flexDirection: "row", justifyContent: "space-around", marginBottom: 30 },
  controlButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  activeControlButton: { backgroundColor: "#FF6B6B" },
  callActions: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  declineButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#F44336", alignItems: "center", justifyContent: "center", marginHorizontal: 20 },
  answerButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#4CAF50", alignItems: "center", justifyContent: "center", marginHorizontal: 20 },
  endCallButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#F44336", alignItems: "center", justifyContent: "center" },
})
