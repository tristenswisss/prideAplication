"use client"

import { useState, useEffect } from "react"
import { StyleSheet, Text, View, TouchableOpacity, Alert, SafeAreaView, FlatList } from "react-native"
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps"
import * as Location from "expo-location"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialIcons } from "@expo/vector-icons"
import { businessService } from "../../services/businessService"
import type { Business } from "../../types"
import type { HomeScreenProps } from "../../types/navigation"

interface Category {
  id: string
  name: string
  icon: string
  color: string
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([])
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [showMap, setShowMap] = useState(true)
  const [userLocation, setUserLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(null)
  const [isOfflineMode, setIsOfflineMode] = useState(false)

  const categories: Category[] = [
    { id: "all", name: "All", icon: "apps", color: "#FF6B6B" },
    { id: "restaurant", name: "Food", icon: "restaurant", color: "#4ECDC4" },
    { id: "bar", name: "Bars", icon: "local-bar", color: "#45B7D1" },
    { id: "healthcare", name: "Health", icon: "local-hospital", color: "#96CEB4" },
    { id: "shopping", name: "Shopping", icon: "shopping-bag", color: "#FFEAA7" },
    { id: "service", name: "Services", icon: "build", color: "#DDA0DD" },
    { id: "hotel", name: "Hotels", icon: "hotel", color: "#98D8C8" },
    { id: "entertainment", name: "Fun", icon: "local-play", color: "#F7DC6F" },
  ]

  useEffect(() => {
    loadBusinesses()
    getCurrentLocation()
  }, [])

  useEffect(() => {
    filterBusinesses()
  }, [selectedCategory, searchQuery, businesses])

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is needed to show nearby places")
        return
      }

