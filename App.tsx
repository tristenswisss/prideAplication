"use client"
import { NavigationContainer } from "@react-navigation/native"
import { createStackNavigator } from "@react-navigation/stack"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { MaterialIcons } from "@expo/vector-icons"
import { StatusBar } from "expo-status-bar"
import { Image } from "react-native"
import { useEffect, useMemo, useState, useRef } from "react"
import { realtime } from "./lib/realtime"
import { messagingService } from "./services/messagingService"
import { events } from "./lib/events"
import { storage } from "./lib/storage"

// Contexts
import { AuthProvider, useAuth } from "./Contexts/AuthContexts"
import { OfflineProvider } from "./Contexts/OfflineContext"
import { ThemeProvider, useTheme } from "./Contexts/ThemeContext"

// Screens
import AuthScreen from "./src/screens/AuthScreen"
import LoadingScreen from "./src/screens/LoadingScreen"
import HomeScreen from "./src/screens/HomeScreen"
import EventsScreen from "./src/screens/EventsScreen"
import CommunityScreen from "./src/screens/CommunityScreen"
import ProfileScreen from "./src/screens/ProfileScreen"
import BusinessDetailScreen from "./src/screens/BusinessDetailScreen"
import WriteReviewScreen from "./src/screens/writeReviewScreen"
import EventsDetailScreen from "./src/screens/EventsDetailScreen"
import LiveEventScreen from "./src/screens/LiveEventScreen"
import RecordingsScreen from "./src/screens/RecordingsScreen"
import LiveEventsScreenList from "./src/screens/LiveEventsScreeen"
import UserProfileScreen from "./src/screens/UserProfileScreen"
import ChatScreen from "./src/screens/ChatScreen"
import MessageScreen from "./src/screens/MessageScreen"
import SafetyScreen from "./src/screens/SafetyScreen"
import BuddySystemScreen from "./src/screens/BuddySystemScreen"
import MentalHealthScreen from "./src/screens/MentalHealthScreen"
import NotificationScreen from "./src/screens/notificationScreen"
import EditProfileScreen from "./src/screens/EditProfileScreen"
import SavedPlacesScreen from "./src/screens/SavedPlacesScreen"
import MyEventsScreen from "./src/screens/MyEventsScreen"
import NotificationSettingsScreen from "./src/screens/NotificationSettingsScreen"
import PrivacySafetyScreen from "./src/screens/PrivacySafetyScreen"
import HelpSupportScreen from "./src/screens/HelpSupportScreen"
import CreateEventScreen from "./src/screens/CreateEventScreen"
import BlockedUsersScreen from "./src/screens/BlockedUsersScreen"

// Components
import OfflineStatus from "./components/OfflineStatus"

// Types
import type {
  RootStackParamList,
  AuthStackParamList,
  MainTabParamList,
  HomeStackParamList,
  EventsStackParamList,
  CommunityStackParamList,
  ProfileStackParamList,
} from "./types/navigation"

const RootStack = createStackNavigator<RootStackParamList>()
const AuthStack = createStackNavigator<AuthStackParamList>()
const Tab = createBottomTabNavigator<MainTabParamList>()
const HomeStack = createStackNavigator<HomeStackParamList>()
const EventsStack = createStackNavigator<EventsStackParamList>()
const CommunityStack = createStackNavigator<CommunityStackParamList>()
const ProfileStack = createStackNavigator<ProfileStackParamList>()

// Auth Stack Navigator
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="SignIn">
      <AuthStack.Screen name="SignIn" component={AuthScreen} />
    </AuthStack.Navigator>
  )
}

// Home Stack Navigator
function HomeNavigator() {
  const { theme } = useTheme()

  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.headerBackground,
        },
        headerTintColor: theme.colors.headerText,
        headerTitleStyle: {
          color: theme.colors.headerText,
        },
      }}
    >
      <HomeStack.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
      <HomeStack.Screen
        name="BusinessDetails"
        component={BusinessDetailScreen}
        options={{ title: "Business Details" }}
      />
      <HomeStack.Screen name="WriteReview" component={WriteReviewScreen} options={{ title: "Write Review" }} />
      <HomeStack.Screen
        name="SuggestSafeSpace"
        component={require("./src/screens/SuggestSafeSpaceScreen").default}
        options={{ title: "Recommend Location" }}
      />
    </HomeStack.Navigator>
  )
}

