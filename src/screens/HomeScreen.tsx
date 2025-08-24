"use client"

import { useState, useEffect, useMemo } from "react"
import { StyleSheet, Text, View, TouchableOpacity, Alert, SafeAreaView, FlatList, ScrollView, Platform } from "react-native"
import MapView, { Marker, Callout } from "react-native-maps"
import * as Location from "expo-location"
import Constants from "expo-constants"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialIcons } from "@expo/vector-icons"
import { businessService } from "../../services/businessService"
import type { Business } from "../../types"
import type { HomeScreenProps } from "../../types/navigation"
import React from "react"

interface Category {
  id: string
  name: string
  icon: string
  color: string
}

export default function HomeScreen({ navigation, route }: HomeScreenProps) {
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
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)

  // Always use default provider
  const mapRef = React.useRef<MapView | null>(null)

  const initialRegion = useMemo(() => ({
    latitude: userLocation?.latitude ?? 37.7749,
    longitude: userLocation?.longitude ?? -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  }), [userLocation])

  const mapKey = `${Platform.OS}-${userLocation ? 'withLoc' : 'noLoc'}`

  useEffect(() => {
    const lat = route?.params?.focusLat
    const lng = route?.params?.focusLng
    const focusId = route?.params?.focusBusinessId
    if (focusId) setSelectedBusinessId(focusId)
    if (typeof lat === 'number' && typeof lng === 'number' && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 600)
      setShowMap(true)
    }
  }, [route?.params?.focusLat, route?.params?.focusLng, route?.params?.focusBusinessId])

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, Business[]> = {}
    for (const b of filteredBusinesses) {
      const cat = (b.category || "other").toLowerCase()
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(b)
    }
    return groups
  }, [filteredBusinesses])

  const validMarkers = useMemo(() => {
    return (filteredBusinesses || []).filter(
      (b) => typeof b.latitude === "number" && Number.isFinite(b.latitude!) && typeof b.longitude === "number" && Number.isFinite(b.longitude!),
    )
  }, [filteredBusinesses])

  const initialMarkers = useMemo(() => validMarkers.slice(0, 200), [validMarkers])

  const categories: Category[] = [
    { id: "all", name: "All", icon: "apps", color: "black" },
    { id: "transport", name: "Transport", icon: "directions-car", color: "#F7DC6F" },
    { id: "education", name: "Education", icon: "school", color: "red" },
    { id: "restaurant", name: "Food", icon: "restaurant", color: "#4ECDC4" },
    { id: "finance", name: "Finance", icon: "business", color: "gold" },
    { id: "healthcare", name: "Health", icon: "local-hospital", color: "green" },
    { id: "shopping", name: "Shopping", icon: "shopping-bag", color: "#FFEAA7" },
    { id: "service", name: "Services", icon: "build", color: "#DDA0DD" },
    { id: "hotel", name: "Accommodation", icon: "hotel", color: "#98D8C8" },
  ]

  useEffect(() => {
    // Fetch fresh first to avoid stale cache hiding DB data
    loadBusinesses(true)
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

  const loadBusinesses = async (fresh = false) => {
    try {
      setLoading(true)
      const response = fresh ? await businessService.getBusinessesFresh() : await businessService.getBusinesses()

      if (response.success && response.businesses) {
        setBusinesses(response.businesses)
        setFilteredBusinesses(response.businesses) // Initialize filtered businesses
      } else {
        console.error("Error loading businesses:", response.error)
        Alert.alert("Error", response.error || "Failed to load businesses")
      }
    } catch (error) {
      console.error("Error loading businesses:", error)
      Alert.alert("Error", "Failed to load businesses")
      setBusinesses([])
      setFilteredBusinesses([])
    } finally {
      setLoading(false)
    }
  }

  const filterBusinesses = async () => {
    try {
      let filtered: Business[] = []

      if (searchQuery.trim()) {
        const response = await businessService.searchBusinesses({ query: searchQuery })
        if (response.success && response.businesses) {
          filtered = response.businesses
        }
      } else {
        if (selectedCategory === "all") {
          filtered = businesses
        } else {
          // Use service to map UI category -> backend category and fetch
          const resp = await businessService.getBusinessesByCategory(selectedCategory)
          filtered = resp.success && resp.businesses ? resp.businesses : []
        }
      }

      setFilteredBusinesses(filtered)
    } catch (error) {
      console.error("Error filtering businesses:", error)
      setFilteredBusinesses([])
    }
  }

  const getMarkerColor = (business: Business): string => {
    if (business.lgbtq_friendly && business.trans_friendly) return "#FF6B6B"
    if (business.lgbtq_friendly) return "#4ECDC4"
    return "#95E1D3"
  }

  const renderBusinessCard = ({ item }: { item: Business }) => (
    <TouchableOpacity
      style={styles.businessCard}
      onPress={() => {
        if (typeof item.latitude === 'number' && typeof item.longitude === 'number') {
          setSelectedBusinessId(item.id)
          setShowMap(true)
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: item.latitude as number,
              longitude: item.longitude as number,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }, 500)
          }
        }
      }}
    >
      <View style={styles.businessHeader}>
        <Text style={styles.businessName}>{item.name}</Text>
        <View style={styles.businessRating}>
          <MaterialIcons name="star" size={16} color="#FFD700" />
          <Text style={styles.ratingText}>{item.rating || "N/A"}</Text>
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
      <LinearGradient colors={["black", "black"]} style={styles.header}>
        <Text style={styles.headerTitle}>SafePlaces</Text>
        <Text style={styles.headerSubtitle}>Find LGBTQ+ friendly spaces</Text>
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
      <View style={styles.categoryTabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryTabsContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryTab, selectedCategory === category.id && { backgroundColor: category.color }]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <MaterialIcons
                name={category.icon as any}
                size={16}
                color={selectedCategory === category.id ? "white" : category.color}
              />
              <Text
                style={[
                  styles.categoryTabText,
                  selectedCategory === category.id && { color: "white" },
                  selectedCategory !== category.id && { color: category.color },
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.categoryTab, { backgroundColor: "#4CAF50" }]}
                          onPress={() => navigation.navigate("SuggestSafeSpace" as never)}
