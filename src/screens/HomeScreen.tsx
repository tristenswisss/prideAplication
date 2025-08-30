"use client"

import { useState, useEffect, useMemo } from "react"
import { StyleSheet, Text, View, TouchableOpacity, Alert, SafeAreaView, FlatList, ScrollView, Platform } from "react-native"
import MapView, { Marker } from "react-native-maps"
import * as Location from "expo-location"
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

const CONSTANTS = {
  MAP_ANIMATION_DURATION: 500,
  MAX_INITIAL_MARKERS: 200,
  DEFAULT_REGION: {
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  }
}

const BusinessMarker = React.memo(({ 
  business, 
  navigation 
}: { 
  business: Business
  navigation: any
}) => {
  return (
    <Marker
      coordinate={{
        latitude: business.latitude as number,
        longitude: business.longitude as number,
      }}
      onPress={() => {
        navigation.navigate("BusinessDetails", { business })
      }}
      tracksViewChanges={false}
      identifier={business.id}
      title={business.name}
      description={`${business.category} • ${business.rating ? business.rating + ' stars' : 'No rating'}`}
    />
  )
})

export default function HomeScreen({ navigation, route }: HomeScreenProps) {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([])
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [loading, setLoading] = useState(false)
  const [showMap, setShowMap] = useState(true)
  const [userLocation, setUserLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(null)

  const mapRef = React.useRef<MapView | null>(null)

  const validMarkers = useMemo(() => {
    return (filteredBusinesses || []).filter(
      (b): b is Business & { latitude: number; longitude: number } => {
        return typeof b.latitude === "number" && 
               Number.isFinite(b.latitude) && 
               typeof b.longitude === "number" && 
               Number.isFinite(b.longitude) &&
               b.latitude !== 0 && 
               b.longitude !== 0
      }
    )
  }, [filteredBusinesses])

  const initialMarkers = useMemo(() => validMarkers.slice(0, CONSTANTS.MAX_INITIAL_MARKERS), [validMarkers])

  // Calculate initial region - prioritize user location, fallback to markers, then default
  const calculateInitialRegion = () => {
    // Always prefer user location if available
    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }
    }

    // If no user location but have markers, center on markers
    if (validMarkers.length === 0) {
      return CONSTANTS.DEFAULT_REGION
    }

    const lats = validMarkers.map(m => m.latitude)
    const lngs = validMarkers.map(m => m.longitude)
    
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    
    const centerLat = (minLat + maxLat) / 2
    const centerLng = (minLng + maxLng) / 2
    const deltaLat = Math.max((maxLat - minLat) * 1.5, 0.01)
    const deltaLng = Math.max((maxLng - minLng) * 1.5, 0.01)
    
    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: deltaLat,
      longitudeDelta: deltaLng,
    }
  }

  const initialRegion = useMemo(() => calculateInitialRegion(), [userLocation, validMarkers])

  const mapKey = `${Platform.OS}-${userLocation ? 'withLoc' : 'noLoc'}-${validMarkers.length}`

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, Business[]> = {}
    for (const b of filteredBusinesses) {
      const cat = (b.category || "other").toLowerCase()
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(b)
    }
    return groups
  }, [filteredBusinesses])

  useEffect(() => {
    const lat = route?.params?.focusLat
    const lng = route?.params?.focusLng
    if (typeof lat === 'number' && typeof lng === 'number' && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 600)
      setShowMap(true)
    }
  }, [route?.params?.focusLat, route?.params?.focusLng])

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
    loadBusinesses()
    getCurrentLocation()
  }, [])

  useEffect(() => {
    filterBusinesses()
  }, [selectedCategory, businesses])

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is needed to show nearby places")
        return
      }

      const location = await Location.getCurrentPositionAsync({})
      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }
      setUserLocation(newLocation)
    } catch (error) {
      // Default to San Francisco for demo
      const defaultLocation = {
        latitude: CONSTANTS.DEFAULT_REGION.latitude,
        longitude: CONSTANTS.DEFAULT_REGION.longitude,
      }
      setUserLocation(defaultLocation)
    }
  }

  const loadBusinesses = async () => {
    try {
      setLoading(true)
      
      const response = await businessService.getBusinesses()

      if (response.success && response.businesses) {
        setBusinesses(response.businesses)
        setFilteredBusinesses(response.businesses)
      } else {
        Alert.alert("Error", response.error || "Failed to load businesses")
      }
    } catch (error) {
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

      if (selectedCategory === "all") {
        filtered = businesses
      } else {
        // First try client-side filtering from cached data
        const categoryMap: Record<string, string[]> = {
          finance: ["organization", "finance"],
          service: ["organization", "service"],
          hotel: ["other", "hotel"],
          restaurant: ["restaurant", "bar"],
          shopping: ["other", "shopping"],
          education: ["organization", "education"],
          entertainment: ["other", "entertainment"],
          transport: ["transport"],
          healthcare: ["healthcare"]
        }
        
        const allowedCategories = categoryMap[selectedCategory] || [selectedCategory]
        filtered = businesses.filter(b => 
          allowedCategories.includes(b.category?.toLowerCase()) ||
          b.category?.toLowerCase() === selectedCategory
        )
        
        // If client-side filtering gives no results, try server-side
        if (filtered.length === 0) {
          const resp = await businessService.getBusinessesByCategory(selectedCategory)
          filtered = resp.success && resp.businesses ? resp.businesses : []
        }
      }

      setFilteredBusinesses(filtered)
    } catch (error) {
      setFilteredBusinesses([])
    }
  }

  const renderBusinessCard = ({ item }: { item: Business }) => (
    <TouchableOpacity
      style={styles.businessCard}
      onPress={() => {
        navigation.navigate("BusinessDetails", { business: item })
      }}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.category}`}
      accessibilityHint="Double tap to view business details"
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

  const renderMapView = () => {
    return (
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
          {initialMarkers.map((business) => (
            <BusinessMarker
              key={business.id}
              business={business}
              navigation={navigation}
            />
          ))}
        </MapView>

        {/* Legend */}
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
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: "#95E1D3" }]} />
            <Text style={styles.legendText}>Other Safe Spaces</Text>
          </View>
        </View>

        {/* Floating action button for adding new places */}
        <TouchableOpacity 
          style={styles.floatingActionButton}
          onPress={() => navigation.navigate("SuggestSafeSpace" as never)}
          accessibilityRole="button"
          accessibilityLabel="Suggest a new safe space"
        >
          <MaterialIcons name="add-location" size={24} color="white" />
        </TouchableOpacity>
      </View>
    )
  }

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
          accessibilityRole="button"
          accessibilityLabel="Switch to map view"
        >
          <MaterialIcons name="map" size={18} color={showMap ? "white" : "#666"} />
          <Text style={[styles.toggleText, showMap && styles.activeToggleText]}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, !showMap && styles.activeToggle]}
          onPress={() => setShowMap(false)}
          accessibilityRole="button"
          accessibilityLabel="Switch to list view"
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
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${category.name}`}
              accessibilityHint="Double tap to filter businesses by this category"
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
            accessibilityRole="button"
            accessibilityLabel="Recommend a safe space"
          >
            <MaterialIcons name="add-location" size={16} color="white" />
            <Text style={[styles.categoryTabText, { color: "white" }]}>Recommend</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Map or List View */}
      {showMap ? renderMapView() : (
        <FlatList
          data={Object.keys(groupedByCategory)}
          renderItem={({ item: cat }) => (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", marginHorizontal: 16, marginBottom: 8 }}>
                {cat.toUpperCase()}
              </Text>
              {groupedByCategory[cat].map((biz: Business) => (
                <View key={biz.id} style={{ marginHorizontal: 16, marginBottom: 10 }}>
                  {renderBusinessCard({ item: biz })}
                </View>
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
              <Text style={styles.emptySubtext}>{!loading && "Try adjusting your category filter"}</Text>
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
  floatingActionButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
})