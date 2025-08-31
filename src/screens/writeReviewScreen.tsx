"use client"

import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from "react-native"
import AppModal from "../../components/AppModal"
import { MaterialIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { reviewService } from "../../services/reviewService"
import { useAuth } from "../../Contexts/AuthContexts"
import type { WriteReviewScreenProps } from "../../types/navigation"
import { useTheme } from "../../Contexts/ThemeContext"

export default function WriteReviewScreen({ route, navigation }: WriteReviewScreenProps) {
  const { business } = route.params
  const { user } = useAuth()
  const { theme } = useTheme()

  const [rating, setRating] = useState(0)
  const [safetyRating, setSafetyRating] = useState(0)
  const [inclusivityRating, setInclusivityRating] = useState(0)
  const [staffRating, setStaffRating] = useState(0)
  const [accessibilityRating, setAccessibilityRating] = useState(0)
  const [comment, setComment] = useState("")
  const [wouldRecommend, setWouldRecommend] = useState(true)
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<{ visible: boolean; title?: string; message?: string; onClose?: () => void }>(
    { visible: false },
  )

  const handleSubmit = async () => {
    if (rating === 0) {
      setModal({ visible: true, title: "Rating Required", message: "Please provide an overall rating" })
      return
    }

    if (safetyRating === 0 || inclusivityRating === 0 || staffRating === 0) {
      setModal({
        visible: true,
        title: "All Ratings Required",
        message: "Please rate safety, inclusivity, and staff friendliness",
      })
      return
    }

    if (!user) {
      setModal({ visible: true, title: "Error", message: "You must be signed in to write a review" })
      return
    }

    setLoading(true)
    try {
      await reviewService.addReview({
        business_id: business.id,
        user_id: user.id,
        rating,
        comment: comment.trim() || undefined,
        safety_rating: safetyRating,
        inclusivity_rating: inclusivityRating,
        staff_friendliness: staffRating,
        accessibility_rating: accessibilityRating,
        would_recommend: wouldRecommend,
        visit_date: new Date().toISOString().split("T")[0],
      })

      setModal({
        visible: true,
        title: "Success",
        message: "Your review has been submitted!",
        onClose: () => navigation.goBack(),
      })
    } catch (error) {
      console.error("Error submitting review:", error)
      setModal({ visible: true, title: "Error", message: "Failed to submit review. Please try again." })
    } finally {
      setLoading(false)
    }
  }

  const renderStarRating = (
    title: string,
    currentRating: number,
    onRatingChange: (rating: number) => void,
    color = theme.colors.accent,
  ) => (
    <View style={[styles.ratingSection, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.ratingTitle, { color: theme.colors.text }]}>{title}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => onRatingChange(star)}>
            <MaterialIcons
              name="star"
              size={32}
              color={star <= currentRating ? color : theme.colors.textTertiary}
              style={styles.star}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.colors.surface + '40' }]}>
            <MaterialIcons name="arrow-back" size={24} color={theme.colors.headerText} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.headerText }]}>Write Review</Text>
          <View style={styles.placeholder} />
        </View>
        <Text style={[styles.businessName, { color: theme.colors.headerText }]}>{business.name}</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Overall Rating */}
        {renderStarRating("Overall Rating", rating, setRating)}

        {/* Detailed Ratings */}
        {renderStarRating("Safety Rating", safetyRating, setSafetyRating, theme.colors.success)}
        {renderStarRating("Inclusivity Rating", inclusivityRating, setInclusivityRating, theme.colors.lgbtqFriendly)}
        {renderStarRating("Staff Friendliness", staffRating, setStaffRating, theme.colors.transFriendly)}
        {renderStarRating("Accessibility", accessibilityRating, setAccessibilityRating, theme.colors.warning)}

        {/* Written Review */}
        <View style={[styles.commentSection, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.commentTitle, { color: theme.colors.text }]}>Share Your Experience</Text>
          <TextInput
            style={[styles.commentInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, color: theme.colors.inputText }]}
            placeholder="Tell others about your experience at this place. What made it feel safe and welcoming?"
            placeholderTextColor={theme.colors.placeholder}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Recommendation */}
        <View /* recommendSection */ style={[styles.commentSection, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.recommendTitle, { color: theme.colors.text }]}>Would you recommend this place?</Text>
          <View style={styles.recommendButtons}>
            <TouchableOpacity
              style={[styles.recommendButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, wouldRecommend && [styles.recommendButtonActive, { backgroundColor: theme.colors.success, borderColor: theme.colors.success }]]}
              onPress={() => setWouldRecommend(true)}
            >
              <MaterialIcons name="thumb-up" size={20} color={wouldRecommend ? theme.colors.surface : theme.colors.success} />
              <Text style={[styles.recommendButtonText, { color: theme.colors.textSecondary }, wouldRecommend && [styles.recommendButtonTextActive, { color: theme.colors.surface }]]}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.recommendButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, !wouldRecommend && [styles.recommendButtonActive, { backgroundColor: theme.colors.error, borderColor: theme.colors.error }]]}
              onPress={() => setWouldRecommend(false)}
            >
              <MaterialIcons name="thumb-down" size={20} color={!wouldRecommend ? theme.colors.surface : theme.colors.error} />
              <Text style={[styles.recommendButtonText, { color: theme.colors.textSecondary }, !wouldRecommend && [styles.recommendButtonTextActive, { color: theme.colors.surface }]]}>No</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Guidelines */}
        <View style={[styles.guidelines, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.guidelinesTitle, { color: theme.colors.text }]}>Review Guidelines</Text>
          <Text style={[styles.guidelinesText, { color: theme.colors.textSecondary }]}>
            • Be honest and respectful{"\n"}• Focus on your personal experience{"\n"}• Help others understand what makes
            this place safe{"\n"}• Avoid discriminatory language
          </Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={[styles.submitContainer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.divider }]}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <View style={[styles.submitButtonGradient, { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.submitButtonText, { color: theme.colors.surface }]}>{loading ? "Submitting..." : "Submit Review"}</Text>
          </View>
        </TouchableOpacity>
      </View>
      <AppModal
        visible={modal.visible}
        onClose={() => {
          const next = modal.onClose
          setModal({ visible: false })
          if (next) next()
        }}
        title={modal.title}
        variant="center"
        rightAction={{
          label: "OK",
          onPress: () => {
            const next = modal.onClose
            setModal({ visible: false })
            if (next) next()
          },
        }}
      >
        <Text style={{ fontSize: 16, color: theme.colors.text }}>{modal.message}</Text>
      </AppModal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  placeholder: {
    width: 40,
  },
  businessName: {
    fontSize: 16,
    color: "white",
    opacity: 0.9,
    textAlign: "center",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  ratingSection: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: "center",
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
  },
  stars: {
    flexDirection: "row",
  },
  star: {
    marginHorizontal: 5,
  },
  commentSection: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  commentTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 13,
    marginBottom: 15,
  },
  recommendTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  recommendButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  recommendButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
  },
  recommendButtonActive: {
    // backgroundColor will be set inline
    // borderColor will be set inline
  },
  recommendButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
  },
  recommendButtonTextActive: {
    // color will be set inline
  },
  guidelines: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  guidelinesTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  guidelinesText: {
    fontSize: 12,
    lineHeight: 18,
  },
  submitContainer: {
    padding: 20,
    borderTopWidth: 1,
  },
  submitButton: {
    borderRadius: 25,
    overflow: "hidden",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: "bold",
  },
})
