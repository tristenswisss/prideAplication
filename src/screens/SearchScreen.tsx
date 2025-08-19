"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ScrollView,
  Switch,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { searchService, type SearchFilters } from "../../lib/search"
import { businessService, type BusinessSearchParams } from "../../services/businessService"
import { eventService } from "../../services/eventService"
import { useOffline } from "../../Contexts/OfflineContext"
import type { Business, Event } from "../../types"
import AppModal from "../../components/AppModal"

interface SearchScreenProps {
  navigation: any
}

export default function SearchScreen({ navigation }: SearchScreenProps) {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [results, setResults] = useState<{ businesses: Business[]; events: Event[] }>({
    businesses: [],
    events: [],
  })
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({})
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"all" | "businesses" | "events">("all")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [modal, setModal] = useState<{ visible: boolean; title?: string; message?: string }>({ visible: false })
  
  const categories = [
    { id: "all", name: "All", icon: "apps", color: "black" },
    { id: "transport", name: "Transport", icon: "directions-car", color: "#F7DC6F" },
      { id: "education", name: "Education", icon: "school", color: "red" },
    { id: "restaurant", name: "Food", icon: "restaurant", color: "#4ECDC4" },
    { id: "finance", name: "Finance", icon: "business", color: "gold" },
    { id: "healthcare", name: "Health", icon: "local-hospital", color: "green" },
    { id: "shopping", name: "Shopping", icon: "shopping-bag", color: "#FFEAA7" },
    { id: "service", name: "Services", icon: "build", color: "#DDA0DD" },
    { id: "hotel", name: "Accomodation", icon: "hotel", color: "#98D8C8" },
  ]

  const { isConnected, isOffline } = useOffline()

  useEffect(() => {
    loadSearchHistory()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      if (query.length > 2) {
        getSuggestions()
      } else {
        setSuggestions([])
      }
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  // Debounced live search when the query changes, similar to Home
  useEffect(() => {
    const t = setTimeout(() => {
      performSearch()
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    const t = setTimeout(() => {
      // Always perform search when category selection or filters change
      performSearch()
    }, 200)
    return () => clearTimeout(t)
  }, [selectedCategory, filters.category])

  const loadSearchHistory = async () => {
    try {
      const history = await searchService.getSearchHistory()
      setSearchHistory(history)
    } catch (error) {
      console.error("Error loading search history:", error)
    }
  }

  const getSuggestions = async () => {
    try {
      const suggestions = await searchService.getSuggestions(query)
      setSuggestions(suggestions)
    } catch (error) {
      console.error("Error getting suggestions:", error)
    }
  }

  const performSearch = async (searchQuery: string = query) => {

    try {
      setLoading(true)
      // Merge selectedCategory into filters for consistency
      const effectiveFilters: SearchFilters = {
        ...filters,
        category: filters.category || (selectedCategory !== "all" ? selectedCategory : undefined),
      }

      if (isOffline) {
        // Fallback to cached search in offline mode
        const offlineResults = await searchService.search(searchQuery, effectiveFilters)
        setResults({
          businesses: offlineResults.businesses,
          events: offlineResults.events,
        })
        setSuggestions([])
        await loadSearchHistory()
        return
      }

      // Online: Use the same business search logic as Home (Supabase-backed)
      const businessParams: BusinessSearchParams = {
        query: searchQuery.trim() || undefined,
        category: effectiveFilters.category,
        filters: {
          lgbtq_friendly: effectiveFilters.lgbtqFriendly,
          trans_friendly: effectiveFilters.transFriendly,
          wheelchair_accessible: effectiveFilters.wheelchairAccessible,
          verified: effectiveFilters.verified,
          rating_min: effectiveFilters.rating,
        },
      }

      const [bizResp, allEvents] = await Promise.all([
        businessService.searchBusinesses(businessParams),
        eventService.getAllEvents(),
      ])

      const businesses = bizResp.success && bizResp.businesses ? bizResp.businesses : []

      // Filter events locally for query and category
      const lower = (searchQuery || "").toLowerCase()
      const events = (allEvents || []).filter((ev) => {
        const matchesQuery = !lower ||
          ev.title.toLowerCase().includes(lower) ||
          ev.description.toLowerCase().includes(lower) ||
          ev.location.toLowerCase().includes(lower) ||
          (Array.isArray(ev.tags) && ev.tags.some((t: string) => t.toLowerCase().includes(lower)))

        if (!matchesQuery) return false
        if (effectiveFilters.category && ev.category.toLowerCase() !== effectiveFilters.category.toLowerCase()) return false
        return true
      })

      setResults({ businesses, events })
      setSuggestions([])
      await loadSearchHistory() // Refresh history
    } catch (error) {
      console.error("Error performing search:", error)
      setModal({ visible: true, title: "Search Error", message: "Failed to perform search. Please try again." })
    } finally {
      setLoading(false)
    }
  }

  const clearSearchHistory = async () => {
    try {
      await searchService.clearSearchHistory()
      setSearchHistory([])
      setModal({ visible: true, title: "History Cleared", message: "Your search history has been cleared." })
    } catch (error) {
      setModal({ visible: true, title: "Error", message: "Failed to clear search history." })
    }
  }

  const resetFilters = () => {
    setFilters({})
  }

  const getFilterCount = () => {
    return Object.values(filters).filter((value) => value !== undefined && value !== null).length
  }

  const renderSuggestion = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => {
        setQuery(item)
        performSearch(item)
      }}
    >
      <MaterialIcons name="search" size={16} color="#666" />
      <Text style={styles.suggestionText}>{item}</Text>
    </TouchableOpacity>
  )

  const renderHistoryItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => {
        setQuery(item)
        performSearch(item)
      }}
    >
      <MaterialIcons name="history" size={16} color="#666" />
      <Text style={styles.historyText}>{item}</Text>
    </TouchableOpacity>
  )

  const renderCategoryItem = ({ item }: { item: typeof categories[0] }) => (
    <TouchableOpacity
      style={[styles.categoryButton, selectedCategory === item.id && { backgroundColor: item.color }]}
      onPress={() => {
        setSelectedCategory(item.id)
        if (item.id !== "all") {
          setFilters({ ...filters, category: item.id })
        } else {
          const newFilters = { ...filters }
          delete newFilters.category
          setFilters(newFilters)
        }
        performSearch()
      }}
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

  const renderBusinessResult = ({ item }: { item: Business }) => (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => navigation.navigate("BusinessDetails", { business: item })}
    >
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>{item.name}</Text>
        <View style={styles.resultRating}>
          <MaterialIcons name="star" size={16} color="#FFD700" />
          <Text style={styles.ratingText}>{item.rating}</Text>
        </View>
      </View>
      <Text style={styles.resultCategory}>{item.category.toUpperCase()}</Text>
      <Text style={styles.resultDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.resultTags}>
        {item.lgbtq_friendly && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>LGBTQ+ Friendly</Text>
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

  const renderEventResult = ({ item }: { item: Event }) => (
    <TouchableOpacity style={styles.resultCard} onPress={() => navigation.navigate("EventDetails", { event: item })}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>{item.title}</Text>
        <View style={styles.eventPrice}>
          {item.is_free ? (
            <Text style={styles.freeText}>FREE</Text>
          ) : (
            <Text style={styles.priceText}>${item.price}</Text>
          )}
        </View>
      </View>
      <Text style={styles.resultCategory}>{item.category.toUpperCase()}</Text>
      <Text style={styles.resultDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.eventInfo}>
        <MaterialIcons name="event" size={14} color="#666" />
        <Text style={styles.eventInfoText}>{new Date(item.date).toLocaleDateString()}</Text>
        <MaterialIcons name="location-on" size={14} color="#666" style={{ marginLeft: 10 }} />
        <Text style={styles.eventInfoText}>{item.location}</Text>
      </View>
    </TouchableOpacity>
  )

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={styles.filtersHeader}>
        <Text style={styles.filtersTitle}>Filters</Text>
        <TouchableOpacity onPress={resetFilters}>
          <Text style={styles.resetFiltersText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.filtersContent}>
        {/* Category Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {["restaurant", "bar", "healthcare", "shopping", "service", "hotel", "entertainment"].map((category) => (
              <TouchableOpacity
                key={category}
                style={[styles.categoryFilter, filters.category === category && styles.activeCategoryFilter]}
                onPress={() =>
                  setFilters({ ...filters, category: filters.category === category ? undefined : category })
                }
              >
                <Text
                  style={[styles.categoryFilterText, filters.category === category && styles.activeCategoryFilterText]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Boolean Filters */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Features</Text>

          <View style={styles.switchFilter}>
            <Text style={styles.switchLabel}>LGBTQ+ Friendly</Text>
            <Switch
              value={filters.lgbtqFriendly || false}
              onValueChange={(value) => setFilters({ ...filters, lgbtqFriendly: value })}
              trackColor={{ false: "#E0E0E0", true: "#FF6B6B" }}
              thumbColor={filters.lgbtqFriendly ? "#fff" : "#f4f3f4"}
            />
          </View>

          <View style={styles.switchFilter}>
            <Text style={styles.switchLabel}>Trans Friendly</Text>
            <Switch
              value={filters.transFriendly || false}
              onValueChange={(value) => setFilters({ ...filters, transFriendly: value })}
              trackColor={{ false: "#E0E0E0", true: "#4ECDC4" }}
              thumbColor={filters.transFriendly ? "#fff" : "#f4f3f4"}
            />
          </View>

          <View style={styles.switchFilter}>
            <Text style={styles.switchLabel}>Wheelchair Accessible</Text>
            <Switch
              value={filters.wheelchairAccessible || false}
              onValueChange={(value) => setFilters({ ...filters, wheelchairAccessible: value })}
              trackColor={{ false: "#E0E0E0", true: "#4CAF50" }}
              thumbColor={filters.wheelchairAccessible ? "#fff" : "#f4f3f4"}
            />
          </View>

          <View style={styles.switchFilter}>
            <Text style={styles.switchLabel}>Verified Only</Text>
            <Switch
              value={filters.verified || false}
              onValueChange={(value) => setFilters({ ...filters, verified: value })}
              trackColor={{ false: "#E0E0E0", true: "#45B7D1" }}
              thumbColor={filters.verified ? "#fff" : "#f4f3f4"}
            />
          </View>
        </View>

        {/* Rating Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Minimum Rating</Text>
          <View style={styles.ratingFilter}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <TouchableOpacity
                key={rating}
                style={[styles.ratingButton, filters.rating === rating && styles.activeRatingButton]}
                onPress={() => setFilters({ ...filters, rating: filters.rating === rating ? undefined : rating })}
              >
                <MaterialIcons name="star" size={20} color={filters.rating === rating ? "#fff" : "#FFD700"} />
                <Text style={[styles.ratingButtonText, filters.rating === rating && styles.activeRatingButtonText]}>
                  {rating}+
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  )

  const getResultsToShow = () => {
    switch (activeTab) {
      case "businesses":
        return results.businesses
      case "events":
        return results.events
      default:
        return [...results.businesses, ...results.events]
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["black", "black"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search</Text>
          <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={styles.filterButton}>
            <MaterialIcons name="tune" size={24} color="white" />
            {getFilterCount() > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{getFilterCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={isOffline ? "Search offline..." : "Search places and events..."}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => performSearch()}
            placeholderTextColor="#666"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} style={styles.clearButton}>
              <MaterialIcons name="clear" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Offline Indicator */}
        {!isConnected && (
          <View style={styles.offlineIndicator}>
            <MaterialIcons name="cloud-off" size={16} color="white" />
            <Text style={styles.offlineText}>Searching offline data</Text>
          </View>
        )}
      </LinearGradient>

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {/* Filters Panel */}
      {showFilters && renderFilters()}

      {/* Content */}
      <View style={styles.content}>
        {/* Suggestions */}
        {suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.sectionTitle}>Suggestions</Text>
            <FlatList
              data={suggestions}
              renderItem={renderSuggestion}
              keyExtractor={(item, index) => `suggestion-${index}`}
              style={styles.suggestionsList}
            />
          </View>
        )}

        {/* Search History */}
        {query.length === 0 && searchHistory.length > 0 && (
          <View style={styles.historyContainer}>
            <View style={styles.historyHeader}>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
              <TouchableOpacity onPress={clearSearchHistory}>
                <Text style={styles.clearHistoryText}>Clear</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={searchHistory}
              renderItem={renderHistoryItem}
              keyExtractor={(item, index) => `history-${index}`}
              style={styles.historyList}
            />
          </View>
        )}

        {/* Results */}
        {(results.businesses.length > 0 || results.events.length > 0) && (
          <View style={styles.resultsContainer}>
            {/* Results Tabs */}
            <View style={styles.resultsTabs}>
              <TouchableOpacity
                style={[styles.resultsTab, activeTab === "all" && styles.activeResultsTab]}
                onPress={() => setActiveTab("all")}
              >
                <Text style={[styles.resultsTabText, activeTab === "all" && styles.activeResultsTabText]}>
                  All ({results.businesses.length + results.events.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.resultsTab, activeTab === "businesses" && styles.activeResultsTab]}
                onPress={() => setActiveTab("businesses")}
              >
                <Text style={[styles.resultsTabText, activeTab === "businesses" && styles.activeResultsTabText]}>
                  Places ({results.businesses.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.resultsTab, activeTab === "events" && styles.activeResultsTab]}
                onPress={() => setActiveTab("events")}
              >
                <Text style={[styles.resultsTabText, activeTab === "events" && styles.activeResultsTabText]}>
                  Events ({results.events.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Results List */}
            <FlatList
              data={getResultsToShow()}
              renderItem={({ item }) => {
                if ("title" in item) {
                  return renderEventResult({ item: item as Event })
                }
                return renderBusinessResult({ item: item as Business })
              }}
              keyExtractor={(item) => item.id}
              style={styles.resultsList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        {/* No Results */}
        {query.length > 0 && results.businesses.length === 0 && results.events.length === 0 && !loading && (
          <View style={styles.noResults}>
            <MaterialIcons name="search-off" size={64} color="#ccc" />
            <Text style={styles.noResultsText}>No results found</Text>
            <Text style={styles.noResultsSubtext}>Try adjusting your search terms or filters</Text>
            <TouchableOpacity style={{ marginTop: 12, alignItems: "center" }} onPress={() => navigation.getParent()?.navigate("Home" as never, { screen: "SuggestSafeSpace" } as never)}>
              <MaterialIcons name="add-location" size={20} color="#4CAF50" />
              <Text style={{ color: "#4CAF50", fontWeight: "600", marginTop: 4 }}>Recommend a safe location</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <AppModal
        visible={modal.visible}
        onClose={() => setModal({ visible: false })}
        title={modal.title}
        variant="center"
        rightAction={{ label: "OK", onPress: () => setModal({ visible: false }) }}
      >
        <Text style={{ fontSize: 16, color: "#333" }}>{modal.message}</Text>
      </AppModal>
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
    marginBottom: 20,
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
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "black",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
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
  clearButton: {
    padding: 5,
  },
  offlineIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 15,
    alignSelf: "center",
  },
  offlineText: {
    color: "white",
    fontSize: 12,
    marginLeft: 5,
  },
  filtersContainer: {
    backgroundColor: "white",
    maxHeight: 300,
  },
  filtersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  resetFiltersText: {
    color: "gold",
    fontSize: 14,
    fontWeight: "600",
  },
  filtersContent: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 25,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  categoryFilter: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  activeCategoryFilter: {
    backgroundColor: "black",
  },
  categoryFilterText: {
    fontSize: 12,
    color: "#666",
    textTransform: "capitalize",
  },
  categoryContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 2,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minWidth: 70,
    minHeight: 40,
    justifyContent: "center",
  },
  categoryText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  activeCategoryFilterText: {
    color: "white",
  },
  switchFilter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  switchLabel: {
    fontSize: 14,
    color: "#333",
  },
  ratingFilter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  ratingButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activeRatingButton: {
    backgroundColor: "#FFD700",
  },
  ratingButtonText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  activeRatingButtonText: {
    color: "white",
  },
  content: {
    flex: 1,
  },
  suggestionsContainer: {
    backgroundColor: "white",
    margin: 20,
    borderRadius: 12,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  suggestionsList: {
    maxHeight: 150,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  suggestionText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 10,
  },
  historyContainer: {
    backgroundColor: "white",
    margin: 20,
    borderRadius: 12,
    padding: 15,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  clearHistoryText: {
    color: "gold",
    fontSize: 12,
    fontWeight: "600",
  },
  historyList: {
    maxHeight: 150,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  historyText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 10,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: "white",
    margin: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  resultsTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  resultsTab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
  },
  activeResultsTab: {
    borderBottomWidth: 2,
    borderBottomColor: "black",
  },
  resultsTabText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  activeResultsTabText: {
    color: "gold",
  },
  resultsList: {
    flex: 1,
    padding: 15,
  },
  resultCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  resultRating: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 4,
  },
  eventPrice: {
    backgroundColor: "#e8f5e8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  freeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  priceText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  resultCategory: {
    fontSize: 12,
    color: "#FF6B6B",
    fontWeight: "600",
    marginBottom: 8,
  },
  resultDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 10,
  },
  resultTags: {
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
  verifiedTag: {
    backgroundColor: "#4CAF50",
  },
  tagText: {
    fontSize: 10,
    color: "white",
    fontWeight: "bold",
    marginLeft: 2,
  },
  eventInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  eventInfoText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  noResults: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
    marginTop: 20,
    marginBottom: 10,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
})
