"use client"

import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { reviewService } from "../../services/reviewService"
import { useAuth } from "../../Contexts/AuthContexts"
import type { WriteReviewScreenProps } from "../../types/navigation"

export default function WriteReviewScreen({ route, navigation }: WriteReviewScreenProps) {
  const { business } = route.params
  const { user } = useAuth()

  const [rating, setRating] = useState(0)
  const [safetyRating, setSafetyRating] = useState(0)
  const [inclusivityRating, setInclusivityRating] = useState(0)
  const [staffRating, setStaffRating] = useState(0)
  const [accessibilityRating, setAccessibilityRating] = useState(0)
  const [comment, setComment] = useState("")
  const [wouldRecommend, setWouldRecommend] = useState(true)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Rating Required", "Please provide an overall rating")
      return
    }

    if (safetyRating === 0 || inclusivityRating === 0 || staffRating === 0) {
      Alert.alert("All Ratings Required", "Please rate safety, inclusivity, and staff friendliness")
      return
    }

    if (!user) {
      Alert.alert("Error", "You must be signed in to write a review")
      return
    }

    setLoading(true)
    try {
      await reviewService.addReview({
        business_id: business.id,
        user_id: user.id,
        user: {
          id: user.id,
          name: user.name,
          email: user.email || "",
          verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        rating,
        comment: comment.trim() || undefined,
        safety_rating: safetyRating,
        inclusivity_rating: inclusivityRating,
        staff_friendliness: staffRating,
        accessibility_rating: accessibilityRating,
        would_recommend: wouldRecommend,
        visit_date: new Date().toISOString().split("T")[0],
      })

      Alert.alert("Success", "Your review has been submitted!", [{ text: "OK", onPress: () => navigation.goBack() }])
    } catch (error) {
      console.error("Error submitting review:", error)
      Alert.alert("Error", "Failed to submit review. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const renderStarRating = (
    title: string,
    currentRating: number,
    onRatingChange: (rating: number) => void,
    color = "#FFD700",
  ) => (
    <View style={styles.ratingSection}>
      <Text style={styles.ratingTitle}>{title}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => onRatingChange(star)}>
            <MaterialIcons
              name="star"
              size={32}
              color={star <= currentRating ? color : "#E0E0E0"}
              style={styles.star}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["black", "black"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Write Review</Text>
          <View style={styles.placeholder} />
        </View>
        <Text style={styles.businessName}>{business.name}</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Overall Rating */}
        {renderStarRating("Overall Rating", rating, setRating)}

        {/* Detailed Ratings */}
        {renderStarRating("Safety Rating", safetyRating, setSafetyRating, "#4CAF50")}
        {renderStarRating("Inclusivity Rating", inclusivityRating, setInclusivityRating, "#FF6B6B")}
        {renderStarRating("Staff Friendliness", staffRating, setStaffRating, "#4ECDC4")}
        {renderStarRating("Accessibility", accessibilityRating, setAccessibilityRating, "#FFA726")}

        {/* Written Review */}
        <View style={styles.commentSection}>
          <Text style={styles.commentTitle}>Share Your Experience</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Tell others about your experience at this place. What made it feel safe and welcoming?"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Recommendation */}
        <View /* recommendSection */ style={styles.commentSection}>
          <Text style={styles.recommendTitle}>Would you recommend this place?</Text>
          <View style={styles.recommendButtons}>
            <TouchableOpacity
              style={[styles.recommendButton, wouldRecommend && styles.recommendButtonActive]}
              onPress={() => setWouldRecommend(true)}
            >
              <MaterialIcons name="thumb-up" size={20} color={wouldRecommend ? "white" : "#4CAF50"} />
              <Text style={[styles.recommendButtonText, wouldRecommend && styles.recommendButtonTextActive]}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.recommendButton, !wouldRecommend && styles.recommendButtonActive]}
              onPress={() => setWouldRecommend(false)}
            >
              <MaterialIcons name="thumb-down" size={20} color={!wouldRecommend ? "white" : "#F44336"} />
              <Text style={[styles.recommendButtonText, !wouldRecommend && styles.recommendButtonTextActive]}>No</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Guidelines */}
        <View style={styles.guidelines}>
          <Text style={styles.guidelinesTitle}>Review Guidelines</Text>
          <Text style={styles.guidelinesText}>
            • Be honest and respectful{"\n"}• Focus on your personal experience{"\n"}• Help others understand what makes
            this place safe{"\n"}• Avoid discriminatory language
          </Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.submitContainer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <LinearGradient colors={["black", "black"]} style={styles.submitButtonGradient}>
            <Text style={styles.submitButtonText}>{loading ? "Submitting..." : "Submit Review"}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
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
    backgroundColor: "black",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: "center",
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "gold",
    marginBottom: 15,
  },
  stars: {
    flexDirection: "row",
  },
  star: {
    marginHorizontal: 5,
  },
  commentSection: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  commentTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "black",
    marginBottom: 15,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "black",
    borderRadius: 8,
    padding: 13,
    marginBottom: 15,
  },
  recommendTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
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
    borderColor: "#E0E0E0",
    backgroundColor: "white",
  },
  recommendButtonActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  recommendButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  recommendButtonTextActive: {
    color: "white",
  },
  guidelines: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  guidelinesTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  guidelinesText: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
  submitContainer: {
    padding: 20,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
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
    color: "white",
  },
})
