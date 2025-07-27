"use client"

import { NavigationContainer } from "@react-navigation/native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createStackNavigator } from "@react-navigation/stack"
import { MaterialIcons } from "@expo/vector-icons"
import { StatusBar } from "expo-status-bar"

import { AuthProvider, useAuth } from "./Contexts/AuthContexts"
import { OfflineProvider } from "./Contexts/OfflineContext"
import AuthScreen from "./src/screens/AuthScreen"
import LoadingScreen from "./src/screens/LoadingScreen"
import OfflineStatus from "./components/OfflineStatus"
import HomeScreen from "./src/screens/HomeScreen"
import BusinessDetailsScreen from "./src/screens/BusinessDetailScreen"
import WriteReviewScreen from "./src/screens/writeReviewScreen"
import CommunityScreen from "./src/screens/CommunityScreen"
import UserProfileScreen from "./src/screens/UserProfileScreen"
import MessagesScreen from "./src/screens/MessageScreen"
import ChatScreen from "./src/screens/ChatScreen"
import EventsScreen from "./src/screens/EventsScreen"
import EventDetailsScreen from "./src/screens/EventsDetailScreen"
import LiveEventsScreen from "./src/screens/LiveEventsScreeen"
import LiveEventScreen from "./src/screens/LiveEventScreen"
import NotificationsScreen from "./src/screens/notificationScreen"
import SearchScreen from "./src/screens/SearchScreen"
import ProfileScreen from "./src/screens/ProfileScreen"

import type {
  RootTabParamList,
  HomeStackParamList,
  EventsStackParamList,
  CommunityStackParamList,
  MessagesStackParamList,
} from "./types/navigation"

const Tab = createBottomTabNavigator<RootTabParamList>()
const HomeStack = createStackNavigator<HomeStackParamList>()
const EventsStack = createStackNavigator<EventsStackParamList>()
const CommunityStack = createStackNavigator<CommunityStackParamList>()
const MessagesStack = createStackNavigator<MessagesStackParamList>()

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
      <HomeStack.Screen name="BusinessDetails" component={BusinessDetailsScreen} options={{ headerShown: false }} />
      <HomeStack.Screen name="WriteReview" component={WriteReviewScreen} options={{ headerShown: false }} />
      <HomeStack.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
    </HomeStack.Navigator>
  )
}

function EventsStackNavigator() {
  return (
    <EventsStack.Navigator>
      <EventsStack.Screen name="EventsMain" component={EventsScreen} options={{ headerShown: false }} />
      <EventsStack.Screen name="EventDetails" component={EventDetailsScreen} options={{ headerShown: false }} />
      <EventsStack.Screen name="LiveEvents" component={LiveEventsScreen} options={{ headerShown: false }} />
      <EventsStack.Screen name="LiveEvent" component={LiveEventScreen} options={{ headerShown: false }} />
      <EventsStack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
    </EventsStack.Navigator>
  )
}

function CommunityStackNavigator() {
  return (
    <CommunityStack.Navigator>
      <CommunityStack.Screen name="CommunityMain" component={CommunityScreen} options={{ headerShown: false }} />
      <CommunityStack.Screen name="UserProfile" component={UserProfileScreen} options={{ headerShown: false }} />
    </CommunityStack.Navigator>
  )
}

function MessagesStackNavigator() {
  return (
    <MessagesStack.Navigator>
      <MessagesStack.Screen name="MessagesMain" component={MessagesScreen} options={{ headerShown: false }} />
      <MessagesStack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
    </MessagesStack.Navigator>
  )
}

function MainTabs() {
  return (
    <>
      <OfflineStatus />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof MaterialIcons.glyphMap

            if (route.name === "Home") {
              iconName = "home"
            } else if (route.name === "Community") {
              iconName = "people"
            } else if (route.name === "Events") {
              iconName = "event"
            } else if (route.name === "Messages") {
              iconName = "chat"
            } else if (route.name === "Profile") {
              iconName = "person"
            } else {
              iconName = "help"
            }

            return <MaterialIcons name={iconName} size={size} color={color} />
          },
          tabBarActiveTintColor: "#FF6B6B",
          tabBarInactiveTintColor: "gray",
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderTopColor: "#f0f0f0",
            paddingBottom: 5,
            paddingTop: 5,
            height: 60,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600",
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeStackNavigator} />
        <Tab.Screen name="Community" component={CommunityStackNavigator} />
        <Tab.Screen name="Events" component={EventsStackNavigator} />
        <Tab.Screen name="Messages" component={MessagesStackNavigator} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </>
  )
}

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <NavigationContainer>
      {user ? <MainTabs /> : <AuthScreen />}
      <StatusBar style="light" />
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <OfflineProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </OfflineProvider>
  )
}