      const location = await Location.getCurrentPositionAsync({})
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      })
    } catch (error) {
      console.error("Error getting location:", error)
      // Default to San Francisco for demo
      setUserLocation({
        latitude: 37.7749,
        longitude: -122.4194,
      })
    }
  }

  const loadBusinesses = async () => {
    try {
      setLoading(true)
      const data = await businessService.getAllBusinesses()
      setBusinesses(data)
    } catch (error) {
      console.error("Error loading businesses:", error)
      Alert.alert("Error", "Failed to load businesses")
    } finally {
      setLoading(false)
    }
  }

  const filterBusinesses = async () => {
    try {
      let filtered: Business[] = []

      if (searchQuery.trim()) {
        filtered = await businessService.searchBusinesses(searchQuery)
      } else if (selectedCategory === "all") {
        filtered = businesses
      } else {
        filtered = await businessService.getBusinessesByCategory(selectedCategory)
      }

      setFilteredBusinesses(filtered)
    } catch (error) {
      console.error("Error filtering businesses:", error)
    }
  }

  const getMarkerColor = (business: Business): string => {
    if (business.lgbtq_friendly && business.trans_friendly) return "#FF6B6B"
    if (business.lgbtq_friendly) return "#4ECDC4"
    return "#95E1D3"
  }

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[styles.categoryButton, selectedCategory === item.id && { backgroundColor: item.color }]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <MaterialIcons name={item.icon as any} size={16} color={selectedCategory === item.id ? "white" : item.color} />
      <Text
        style={[
          styles.categoryText,
          selectedCategory === item.id && { color: "white" },
          selectedCategory !== item.id && { color: item.color },
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  )

  const renderBusinessCard = ({ item }: { item: Business }) => (
    <TouchableOpacity
      style={styles.businessCard}
      onPress={() => navigation.navigate("BusinessDetails", { business: item })}
    >
      <View style={styles.businessHeader}>
        <Text style={styles.businessName}>{item.name}</Text>
        <View style={styles.businessRating}>
          <MaterialIcons name="star" size={16} color="#FFD700" />
          <Text style={styles.ratingText}>{item.rating}</Text>
        </View>
      </View>
      <Text style={styles.businessCategory}>{item.category.toUpperCase()}</Text>
      <Text style={styles.businessDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.businessTags}>
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
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#FF6B6B", "#4ECDC4"]} style={styles.header}>
        <Text style={styles.headerTitle}>SafePlaces</Text>
        <Text style={styles.headerSubtitle}>Find LGBTQ+ friendly spaces</Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TouchableOpacity style={styles.searchInputTouchable} onPress={() => navigation.navigate("Search")}>
            <Text style={styles.searchPlaceholder}>
              {isOfflineMode ? "Search offline..." : "Search safe places..."}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={getCurrentLocation} style={styles.locationButton}>
            <MaterialIcons name="my-location" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* View Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, showMap && styles.activeToggle]}
          onPress={() => setShowMap(true)}
        >
          <MaterialIcons name="map" size={18} color={showMap ? "white" : "#666"} />
          <Text style={[styles.toggleText, showMap && styles.activeToggleText]}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, !showMap && styles.activeToggle]}
          onPress={() => setShowMap(false)}
        >
          <MaterialIcons name="list" size={18} color={!showMap ? "white" : "#666"} />
          <Text style={[styles.toggleText, !showMap && styles.activeToggleText]}>List</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <FlatList
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryContainer}
      />

      {/* Map or List View */}
      {showMap ? (
        <View style={styles.mapContainer}>
          {userLocation && (
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
              showsUserLocation={true}
              showsMyLocationButton={false}
            >
              {filteredBusinesses.map((business) => (
                <Marker
                  key={business.id}
                  coordinate={{
                    latitude: business.latitude,
                    longitude: business.longitude,
                  }}
                  pinColor={getMarkerColor(business)}
                  title={business.name}
                  description={business.description}
                  onPress={() => navigation.navigate("BusinessDetails", { business })}
                />
              ))}
            </MapView>
          )}

          {/* Map Legend */}
          <View style={styles.legend}>
            <Text style={styles.legendTitle}>Legend</Text>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: "#FF6B6B" }]} />
              <Text style={styles.legendText}>LGBTQ+ & Trans Friendly</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: "#4ECDC4" }]} />
              <Text style={styles.legendText}>LGBTQ+ Friendly</Text>
            </View>
          </View>
        </View>
      ) : (
        <FlatList
          data={filteredBusinesses}
          renderItem={renderBusinessCard}
          keyExtractor={(item) => item.id}
          style={styles.businessList}
          contentContainerStyle={styles.businessListContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading businesses...</Text>
        </View>
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
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "white",
    opacity: 0.9,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 45,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  locationButton: {
    padding: 5,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 25,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 20,
  },
  activeToggle: {
    backgroundColor: "#FF6B6B",
  },
  toggleText: {
    marginLeft: 5,
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  activeToggleText: {
    color: "white",
  },
  categoryContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minWidth: 80,
    justifyContent: "center",
  },
  categoryText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  legend: {
    position: "absolute",
    bottom: 20,
    left: 20,
    backgroundColor: "white",
    padding: 12,
    borderRadius: 10,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 11,
    color: "#666",
  },
  businessList: {
    flex: 1,
  },
  businessListContent: {
    padding: 20,
  },
  businessCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  businessHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  businessName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  businessRating: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  businessCategory: {
    fontSize: 12,
    color: "#FF6B6B",
    fontWeight: "600",
    marginBottom: 8,
  },
  businessDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  businessTags: {
    flexDirection: "row",
    flexWrap: "wrap",
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
  tagText: {
    fontSize: 10,
    color: "white",
    fontWeight: "bold",
    marginLeft: 2,
  },
  loadingContainer: {
    position: "absolute",
    top: 200,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  loadingText: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 14,
    color: "#666",
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInputTouchable: {
    flex: 1,
    height: 45,
    justifyContent: "center",
  },
  searchPlaceholder: {
    fontSize: 16,
    color: "#666",
  },
})
