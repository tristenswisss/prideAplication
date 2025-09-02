import React, { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useTheme } from "../Contexts/ThemeContext"
import { userReportService } from "../services/userReportService"
import { useAuth } from "../Contexts/AuthContexts"

interface ReportUserModalProps {
  visible: boolean
  onClose: () => void
  reportedUserId: string
  reportedUserName: string
}

const REPORT_REASONS = [
  "Harassment or bullying",
  "Inappropriate content",
  "Spam or unwanted messages",
  "Fake profile",
  "Violent threats",
  "Hate speech",
  "Other"
]

export default function ReportUserModal({ visible, onClose, reportedUserId, reportedUserName }: ReportUserModalProps) {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [selectedReason, setSelectedReason] = useState("")
  const [customMessage, setCustomMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!user) return
    if (!selectedReason) {
      Alert.alert("Error", "Please select a reason for reporting")
      return
    }

    setLoading(true)
    try {
      const result = await userReportService.submitReport({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        reason: selectedReason,
        details: customMessage || undefined
      })

      if (result.success) {
        Alert.alert("Report Submitted", "Thank you for your report. We will review it shortly.", [
          { text: "OK", onPress: onClose }
        ])
        setSelectedReason("")
        setCustomMessage("")
      } else {
        Alert.alert("Error", result.error || "Failed to submit report")
      }
    } catch (error) {
      Alert.alert("Error", "Failed to submit report")
    } finally {
      setLoading(false)
    }
  }

  if (!visible) return null

  return (
    <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
      <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Report User</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            You are reporting: <Text style={{ fontWeight: 'bold' }}>{reportedUserName}</Text>
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Reason for report:</Text>
          {REPORT_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason}
              style={[
                styles.reasonOption,
                { borderColor: theme.colors.border },
                selectedReason === reason && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '10' }
              ]}
              onPress={() => setSelectedReason(reason)}
            >
              <Text style={[styles.reasonText, { color: theme.colors.text }]}>{reason}</Text>
              {selectedReason === reason && (
                <MaterialIcons name="check" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Additional details (optional):</Text>
          <TextInput
            style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder="Provide more details about the issue..."
            placeholderTextColor={theme.colors.textTertiary}
            value={customMessage}
            onChangeText={setCustomMessage}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={[styles.disclaimer, { color: theme.colors.textSecondary }]}>
            Your report will be sent to our moderation team for review. We take all reports seriously and will investigate accordingly.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: theme.colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? "Submitting..." : "Submit Report"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 16,
    flex: 1,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  disclaimer: {
    fontSize: 14,
    marginTop: 16,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})