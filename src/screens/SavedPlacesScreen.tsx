"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Alert, Image } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialIcons } from "@expo/vector-icons"
import { businessService } from "../../services/businessService"
import { useAuth } from "../../Contexts/AuthContexts"
import type { Business } from "../../types"
import type { SavedPlacesScreenProps } from "../../types/navigation"

interface SavedPlace extends Business {
  savedAt?: string
  notes?: string
}

export default function SavedPlacesScreen({ navigation }: SavedPlacesScreenProps) {
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "visited" | "wishlist">("all")

  const { user } = useAuth()

  useEffect(() => {
    loadSavedPlaces()
  }, [])

  const loadSavedPlaces = async () => {
    if (!user) return

    try {
      setLoading(true)
      const result = await businessService.getSavedBusinesses(user.id)

                if (result.success && result.businesses) {
            setSavedPlaces(result.businesses)
          } else {
            console.error("Error loading saved places:", result.error)
            Alert.alert("Error", "Failed to load saved places")
          }
} catch (error) {
      console.error("Error loading saved places:", error)
      Alert.alert("Error", "Failed to load saved places")
    } finally {
      setLoading(false)
    }
  }

  const removeSavedPlace = (placeId: string) => {
    Alert.alert("Remove Place", "Are you sure you want to remove this place from your saved list?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          if (!user) return

          try {
            await businessService.saveBusiness(placeId, user.id)
            setSavedPlaces((prev) => prev.filter((place) => place.id !== placeId))
            Alert.alert("Success", "Place removed from saved list")
          } catch (error) {
            console.error("Error removing saved place:", error)
            Alert.alert("Error", "Failed to remove place")
          }
        },
      },
    ])
  }

  const renderSavedPlace = ({ item }: { item: SavedPlace }) => (
    <TouchableOpacity
      style={styles.placeCard}
      onPress={() => (navigation as any).navigate("Home", { screen: "BusinessDetails", params: { business: item } })}
    >
      <View style={styles.placeImageContainer}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.placeImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <MaterialIcons name="place" size={40} color="#ccc" />
          </View>
        )}
        <TouchableOpacity style={styles.removeButton} onPress={() => removeSavedPlace(item.id)}>
          <MaterialIcons name="favorite" size={20} color="black" />
        </TouchableOpacity>
      </View>

      <View style={styles.placeInfo}>
        <View style={styles.placeHeader}>
          <Text style={styles.placeName}>{item.name}</Text>
          <View style={styles.ratingContainer}>
            <MaterialIcons name="star" size={16} color="#FFD700" />
                         <Text style={styles.rating}>{item.rating ?? 0}</Text>
</View>
        </View>

        <Text style={styles.placeCategory}>{item.category.toUpperCase()}</Text>
        <Text style={styles.placeDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.placeTags}>
          {item.lgbtq_friendly && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>LGBTQ+ Friendly</Text>
            </View>
          )}
          {item.trans_friendly && (
            <View style={[styles.tag, styles.transTag]}>
              <Text style={styles.tagText}>Trans Friendly</Text>
            </View>
          )}
          {item.verified && (
            <View style={[styles.tag, styles.verifiedTag]}>
              <MaterialIcons name="verified" size={12} color="white" />
              <Text style={styles.tagText}>Verified</Text>
            </View>
          )}
          {item.wheelchair_accessible && (
            <View style={[styles.tag, styles.accessibleTag]}>
              <MaterialIcons name="accessible" size={12} color="white" />
              <Text style={styles.tagText}>Accessible</Text>
            </View>
          )}
        </View>

        {item.notes && (
          <View style={styles.notesContainer}>
            <MaterialIcons name="note" size={14} color="#666" />
            <Text style={styles.notes}>{item.notes}</Text>
          </View>
        )}

        {item.savedAt && <Text style={styles.savedDate}>Saved on {new Date(item.savedAt).toLocaleDateString()}</Text>}
      </View>
    </TouchableOpacity>
  )

  const filteredPlaces = savedPlaces.filter((place) => {
    if (filter === "all") return true
    // Add filtering logic based on visited/wishlist status
    return true
  })

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["black", "black"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Saved Places</Text>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {["all", "visited", "wishlist"].map((filterOption) => (
          <TouchableOpacity
            key={filterOption}
            style={[styles.filterTab, filter === filterOption && styles.activeFilterTab]}
            onPress={() => setFilter(filterOption as typeof filter)}
          >
            <Text style={[styles.filterTabText, filter === filterOption && styles.activeFilterTabText]}>
              {filterOption === "all" ? "All" : filterOption === "visited" ? "Visited" : "Wishlist"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading saved places...</Text>
        </View>
      ) : filteredPlaces.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="bookmark-border" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No Saved Places</Text>
          <Text style={styles.emptyDescription}>Start exploring and save your favorite LGBTQ+ friendly places!</Text>
          <TouchableOpacity style={styles.exploreButton} onPress={() => (navigation as any).navigate("Home")}>
            <Text style={styles.exploreButtonText}>Explore Places</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredPlaces}
          renderItem={renderSavedPlace}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    flex: 1,
    textAlign: "center",
  },
  headerRight: {
    width: 40,
  },
  filterContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 25,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 20,
  },
  activeFilterTab: {
    backgroundColor: "black",
  },
  filterTabText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  activeFilterTabText: {
    color: "white",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  exploreButton: {
    backgroundColor: "black",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  exploreButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  listContainer: {
    padding: 20,
  },
  placeCard: {
    backgroundColor: "white",
    borderRadius: 15,
    marginBottom: 15,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  placeImageContainer: {
    position: "relative",
  },
  placeholderImage: {
    height: 150,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  placeImage: {
    height: 150,
    width: "100%",
  },
  removeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  placeInfo: {
    padding: 15,
  },
  placeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  placeName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  rating: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  placeCategory: {
    fontSize: 12,
    color: "#FF6B6B",
    fontWeight: "600",
    marginBottom: 8,
  },
  placeDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  placeTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
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
  verifiedTag: {
    backgroundColor: "#4CAF50",
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
  notesContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "#f8f8f8",
    padding: 8,
    borderRadius: 8,
  },
  notes: {
    marginLeft: 6,
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  savedDate: {
    fontSize: 12,
    color: "#999",
  },
})