>
            <MaterialIcons name="add-location" size={16} color="white" />
            <Text style={[styles.categoryTabText, { color: "white" }]}>Recommend</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Map or List View */}
      {showMap ? (
        <View style={styles.mapContainer}>
          <MapView
            key={mapKey}
            ref={(ref) => { mapRef.current = ref }}
            style={styles.map}
            initialRegion={initialRegion}
            showsUserLocation={true}
            showsMyLocationButton={true}
            showsCompass={true}
            showsScale={true}
            zoomEnabled={true}
            scrollEnabled={true}
            rotateEnabled={true}
            pitchEnabled={true}
            toolbarEnabled={true}
            mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
          >
            {initialMarkers.map((business) => {
              const isSelected = selectedBusinessId === business.id
              return (
                <Marker
                  key={business.id}
                  coordinate={{
                    latitude: business.latitude as number,
                    longitude: business.longitude as number,
                  }}
                  pinColor={isSelected ? "#FF6B6B" : getMarkerColor(business)}
                  image={isSelected ? require("../../assets/icon.png") : undefined}
                  title={business.name}
                  description={business.address || business.description}
                  onPress={() => {
                    setSelectedBusinessId(business.id)
                  }}
                  tracksViewChanges={false}
                  draggable={false}
                  zIndex={isSelected ? 10 : 1}
                >
                  {isSelected && (
                    <Callout onPress={() => navigation.navigate("BusinessDetails", { business })}>
                      <View style={{ maxWidth: 220 }}>
                        <Text style={{ fontWeight: "700", marginBottom: 4 }}>{business.name}</Text>
                        {business.address ? (
                          <Text numberOfLines={2} style={{ color: "#555" }}>{business.address}</Text>
                        ) : null}
                        <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center" }}>
                          <MaterialIcons name="info" size={14} color="#333" />
                          <Text style={{ marginLeft: 6, color: "#333" }}>Tap to view details</Text>
                        </View>
                      </View>
                    </Callout>
                  )}
                </Marker>
              )
            })}
          </MapView>

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
          data={Object.keys(groupedByCategory)}
          renderItem={({ item: cat }) => (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", marginHorizontal: 16, marginBottom: 8 }}>
                {cat.toUpperCase()}
              </Text>
              {groupedByCategory[cat].map((biz) => (
                <View key={biz.id} style={{ marginHorizontal: 16, marginBottom: 10 }}>{renderBusinessCard({ item: biz })}</View>
              ))}
            </View>
          )}
          keyExtractor={(cat) => cat}
          style={styles.businessList}
          contentContainerStyle={styles.businessListContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="business" size={64} color="#ccc" />
              <Text style={styles.emptyText}>{loading ? "Loading businesses..." : "No businesses found"}</Text>
              <Text style={styles.emptySubtext}>{!loading && "Try adjusting your search or category filter"}</Text>
            </View>
          }
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
    paddingTop: 30,
    paddingBottom: 15,
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
    marginHorizontal: 10,
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
    backgroundColor: "black",
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
  mapContainer: {
    flex: 1,
    flexGrow: 1,
    height: "100%",
    position: "relative",
    zIndex: 1,
  },
  map: {
    flex: 1,
    height: "100%",
    width: "100%",
    zIndex: 1,
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
    zIndex: 10,
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
  categoryTabsContainer: {
    height: 50,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  categoryTabsContent: {
    alignItems: "center",
    paddingVertical: 5,
  },
  categoryTab: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    marginRight: 8,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minWidth: 0,
    justifyContent: "center",
  },
  categoryTabText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 40,
  },
})