// Events Stack Navigator
function EventsNavigator() {
  const { theme } = useTheme()

  return (
    <EventsStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.headerBackground,
        },
        headerTintColor: theme.colors.headerText,
        headerTitleStyle: {
          color: theme.colors.headerText,
        },
      }}
    >
      <EventsStack.Screen name="EventsMain" component={EventsScreen} options={{ headerShown: false }} />
      <EventsStack.Screen name="LiveEvents" component={LiveEventsScreenList} options={{ headerShown: false }} />
      <EventsStack.Screen name="EventDetails" component={EventsDetailScreen} options={{ title: "Event Details" }} />
      <EventsStack.Screen name="LiveEvent" component={LiveEventScreen} options={{ headerShown: false }} />
      <EventsStack.Screen name="Recordings" component={RecordingsScreen} options={{ title: "Recordings" }} />
      <EventsStack.Screen name="CreateEvent" component={CreateEventScreen} options={{ headerShown: false }} />
      <EventsStack.Screen name="MyEvents" component={MyEventsScreen} options={{ headerShown: false }} />
    </EventsStack.Navigator>
  )
}

// Community Stack Navigator
function CommunityNavigator() {
  const { theme } = useTheme()

  return (
    <CommunityStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.headerBackground,
        },
        headerTintColor: theme.colors.headerText,
        headerTitleStyle: {
          color: theme.colors.headerText,
        },
      }}
    >
      <CommunityStack.Screen name="CommunityMain" component={CommunityScreen} options={{ headerShown: false }} />
      <CommunityStack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: "Profile" }} />
      <CommunityStack.Screen name="Chat" component={ChatScreen} options={{ title: "Chat" }} />
      <CommunityStack.Screen name="Messages" component={MessageScreen} options={{ title: "Messages" }} />
    </CommunityStack.Navigator>
  )
}

