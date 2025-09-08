"use client"

import { useState, useEffect, useMemo } from "react"
import { StyleSheet, Text, View, TouchableOpacity, Alert, SafeAreaView, FlatList, ScrollView, Platform } from "react-native"
import MapView, { Marker } from "react-native-maps"
import * as Location from "expo-location"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialIcons } from "@expo/vector-icons"
import { businessService } from "../../services/businessService"
import { safeSpacesService } from "../../services/safeSpacesService"
import type { Business } from "../../types"
import type { SafeSpace } from "../../types"
import type { HomeScreenProps } from "../../types/navigation"
import React from "react"
import { useTheme } from "../../Contexts/ThemeContext"
import { createThemedStyles } from "../../lib/themeUtils"

interface Category {
  id: string
  name: string
  icon: string
  color: string
}

interface Place {
  id: string
  name: string
  latitude: number
  longitude: number
  category: string
  description?: string
  type: 'business' | 'safe_space'
  originalData: Business | SafeSpace
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
  place,
  navigation
}: {
  place: Place
  navigation: any
}) => {
  return (
    <Marker
      coordinate={{
        latitude: place.latitude,
        longitude: place.longitude,
      }}
      onPress={() => {
        if (place.type === 'business') {
          navigation.navigate("BusinessDetails", { business: place.originalData })
        } else {
          // For safe spaces, we might want to navigate to a different screen or show details
          // For now, let's navigate to BusinessDetails with the safe space data
          navigation.navigate("BusinessDetails", { business: place.originalData })
        }
      }}
      tracksViewChanges={false}
      identifier={place.id}
      title={place.name}
      description={`${place.category}${place.type === 'safe_space' ? ' (Safe Space)' : ''}`}
      pinColor={place.type === 'safe_space' ? '#4ECDC4' : '#FF6B6B'}
    />
  )
})

