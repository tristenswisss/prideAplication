"use client"

import { useState, useEffect, useRef } from "react"
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

const { width: screenWidth, height: screenHeight } = Dimensions.get("window")

export default function CallInterface({ callSession, onEndCall, isIncoming = false }: CallInterfaceProps) {
  const [isMuted, setIsMuted] = useState(callSession.type === "voice")
  const [isSpeakerOn, setIsSpeakerOn] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [callStatus, setCallStatus] = useState(callSession.status)
  const webViewRef = useRef<WebView>(null)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (callStatus === "active") {
      interval = setInterval(() => setCallDuration((prev) => prev + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [callStatus])

  const handleConnect = async () => {
    if (!callSession.jitsi_url) {
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
      await callingService.endCall(callSession.id)
      onEndCall()
    } catch (error) {
      Alert.alert("Error", "Failed to end call")
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        {callSession.type === "video" && callStatus === "active" && callSession.jitsi_url ? (
          <WebView
            ref={webViewRef}
            source={{ uri: callSession.jitsi_url }}
            style={{ flex: 1 }}
            allowsFullscreenVideo
            javaScriptEnabled
            domStorageEnabled
            mediaPlaybackRequiresUserAction={false}
            startInLoadingState
            onHttpError={() => {}}
            onError={() => {}}
            {...(Platform.OS === "android"
              ? { onPermissionRequest: (event: any) => event.grant(event.resources) }
              : {})}
          />
        ) : (
          <LinearGradient colors={["#333", "#666"]} style={styles.audioPlaceholder}>
            <MaterialIcons name="person" size={100} color="white" />
            <Text style={styles.callerName}>{callStatus === "ringing" ? "Ringing..." : "Audio Call"}</Text>
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
            <TouchableOpacity
              style={[styles.controlButton, isMuted && styles.activeControlButton]}
              onPress={() => {
                setIsMuted(!isMuted)
                webViewRef.current?.injectJavaScript(
                  "try{ if (window.APP && APP.conference) { APP.conference.toggleAudioMuted(); } }catch(e){}; true;"
                )
              }}
            >
              <MaterialIcons name={isMuted ? "mic-off" : "mic"} size={24} color={isMuted ? "white" : "#333"} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, isSpeakerOn && styles.activeControlButton]}
              onPress={() => setIsSpeakerOn(!isSpeakerOn)}
            >
              <MaterialIcons name={isSpeakerOn ? "volume-up" : "volume-down"} size={24} color={isSpeakerOn ? "white" : "#333"} />
            </TouchableOpacity>
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