// Profile Stack Navigator
function ProfileNavigator() {
  const { theme } = useTheme()

  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.headerBackground,
        },
        headerTintColor: theme.colors.headerText,
        headerTitleStyle: {
          color: theme.colors.headerText,
        },
      }}
    >
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: "Profile" }} />
      <ProfileStack.Screen name="Safety" component={SafetyScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="BuddySystem" component={BuddySystemScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="MentalHealth" component={MentalHealthScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="Notifications" component={NotificationScreen} options={{ title: "Notifications" }} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="SavedPlaces" component={SavedPlacesScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="MyEvents" component={MyEventsScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen name="PrivacySafety" component={PrivacySafetyScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="HelpSupport" component={HelpSupportScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="BlockedUsers" component={BlockedUsersScreen} options={{ title: "Blocked Users" }} />
      <ProfileStack.Screen
        name="BusinessDetails"
        component={BusinessDetailScreen}
        options={{ title: "Business Details" }}
      />
      <ProfileStack.Screen
        name="SuggestionReview"
        component={require("./src/screens/SuggestionReviewScreen").default}
        options={{ title: "Review Suggestions" }}
      />
    </ProfileStack.Navigator>
  )
}

// Main Tab Navigator
function TabNavigator() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const [unreadTotal, setUnreadTotal] = useState(0)
  const [convIds, setConvIds] = useState<string[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const lastRefreshRef = useRef<number>(0)

  const THROTTLE_MS = 1500

  const refreshUnreadCounts = useMemo(() => {
    return async (immediate = false) => {
      const now = Date.now()
      if (!immediate && now - lastRefreshRef.current < THROTTLE_MS) return
      if (isRefreshing && !immediate) return

      if (!user?.id) {
        setUnreadTotal(0)
        setConvIds([])
        return
      }

      setIsRefreshing(true)
      try {
        // Use cached ids first for a fast initial total
        const cachedIds = (await storage.getCacheItem<string[]>(`conv_ids_${user.id}`)) || []
        if (cachedIds.length > 0) {
          try {
            const counts = await messagingService.getConversationUnreadCounts(cachedIds, user.id)
            const total = Object.values(counts).reduce((a, b) => a + (b || 0), 0)
            setUnreadTotal(total)
            setConvIds(cachedIds)
          } catch {}
        }

        // Always refresh conversation ids to avoid stale subscriptions
        const ids = await messagingService.getConversationIds(user.id)
        setConvIds(ids)
        await storage.setCacheItem(`conv_ids_${user.id}`, ids, 10) // cache for 10 minutes

        if (ids.length === 0) {
          setUnreadTotal(0)
          return
        }

        const counts = await messagingService.getConversationUnreadCounts(ids, user.id)
        const total = Object.values(counts).reduce((a, b) => a + (b || 0), 0)
        setUnreadTotal(total)
        lastRefreshRef.current = Date.now()
      } catch (err) {
        console.error("Failed to refresh unread counts:", err)
      } finally {
        setIsRefreshing(false)
      }
    }
  }, [user?.id, isRefreshing])

  useEffect(() => {
    let unsubscribers: (() => void)[] = []
    const load = async () => {
      if (!user?.id) return

      try {
        // Load cached ids instantly if present
        const cachedIds = (await storage.getCacheItem<string[]>(`conv_ids_${user.id}`)) || []
        if (cachedIds.length > 0) setConvIds(cachedIds)

        const convs = await messagingService.getConversations(user.id)
        const ids = convs.map((c: any) => c.id)
        setConvIds(ids)
        await storage.setCacheItem(`conv_ids_${user.id}`, ids, 10)

        await refreshUnreadCounts(true)

        unsubscribers = ids.map((id) =>
          realtime.subscribeToMessageUpdates(id, {
            onInsert: async (row: any) => {
              if (row.sender_id !== user.id) {
                await refreshUnreadCounts(false)
              }
            },
            onUpdate: async () => {
              await refreshUnreadCounts(false)
            },
          }),
        )

        const offOpen = events.on("conversationOpened", async ({ conversationId, previousUnreadCount }) => {
          try {
            const delta = typeof previousUnreadCount === "number" ? previousUnreadCount : 0
            if (delta > 0) setUnreadTotal((prev) => Math.max(0, prev - delta))
            setTimeout(() => refreshUnreadCounts(false), 50)
          } catch (err) {
            console.error("Error updating unread count on conversation open:", err)
            refreshUnreadCounts(true)
          }
        })

        const offUnread = events.on("unreadCountsChanged", () => {
          refreshUnreadCounts(false)
        })

        const offClosed = events.on("conversationClosed", () => {
          refreshUnreadCounts(false)
        })

        unsubscribers.push(offOpen, offUnread, offClosed)
      } catch (err) {
        console.error("Error loading conversations:", err)
      }
    }

    load()
    return () => {
      unsubscribers.forEach((u) => u())
    }
  }, [user?.id, refreshUnreadCounts])

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          if (route.name === "Profile") {
            return user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={{ width: size, height: size, borderRadius: size / 2 }} />
            ) : (
              <MaterialIcons name="person" size={size} color={color} />
            )
          }

          let iconName: keyof typeof MaterialIcons.glyphMap
          switch (route.name) {
            case "Home":
              iconName = "home"
              break

            case "Events":
              iconName = "event"
              break
            case "Community":
              iconName = "people"
              break
            default:
              iconName = "home"
          }
          return <MaterialIcons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: theme.colors.tabBarActive,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBarBackground,
          borderTopColor: theme.colors.border,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeNavigator} />
      <Tab.Screen name="Events" component={EventsNavigator} />
      <Tab.Screen
        name="Community"
        component={CommunityNavigator}
      />
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  )
}

// Main App Component
function AppContent() {
  const { user, loading } = useAuth()
  const { theme } = useTheme()

  return (
    <>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {loading ? (
            <RootStack.Screen name="Loading" component={LoadingScreen} />
          ) : user ? (
            <RootStack.Screen name="Main" component={TabNavigator} />
          ) : (
            <RootStack.Screen name="Auth" component={AuthNavigator} />
          )}
        </RootStack.Navigator>
        <OfflineStatus />
      </NavigationContainer>
    </>
  )
}

// Root App Component
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OfflineProvider>
          <AppContent />
        </OfflineProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
