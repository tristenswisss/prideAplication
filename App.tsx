"use client"
import { NavigationContainer } from "@react-navigation/native"
import { createStackNavigator } from "@react-navigation/stack"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { MaterialIcons } from "@expo/vector-icons"
import { StatusBar } from "expo-status-bar"
import { Image } from "react-native"
import { useEffect, useMemo, useState } from "react"
import { realtime } from "./lib/realtime"
import { messagingService } from "./services/messagingService"
import { events } from "./lib/events"

// Contexts
import { AuthProvider, useAuth } from "./Contexts/AuthContexts"
import { OfflineProvider } from "./Contexts/OfflineContext"

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
  return (
    <HomeStack.Navigator>
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
  return (
    <EventsStack.Navigator>
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
  return (
    <CommunityStack.Navigator>
      <CommunityStack.Screen name="CommunityMain" component={CommunityScreen} options={{ headerShown: false }} />
      <CommunityStack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: "Profile" }} />
      <CommunityStack.Screen name="Chat" component={ChatScreen} options={{ title: "Chat" }} />
      <CommunityStack.Screen name="Messages" component={MessageScreen} options={{ title: "Messages" }} />
    </CommunityStack.Navigator>
  )
}

// Profile Stack Navigator
function ProfileNavigator() {
  return (
    <ProfileStack.Navigator>
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
  const [unreadTotal, setUnreadTotal] = useState(0)
  const [convIds, setConvIds] = useState<string[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refreshUnreadCounts = useMemo(() => {
    return async (immediate = false) => {
      if (isRefreshing && !immediate) return

      if (!user?.id || convIds.length === 0) {
        setUnreadTotal(0)
        return
      }

      setIsRefreshing(true)
      try {
        const counts = await messagingService.getConversationUnreadCounts(convIds, user.id)
        const total = Object.values(counts).reduce((a, b) => a + (b || 0), 0)
        setUnreadTotal(total)
      } catch (err) {
        console.error("Failed to refresh unread counts:", err)
        // Don't reset to 0 on error, keep current count
      } finally {
        setIsRefreshing(false)
      }
    }
  }, [user?.id, convIds, isRefreshing])

  useEffect(() => {
    let unsubscribers: (() => void)[] = []
    const load = async () => {
      if (!user?.id) return

      try {
        const convs = await messagingService.getConversations(user.id)
        const ids = convs.map((c: any) => c.id)
        setConvIds(ids)

        await refreshUnreadCounts(true)

        unsubscribers = ids.map((id) =>
          realtime.subscribeToMessageUpdates(id, {
            onInsert: async (row: any) => {
              if (row.sender_id !== user.id) {
                await refreshUnreadCounts(true)
              }
            },
            onUpdate: async () => {
              await refreshUnreadCounts(true)
            },
          }),
        )

        const offOpen = events.on("conversationOpened", async ({ conversationId }) => {
          try {
            const currentCount = await messagingService.getUnreadCount(conversationId, user.id)
            setUnreadTotal((prev) => Math.max(0, prev - currentCount))
            setTimeout(() => refreshUnreadCounts(true), 50)
          } catch (err) {
            console.error("Error updating unread count on conversation open:", err)
            // Fallback to immediate refresh
            refreshUnreadCounts(true)
          }
        })

        const offUnread = events.on("unreadCountsChanged", () => {
          refreshUnreadCounts(true)
        })

        unsubscribers.push(offOpen, offUnread)
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
        tabBarActiveTintColor: "#FF6B6B",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeNavigator} />
      <Tab.Screen name="Events" component={EventsNavigator} />
      <Tab.Screen
        name="Community"
        component={CommunityNavigator}
        options={{
          tabBarBadge: unreadTotal > 0 ? (unreadTotal > 99 ? "99+" : unreadTotal.toString()) : undefined,
        }}
      />
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  )
}

// Main App Component
function AppContent() {
  const { user, loading } = useAuth()

  return (
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
  )
}

// Root App Component
export default function App() {
  return (
    <AuthProvider>
      <OfflineProvider>
        <StatusBar style="auto" />
        <AppContent />
      </OfflineProvider>
    </AuthProvider>
  )
}