export default function HomeScreen({ navigation, route }: HomeScreenProps) {
  const { theme } = useTheme()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [safeSpaces, setSafeSpaces] = useState<SafeSpace[]>([])
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([])
  const [filteredSafeSpaces, setFilteredSafeSpaces] = useState<SafeSpace[]>([])
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [loading, setLoading] = useState(false)
  const [showMap, setShowMap] = useState(true)
  const [userLocation, setUserLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(null)

  const mapRef = React.useRef<MapView | null>(null)

  const validMarkers = useMemo(() => {
    const businessMarkers: Place[] = (filteredBusinesses || []).filter(
      (b): b is Business & { latitude: number; longitude: number } => {
        return typeof b.latitude === "number" &&
               Number.isFinite(b.latitude) &&
               typeof b.longitude === "number" &&
               Number.isFinite(b.longitude) &&
               b.latitude !== 0 &&
               b.longitude !== 0
      }
    ).map(b => ({
      id: b.id,
      name: b.name,
      latitude: b.latitude,
      longitude: b.longitude,
      category: b.category,
      description: b.description,
      type: 'business' as const,
      originalData: b
    }))

    const safeSpaceMarkers: Place[] = (filteredSafeSpaces || []).filter(
      (s): s is SafeSpace & { latitude: number; longitude: number } => {
        return typeof s.latitude === "number" &&
               Number.isFinite(s.latitude) &&
               typeof s.longitude === "number" &&
               Number.isFinite(s.longitude) &&
               s.latitude !== 0 &&
               s.longitude !== 0
      }
    ).map(s => ({
      id: s.id,
      name: s.name,
      latitude: s.latitude,
      longitude: s.longitude,
      category: s.category,
      description: s.description,
      type: 'safe_space' as const,
      originalData: s
    }))

    return [...businessMarkers, ...safeSpaceMarkers]
  }, [filteredBusinesses, filteredSafeSpaces])

  // Limit markers for better performance - only show first 50
  const initialMarkers = useMemo(() => validMarkers.slice(0, 50), [validMarkers])

  // Calculate initial region - prioritize user location, fallback to markers, then default
  const initialRegion = useMemo(() => {
    // Always prefer user location if available
    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }
    }

    // If no user location but have markers, center on first 20 markers for performance
    if (validMarkers.length === 0) {
      return CONSTANTS.DEFAULT_REGION
    }

    // Use only first 20 markers to reduce calculation overhead
    const markers = validMarkers.slice(0, 20)
    const lats = markers.map(m => m.latitude)
    const lngs = markers.map(m => m.longitude)

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
  }, [userLocation, validMarkers])

  const mapKey = `${Platform.OS}-${userLocation ? 'withLoc' : 'noLoc'}-${validMarkers.length}`

  const categories: Category[] = [
    { id: "all", name: "All", icon: "apps", color: "grey" },
    { id: "transport", name: "Transport", icon: "directions-car", color: "#F7DC6F" },
    { id: "education", name: "Education", icon: "school", color: "red" },
    { id: "restaurant", name: "Food", icon: "restaurant", color: "#4ECDC4" },
    { id: "finance", name: "Finance", icon: "business", color: "gold" },
    { id: "healthcare", name: "Health", icon: "local-hospital", color: "green" },
    { id: "shopping", name: "Shopping", icon: "shopping-bag", color: "#FFEAA7" },
    { id: "service", name: "Services", icon: "build", color: "#DDA0DD" },
    { id: "hotel", name: "Accommodation", icon: "hotel", color: "#98D8C8" },
  ]

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, (Business | SafeSpace)[]> = {}

    // Get allowed category IDs from the categories array
    const allowedCategoryIds = categories.map(cat => cat.id.toLowerCase())

    // Add businesses only if their category is in the allowed list
    for (const b of filteredBusinesses) {
      const cat = (b.category || "other").toLowerCase()
      if (allowedCategoryIds.includes(cat)) {
        if (!groups[cat]) groups[cat] = []
        groups[cat].push(b)
      }
    }

    // Add safe spaces only if their category is in the allowed list
    for (const s of filteredSafeSpaces) {
      const cat = (s.category || "other").toLowerCase()
      if (allowedCategoryIds.includes(cat)) {
        if (!groups[cat]) groups[cat] = []
        groups[cat].push(s)
      }
    }

    return groups
  }, [filteredBusinesses, filteredSafeSpaces, categories])

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

  useEffect(() => {
    loadBusinesses()
    getCurrentLocation()
  }, [])

  useEffect(() => {
    filterBusinesses()
  }, [selectedCategory, businesses, safeSpaces])

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

      // Load businesses
      const businessResponse = await businessService.getBusinesses()

      // Load safe spaces
      const safeSpacesResponse = await safeSpacesService.getAllSafeSpaces()

      if (businessResponse.success && businessResponse.businesses) {
        setBusinesses(businessResponse.businesses)
        setFilteredBusinesses(businessResponse.businesses)
      } else {
        Alert.alert("Error", businessResponse.error || "Failed to load businesses")
        setBusinesses([])
        setFilteredBusinesses([])
      }

      if (safeSpacesResponse.success && safeSpacesResponse.data) {
        setSafeSpaces(safeSpacesResponse.data)
        setFilteredSafeSpaces(safeSpacesResponse.data)
      } else {
        console.warn("Failed to load safe spaces:", safeSpacesResponse.error)
        setSafeSpaces([])
        setFilteredSafeSpaces([])
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load places")
      setBusinesses([])
      setFilteredBusinesses([])
      setSafeSpaces([])
      setFilteredSafeSpaces([])
    } finally {
      setLoading(false)
    }
  }

  const filterBusinesses = async () => {
    try {
      let filteredBusinessesList: Business[] = []
      let filteredSafeSpacesList: SafeSpace[] = []

      if (selectedCategory === "all") {
        filteredBusinessesList = businesses
        filteredSafeSpacesList = safeSpaces
      } else {
        // Filter businesses
        const categoryMap: Record<string, string[]> = {
          finance: ["finance"],
          service: ["service"],
          hotel: ["hotel"],
          restaurant: ["restaurant"],
          shopping: ["shopping"],
          education: ["education"],
          entertainment: ["entertainment"],
          transport: ["transport"],
          healthcare: ["healthcare"]
        }

        const allowedCategories = categoryMap[selectedCategory] || [selectedCategory]

        // Filter businesses
        filteredBusinessesList = businesses.filter(b =>
          allowedCategories.includes(b.category?.toLowerCase()) ||
          b.category?.toLowerCase() === selectedCategory
        )

        // Filter safe spaces
        filteredSafeSpacesList = safeSpaces.filter(s =>
          allowedCategories.includes(s.category?.toLowerCase()) ||
          s.category?.toLowerCase() === selectedCategory
        )

        // If client-side filtering gives no results for businesses, try server-side
        if (filteredBusinessesList.length === 0) {
          const resp = await businessService.getBusinessesByCategory(selectedCategory)
          filteredBusinessesList = resp.success && resp.businesses ? resp.businesses : []
        }

        // If client-side filtering gives no results for safe spaces, try server-side
        if (filteredSafeSpacesList.length === 0) {
          const resp = await safeSpacesService.getSafeSpacesByCategory(selectedCategory)
          filteredSafeSpacesList = resp.success && resp.data ? resp.data : []
        }
      }

      setFilteredBusinesses(filteredBusinessesList)
      setFilteredSafeSpaces(filteredSafeSpacesList)
    } catch (error) {
      setFilteredBusinesses([])
      setFilteredSafeSpaces([])
    }
  }

  const renderPlaceCard = ({ item }: { item: Business | SafeSpace }) => {
    const isSafeSpace = 'verified' in item && item.verified !== undefined
    const isBusiness = !isSafeSpace

    return (
      <TouchableOpacity
        style={[styles.businessCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}
        onPress={() => {
          // For now, navigate to BusinessDetails with the item data
          // In the future, we might want a separate SafeSpaceDetails screen
          navigation.navigate("BusinessDetails", { business: item as any })
        }}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${item.category}${isSafeSpace ? ' (Safe Space)' : ''}`}
        accessibilityHint="Double tap to view details"
      >
        <View style={styles.businessHeader}>
          <Text style={[styles.businessName, { color: theme.colors.text }]}>{item.name}</Text>

        </View>
        <Text style={[styles.businessCategory, { color: theme.colors.primary }]}>{item.category.toUpperCase()}</Text>
        <Text style={[styles.businessDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.businessTags}>
          {item.lgbtq_friendly && (
            <View style={[styles.tag, { backgroundColor: theme.colors.lgbtqFriendly }]}>
              <Text style={[styles.tagText, { color: theme.colors.surface }]}>LGBTQ+ Friendly</Text>
            </View>
          )}
          {item.trans_friendly && (
            <View style={[styles.tag, { backgroundColor: theme.colors.transFriendly }]}>
              <Text style={[styles.tagText, { color: theme.colors.surface }]}>Trans Friendly</Text>
            </View>
          )}
          {isSafeSpace && item.verified && (
            <View style={[styles.tag, { backgroundColor: theme.colors.verified }]}>
              <MaterialIcons name="verified" size={12} color={theme.colors.surface} />
              <Text style={[styles.tagText, { color: theme.colors.surface }]}>Verified</Text>
            </View>
          )}
          {isBusiness && item.verified && (
            <View style={[styles.tag, { backgroundColor: theme.colors.verified }]}>
              <MaterialIcons name="verified" size={12} color={theme.colors.surface} />
              <Text style={[styles.tagText, { color: theme.colors.surface }]}>Verified</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    )
  }

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
          {initialMarkers.map((place) => (
            <BusinessMarker
              key={place.id}
              place={place}
              navigation={navigation}
            />
          ))}
        </MapView>

        {/* Legend */}
        <View style={[styles.legend, {
          backgroundColor: theme.isDark ? theme.colors.card : theme.colors.surface,
          shadowColor: theme.colors.shadow,
          elevation: theme.isDark ? 6 : 3,
          shadowOpacity: theme.isDark ? 0.3 : 0.1,
          borderWidth: 1,
          borderColor: theme.colors.border
        }]}>
          <Text style={[styles.legendTitle, { color: theme.colors.text }]}>Legend</Text>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: theme.colors.lgbtqFriendly }]} />
            <Text style={[styles.legendText, { color: theme.isDark ? theme.colors.text : theme.colors.textSecondary }]}>LGBTQ+ & Trans Friendly</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: theme.colors.transFriendly }]} />
            <Text style={[styles.legendText, { color: theme.isDark ? theme.colors.text : theme.colors.textSecondary }]}>LGBTQ+ Friendly</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: "#95E1D3" }]} />
            <Text style={[styles.legendText, { color: theme.isDark ? theme.colors.text : theme.colors.textSecondary }]}>Other Safe Spaces</Text>
          </View>
        </View>

        {/* Floating action button for adding new places */}
        <TouchableOpacity
          style={[styles.floatingActionButton, { backgroundColor: theme.colors.success, shadowColor: theme.colors.shadow }]}
          onPress={() => navigation.navigate("SuggestSafeSpace" as never)}
          accessibilityRole="button"
          accessibilityLabel="Suggest a new safe space"
        >
          <MaterialIcons name="add-location" size={24} color={theme.colors.surface} />
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.isDark ? theme.colors.card : theme.colors.surface }] }>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.isDark ? theme.colors.card : theme.colors.surface }]}>
        <Text style={[styles.headerTitle, { color: theme.isDark ? theme.colors.text : theme.colors.primary  }]}>Mirae SafePlaces</Text>
        <Text style={[styles.headerSubtitle, { color: theme.isDark ? theme.colors.text : theme.colors.textSecondary }]}>Find LGBTQ+ friendly businesses & safe spaces</Text>
      </View>

      {/* View Toggle */}
      <View style={[styles.toggleContainer, {
        backgroundColor: theme.isDark ? theme.colors.card : theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border
      }]}>
        <TouchableOpacity
          style={[styles.toggleButton, showMap && [styles.activeToggle, { backgroundColor: theme.colors.primary }]]}
          onPress={() => setShowMap(true)}
          accessibilityRole="button"
          accessibilityLabel="Switch to map view"
        >
          <MaterialIcons name="map" size={18} color={showMap ? theme.colors.surface : (theme.isDark ? theme.colors.text : theme.colors.textSecondary)} />
          <Text style={[styles.toggleText, { color: theme.isDark ? theme.colors.text : theme.colors.textSecondary }, showMap && [styles.activeToggleText, { color: theme.colors.surface }]]}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, !showMap && [styles.activeToggle, { backgroundColor: theme.colors.primary }]]}
          onPress={() => setShowMap(false)}
          accessibilityRole="button"
          accessibilityLabel="Switch to list view"
        >
          <MaterialIcons name="list" size={18} color={!showMap ? theme.colors.surface : (theme.isDark ? theme.colors.text : theme.colors.textSecondary)} />
          <Text style={[styles.toggleText, { color: theme.isDark ? theme.colors.text : theme.colors.textSecondary }, !showMap && [styles.activeToggleText, { color: theme.colors.surface }]]}>List</Text>
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
              style={[styles.categoryTab, {
                backgroundColor: theme.isDark ? theme.colors.card : theme.colors.surface,
                borderColor: theme.colors.border,
                shadowColor: theme.colors.shadow,
                elevation: theme.isDark ? 4 : 2,
                shadowOpacity: theme.isDark ? 0.2 : 0.1
              }, selectedCategory === category.id && { backgroundColor: category.color }]}
              onPress={() => setSelectedCategory(category.id)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${category.name}`}
              accessibilityHint="Double tap to filter businesses by this category"
            >
              <MaterialIcons
                name={category.icon as any}
                size={16}
                color={selectedCategory === category.id ? theme.colors.surface : (theme.isDark ? theme.colors.text : category.color)}
              />
              <Text
                style={[
                  styles.categoryTabText,
                  { color: theme.isDark ? theme.colors.text : theme.colors.textSecondary },
                  selectedCategory === category.id && { color: theme.colors.surface },
                  selectedCategory !== category.id && { color: theme.isDark ? theme.colors.text : category.color },
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.categoryTab, {
              backgroundColor: theme.colors.success,
              shadowColor: theme.colors.shadow,
              elevation: theme.isDark ? 4 : 2,
              shadowOpacity: theme.isDark ? 0.2 : 0.1
            }]}
            onPress={() => navigation.navigate("SuggestSafeSpace" as never)}
            accessibilityRole="button"
            accessibilityLabel="Recommend a safe space"
          >
            <MaterialIcons name="add-location" size={16} color={theme.colors.surface} />
            <Text style={[styles.categoryTabText, { color: theme.colors.surface }]}>Recommend</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Map or List View */}
      {showMap ? renderMapView() : (
        <FlatList
          data={Object.keys(groupedByCategory)}
          renderItem={({ item: cat }) => (
            <View style={{ marginBottom: 16, backgroundColor: theme.colors.background }}>
              <Text style={{ fontSize: 18, fontWeight: "700", marginHorizontal: 16, marginBottom: 8, color: theme.colors.text }}>
                {cat.toUpperCase()}
              </Text>
              {groupedByCategory[cat].map((place: Business | SafeSpace) => (
                <View key={place.id} style={{ marginHorizontal: 16, marginBottom: 10, backgroundColor: theme.colors.background }}>
                  {renderPlaceCard({ item: place })}
                </View>
              ))}
            </View>
          )}
          keyExtractor={(cat) => cat}
          style={[styles.businessList, { backgroundColor: theme.colors.background }]}
          contentContainerStyle={[styles.businessListContent, { backgroundColor: theme.colors.background }]}
          showsVerticalScrollIndicator={false}
          // Performance optimizations
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={10}
          removeClippedSubviews={true}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="place" size={64} color={theme.colors.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>{loading ? "Loading places..." : "No places found"}</Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>{!loading && "Try adjusting your category filter"}</Text>
            </View>
          }
        />
      )}

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, {
            color: theme.isDark ? theme.colors.text : theme.colors.textSecondary,
            backgroundColor: theme.isDark ? theme.colors.card : theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            shadowColor: theme.colors.shadow,
            elevation: theme.isDark ? 6 : 3,
            shadowOpacity: theme.isDark ? 0.3 : 0.1
          }]}>Loading places...</Text>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
   
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  toggleContainer: {
    flexDirection: "row",
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
    // backgroundColor will be set inline
  },
  toggleText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: "600",
  },
  activeToggleText: {
    // color will be set inline
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
  },
  businessList: {
    flex: 1,
  },
  businessListContent: {
    padding: 20,
  },
  businessCard: {
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
    flex: 1,
  },
  businessRating: {
    flexDirection: "row",
    alignItems: "center",
  },
  businessCategory: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  businessDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  businessTags: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  transTag: {
    // backgroundColor will be set inline
  },
  verifiedTag: {
    // backgroundColor will be set inline
  },
  tagText: {
    fontSize: 10,
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 14,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryTabsContainer: {
    backgroundColor: 'transparent',
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
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
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
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  safeSpaceBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    elevation: 3,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  safeSpaceBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
  },
})
