"use client"
import { NavigationContainer } from "@react-navigation/native"
import { createStackNavigator } from "@react-navigation/stack"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { MaterialIcons } from "@expo/vector-icons"
import { StatusBar } from "expo-status-bar"
import { View, ActivityIndicator } from "react-native"

// Contexts
import { AuthProvider, useAuth } from "./Contexts/AuthContexts"
import { OfflineProvider } from "./Contexts/OfflineContext"

// Screens
import AuthScreen from "./src/screens/AuthScreen"
import LoadingScreen from "./src/screens/LoadingScreen"
import HomeScreen from "./src/screens/HomeScreen"
import SearchScreen from "./src/screens/SearchScreen"
import EventsScreen from "./src/screens/EventsScreen"
import CommunityScreen from "./src/screens/CommunityScreen"
import ProfileScreen from "./src/screens/ProfileScreen"
import BusinessDetailScreen from "./src/screens/BusinessDetailScreen"
import WriteReviewScreen from "./src/screens/writeReviewScreen"
import EventsDetailScreen from "./src/screens/EventsDetailScreen"
import LiveEventScreen from "./src/screens/LiveEventScreen"
import RecordingsScreen from "./src/screens/RecordingsScreen"
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
  TabParamList,
  HomeStackParamList,
  SearchStackParamList,
  EventsStackParamList,
  CommunityStackParamList,
  ProfileStackParamList,
} from "./types/navigation"

const RootStack = createStackNavigator<RootStackParamList>()
const AuthStack = createStackNavigator<AuthStackParamList>()
const Tab = createBottomTabNavigator<TabParamList>()
const HomeStack = createStackNavigator<HomeStackParamList>()
const SearchStack = createStackNavigator<SearchStackParamList>()
const EventsStack = createStackNavigator<EventsStackParamList>()
const CommunityStack = createStackNavigator<CommunityStackParamList>()
const ProfileStack = createStackNavigator<ProfileStackParamList>()

// Auth Stack Navigator
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Loading" component={LoadingScreen} />
      <AuthStack.Screen name="Auth" component={AuthScreen} />
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
    </HomeStack.Navigator>
  )
}

// Search Stack Navigator
function SearchNavigator() {
  return (
    <SearchStack.Navigator>
      <SearchStack.Screen name="SearchMain" component={SearchScreen} options={{ headerShown: false }} />
      <SearchStack.Screen
        name="BusinessDetails"
        component={BusinessDetailScreen}
        options={{ title: "Business Details" }}
      />
      <SearchStack.Screen name="WriteReview" component={WriteReviewScreen} options={{ title: "Write Review" }} />
    </SearchStack.Navigator>
  )
}

// Events Stack Navigator
function EventsNavigator() {
  return (
    <EventsStack.Navigator>
      <EventsStack.Screen name="EventsMain" component={EventsScreen} options={{ headerShown: false }} />
      <EventsStack.Screen name="EventDetails" component={EventsDetailScreen} options={{ title: "Event Details" }} />
      <EventsStack.Screen name="LiveEvent" component={LiveEventScreen} options={{ headerShown: false }} />
      <EventsStack.Screen name="Recordings" component={RecordingsScreen} options={{ title: "Recordings" }} />
      <EventsStack.Screen name="CreateEvent" component={CreateEventScreen} options={{ headerShown: false }} />
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
    </ProfileStack.Navigator>
  )
}

// Main Tab Navigator
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof MaterialIcons.glyphMap

          switch (route.name) {
            case "Home":
              iconName = "home"
              break
            case "Search":
              iconName = "search"
              break
            case "Events":
              iconName = "event"
              break
            case "Community":
              iconName = "people"
              break
            case "Profile":
              iconName = "person"
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
      <Tab.Screen name="Search" component={SearchNavigator} />
      <Tab.Screen name="Events" component={EventsNavigator} />
      <Tab.Screen name="Community" component={CommunityNavigator} />
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  )
}

// Main App Component
function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" }}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
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