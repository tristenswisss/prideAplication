"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Linking,
  FlatList,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { reviewService } from "../../services/reviewService"
import { useAuth } from "../../Contexts/AuthContexts"
import type { Review } from "../../types"
import type { BusinessDetailsScreenProps } from "../../types/navigation"

export default function BusinessDetailsScreen({ route, navigation }: BusinessDetailsScreenProps) {
  const { business } = route.params
  const { user } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [ratings, setRatings] = useState({
    overall: 0,
    safety: 0,
    inclusivity: 0,
    staff: 0,
    accessibility: 0,
    count: 0,
  })
  const [loading, setLoading] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)

  useEffect(() => {
    loadReviews()
    loadRatings()
  }, [])

  const loadReviews = async () => {
    try {
      setLoading(true)
      const data = await reviewService.getBusinessReviews(business.id)
      setReviews(data)
    } catch (error) {
      console.error("Error loading reviews:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadRatings = async () => {
    try {
      const data = await reviewService.getBusinessRatings(business.id)
      setRatings(data)
    } catch (error) {
      console.error("Error loading ratings:", error)
    }
  }

  const handleCall = () => {
    if (business.phone) {
      Linking.openURL(`tel:${business.phone}`)
    } else {
      Alert.alert("No Phone Number", "This business hasn't provided a phone number")
    }
  }

  const handleWebsite = () => {
    if (business.website) {
      Linking.openURL(business.website)
    } else {
      Alert.alert("No Website", "This business hasn't provided a website")
    }
  }

  const handleDirections = () => {
    const url = `https://maps.google.com/?q=${business.latitude},${business.longitude}`
    Linking.openURL(url)
  }

  const handleShare = () => {
    Alert.alert("Share Business", "Share functionality would be implemented here")
  }

  const handleWriteReview = () => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to write a review")
      return
    }
    navigation.navigate("WriteReview", { business })
  }

  const handleMarkHelpful = async (reviewId: string) => {
    try {
      await reviewService.markReviewHelpful(reviewId)
      loadReviews() // Refresh reviews to show updated helpful count
    } catch (error) {
      Alert.alert("Error", "Failed to mark review as helpful")
    }
  }

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite)
    // In a real app, this would save to backend
  }

  const renderRatingBar = (label: string, rating: number, color: string) => (
    <View style={styles.ratingBar}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.ratingBarContainer}>
        <View style={[styles.ratingBarFill, { width: `${(rating / 5) * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
    </View>
  )

  const renderReview = ({ item }: { item: Review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Image source={{ uri: item.user?.avatar_url }} style={styles.reviewAvatar} />
        <View style={styles.reviewUserInfo}>
          <View style={styles.reviewUserName}>
            <Text style={styles.reviewUserNameText}>{item.user?.name}</Text>
            {item.user?.verified && <MaterialIcons name="verified" size={16} color="#4CAF50" />}
          </View>
          <View style={styles.reviewRating}>
            {[...Array(5)].map((_, index) => (
              <MaterialIcons key={index} name="star" size={14} color={index < item.rating ? "#FFD700" : "#E0E0E0"} />
            ))}
            <Text style={styles.reviewDate}> • {new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
        </View>
      </View>

      {item.comment && <Text style={styles.reviewComment}>{item.comment}</Text>}

      <View style={styles.reviewDetails}>
        <View style={styles.reviewDetailItem}>
          <Text style={styles.reviewDetailLabel}>Safety: </Text>
          <Text style={styles.reviewDetailValue}>{item.safety_rating}/5</Text>
        </View>
        <View style={styles.reviewDetailItem}>
          <Text style={styles.reviewDetailLabel}>Inclusivity: </Text>
          <Text style={styles.reviewDetailValue}>{item.inclusivity_rating}/5</Text>
        </View>
        <View style={styles.reviewDetailItem}>
          <Text style={styles.reviewDetailLabel}>Staff: </Text>
          <Text style={styles.reviewDetailValue}>{item.staff_friendliness}/5</Text>
        </View>
      </View>

      <View style={styles.reviewActions}>
        <TouchableOpacity style={styles.helpfulButton} onPress={() => handleMarkHelpful(item.id)}>
          <MaterialIcons name="thumb-up" size={16} color="#666" />
          <Text style={styles.helpfulText}>Helpful ({item.helpful_count})</Text>
        </TouchableOpacity>
        {item.would_recommend && (
          <View style={styles.recommendBadge}>
            <MaterialIcons name="recommend" size={14} color="#4CAF50" />
            <Text style={styles.recommendText}>Recommends</Text>
          </View>
        )}
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header Image */}
        <View style={styles.imageContainer}>
          {business.image_url ? (
            <Image source={{ uri: business.image_url }} style={styles.headerImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <MaterialIcons name="business" size={80} color="#ccc" />
            </View>
          )}
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)"]} style={styles.imageOverlay}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.topRightButtons}>
              <TouchableOpacity style={styles.iconButton} onPress={toggleFavorite}>
                <MaterialIcons name={isFavorite ? "favorite" : "favorite-border"} size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
                <MaterialIcons name="share" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Business Info */}
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{business.name}</Text>
              {business.verified && <MaterialIcons name="verified" size={24} color="#4CAF50" />}
            </View>
            <Text style={styles.category}>{business.category.replace("_", " ").toUpperCase()}</Text>
          </View>

          {/* Rating Summary */}
          <View style={styles.ratingSection}>
            <View style={styles.overallRating}>
              <Text style={styles.ratingNumber}>{ratings.overall.toFixed(1)}</Text>
              <View style={styles.stars}>
                {[...Array(5)].map((_, index) => (
                  <MaterialIcons
                    key={index}
                    name="star"
                    size={20}
                    color={index < Math.floor(ratings.overall) ? "#FFD700" : "#E0E0E0"}
                  />
                ))}
              </View>
              <Text style={styles.reviewCount}>({ratings.count} reviews)</Text>
            </View>

            <View style={styles.ratingBars}>
              {renderRatingBar("Safety", ratings.safety, "#4CAF50")}
              {renderRatingBar("Inclusivity", ratings.inclusivity, "#FF6B6B")}
              {renderRatingBar("Staff", ratings.staff, "#4ECDC4")}
              {renderRatingBar("Accessibility", ratings.accessibility, "#FFA726")}
            </View>
          </View>

          {/* Tags */}
          <View style={styles.tagsSection}>
            {business.lgbtq_friendly && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>LGBTQ+ Friendly</Text>
              </View>
            )}
            {business.trans_friendly && (
              <View style={[styles.tag, styles.transTag]}>
                <Text style={styles.tagText}>Trans Friendly</Text>
              </View>
            )}
            {business.wheelchair_accessible && (
              <View style={[styles.tag, styles.accessibleTag]}>
                <MaterialIcons name="accessible" size={12} color="white" />
                <Text style={styles.tagText}>Accessible</Text>
              </View>
            )}
          </View>

          {/* Description */}
          <Text style={styles.description}>{business.description}</Text>

          {/* Contact Info */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Information</Text>
            <View style={styles.infoItem}>
              <MaterialIcons name="location-on" size={20} color="#666" />
              <Text style={styles.infoText}>{business.address}</Text>
            </View>
            {business.phone && (
              <View style={styles.infoItem}>
                <MaterialIcons name="phone" size={20} color="#666" />
                <Text style={styles.infoText}>{business.phone}</Text>
              </View>
            )}
            {business.website && (
              <View style={styles.infoItem}>
                <MaterialIcons name="language" size={20} color="#666" />
                <Text style={styles.infoText}>{business.website}</Text>
              </View>
            )}
          </View>

          {/* Reviews */}
          <View style={styles.reviewsSection}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              <TouchableOpacity style={styles.writeReviewButton} onPress={handleWriteReview}>
                <MaterialIcons name="edit" size={16} color="#FF6B6B" />
                <Text style={styles.writeReviewText}>Write Review</Text>
              </TouchableOpacity>
            </View>

            {reviews.length > 0 ? (
              <FlatList
                data={reviews}
                renderItem={renderReview}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            ) : (
              <Text style={styles.noReviews}>No reviews yet. Be the first to review!</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
          <MaterialIcons name="phone" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleDirections}>
          <MaterialIcons name="directions" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Directions</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleWebsite}>
          <MaterialIcons name="language" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Website</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  imageContainer: {
    position: "relative",
  },
  headerImage: {
    width: "100%",
    height: 250,
    backgroundColor: "#f0f0f0",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    paddingTop: 50,
  },
  placeholderImage: {
    width: "100%",
    height: 250,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  topRightButtons: {
    flexDirection: "row",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 15,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginRight: 10,
    flex: 1,
  },
  category: {
    fontSize: 14,
    color: "#FF6B6B",
    fontWeight: "600",
  },
  ratingSection: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  overallRating: {
    alignItems: "center",
    marginBottom: 15,
  },
  ratingNumber: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#333",
  },
  stars: {
    flexDirection: "row",
    marginVertical: 5,
  },
  reviewCount: {
    fontSize: 14,
    color: "#666",
  },
  ratingBars: {
    marginTop: 10,
  },
  ratingBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingLabel: {
    fontSize: 14,
    color: "#333",
    width: 80,
  },
  ratingBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    marginHorizontal: 10,
  },
  ratingBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  ratingValue: {
    fontSize: 14,
    color: "#333",
    width: 30,
    textAlign: "right",
  },
  tagsSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 15,
  },
  tag: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  transTag: {
    backgroundColor: "#4ECDC4",
  },
  accessibleTag: {
    backgroundColor: "#FFA726",
  },
  tagText: {
    fontSize: 10,
    color: "white",
    fontWeight: "bold",
    marginLeft: 2,
  },
  description: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
    marginBottom: 25,
  },
  infoSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: "#666",
    marginLeft: 15,
    flex: 1,
  },
  reviewsSection: {
    marginBottom: 25,
  },
  reviewsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  writeReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#FF6B6B",
  },
  writeReviewText: {
    color: "#FF6B6B",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  reviewCard: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ddd",
  },
  reviewUserInfo: {
    flex: 1,
    marginLeft: 10,
  },
  reviewUserName: {
    flexDirection: "row",
    alignItems: "center",
  },
  reviewUserNameText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginRight: 5,
  },
  reviewRating: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: "#666",
  },
  reviewComment: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginBottom: 10,
  },
  reviewDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  reviewDetailItem: {
    flexDirection: "row",
    marginRight: 15,
    marginBottom: 5,
  },
  reviewDetailLabel: {
    fontSize: 12,
    color: "#666",
  },
  reviewDetailValue: {
    fontSize: 12,
    color: "#333",
    fontWeight: "600",
  },
  reviewActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  helpfulButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  helpfulText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  recommendBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendText: {
    fontSize: 10,
    color: "#4CAF50",
    fontWeight: "600",
    marginLeft: 2,
  },
  noReviews: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
    marginVertical: 20,
  },
  bottomActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  actionButton: {
    backgroundColor: "#FF6B6B",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 100,
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 5,
  },
})
