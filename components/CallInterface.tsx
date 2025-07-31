"use client"

import { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { callingService, type CallSession } from "../services/callingService"

interface CallInterfaceProps {
  callSession: CallSession
  onEndCall: () => void
  isIncoming?: boolean
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window")

export default function CallInterface({ callSession, onEndCall, isIncoming = false }: CallInterfaceProps) {
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(callSession.type === "video")
  const [isSpeakerOn, setIsSpeakerOn] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [callStatus, setCallStatus] = useState(callSession.status)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (callStatus === "active") {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [callStatus])

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleAnswerCall = async () => {
    try {
      await callingService.answerCall(callSession.id)
      setCallStatus("active")
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

  const handleToggleMute = async () => {
    try {
      await callingService.toggleMute(callSession.id, !isMuted)
      setIsMuted(!isMuted)
    } catch (error) {
      Alert.alert("Error", "Failed to toggle mute")
    }
  }

  const handleToggleVideo = async () => {
    if (callSession.type === "voice") return

    try {
      await callingService.toggleVideo(callSession.id, !isVideoOn)
      setIsVideoOn(!isVideoOn)
    } catch (error) {
      Alert.alert("Error", "Failed to toggle video")
    }
  }

  const handleSwitchCamera = async () => {
    if (callSession.type === "voice" || !isVideoOn) return

    try {
      await callingService.switchCamera(callSession.id)
    } catch (error) {
      Alert.alert("Error", "Failed to switch camera")
    }
  }

  return (
    <View style={styles.container}>
      {/* Video Area */}
      <View style={styles.videoContainer}>
        {callSession.type === "video" && isVideoOn ? (
          <LinearGradient colors={["#FF6B6B", "#4ECDC4"]} style={styles.videoPlaceholder}>
            <MaterialIcons name="videocam" size={64} color="white" />
            <Text style={styles.videoPlaceholderText}>Video Call</Text>
          </LinearGradient>
        ) : (
          <LinearGradient colors={["#333", "#666"]} style={styles.audioPlaceholder}>
            <MaterialIcons name="person" size={100} color="white" />
            <Text style={styles.callerName}>Calling...</Text>
          </LinearGradient>
        )}

        {/* Call Status */}
        <View style={styles.callStatus}>
          <Text style={styles.callStatusText}>
            {callStatus === "ringing"
              ? "Ringing..."
              : callStatus === "active"
                ? formatDuration(callDuration)
                : callStatus}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        {callStatus === "active" && (
          <View style={styles.activeControls}>
            {/* Mute Button */}
            <TouchableOpacity
              style={[styles.controlButton, isMuted && styles.activeControlButton]}
              onPress={handleToggleMute}
            >
              <MaterialIcons name={isMuted ? "mic-off" : "mic"} size={24} color={isMuted ? "white" : "#333"} />
            </TouchableOpacity>

            {/* Video Toggle (for video calls) */}
            {callSession.type === "video" && (
              <TouchableOpacity
                style={[styles.controlButton, !isVideoOn && styles.activeControlButton]}
                onPress={handleToggleVideo}
              >
                <MaterialIcons
                  name={isVideoOn ? "videocam" : "videocam-off"}
                  size={24}
                  color={!isVideoOn ? "white" : "#333"}
                />
              </TouchableOpacity>
            )}

            {/* Speaker Button */}
            <TouchableOpacity
              style={[styles.controlButton, isSpeakerOn && styles.activeControlButton]}
              onPress={() => setIsSpeakerOn(!isSpeakerOn)}
            >
              <MaterialIcons
                name={isSpeakerOn ? "volume-up" : "volume-down"}
                size={24}
                color={isSpeakerOn ? "white" : "#333"}
              />
            </TouchableOpacity>

            {/* Camera Switch (for video calls) */}
            {callSession.type === "video" && isVideoOn && (
              <TouchableOpacity style={styles.controlButton} onPress={handleSwitchCamera}>
                <MaterialIcons name="flip-camera-ios" size={24} color="#333" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Call Action Buttons */}
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
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  videoContainer: {
    flex: 1,
    position: "relative",
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  videoPlaceholderText: {
    color: "white",
    fontSize: 18,
    marginTop: 10,
  },
  audioPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  callerName: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20,
  },
  callStatus: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  callStatusText: {
    color: "white",
    fontSize: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  controlsContainer: {
    paddingBottom: 50,
    paddingHorizontal: 30,
  },
  activeControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 30,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  activeControlButton: {
    backgroundColor: "#FF6B6B",
  },
  callActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  answerButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
  },
  declineButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F44336",
    alignItems: "center",
    justifyContent: "center",
  },
  endCallButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F44336",
    alignItems: "center",
    justifyContent: "center",
  },
})
