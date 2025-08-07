import type { StackScreenProps } from "@react-navigation/stack"
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs"
import type { LiveEvent } from "./messaging"

// Define the RootStackParamList for the root navigator that switches between main app and auth
export type RootStackParamList = {
  Main: undefined
  Auth: undefined
}

// Define the AuthStackParamList for the authentication flow
export type AuthStackParamList = {
  Loading: undefined
  Auth: undefined
}

// Define the TabParamList for the bottom tab navigator
export type TabParamList = {
  Home: undefined
  Search: undefined
  Events: undefined
  Community: undefined
  Profile: undefined
}

// Define the HomeStackParamList for home-related screens
export type HomeStackParamList = {
  HomeMain: undefined
  BusinessDetails: { business: import("./index").Business }
  WriteReview: { business: import("./index").Business }
  Search: undefined
}

// Define the SearchStackParamList for search-related screens
export type SearchStackParamList = {
  SearchMain: undefined
  BusinessDetails: { business: import("./index").Business }
  WriteReview: { business: import("./index").Business }
}

// Define the EventsStackParamList with the new screen types
export type EventsStackParamList = {
  EventsMain: undefined
  EventDetails: { event: any } // Assuming Event type is defined elsewhere
  LiveEvent: { liveEvent: LiveEvent } // Changed from { eventId: string } to match actual usage
  Recordings: { eventId: string }
  CreateEvent: undefined
}

// Define the CommunityStackParamList for community-related screens
export type CommunityStackParamList = {
  CommunityMain: undefined
  UserProfile: { userId: string }
  Chat: { conversation: import("./messaging").Conversation }
  Messages: undefined
  Events: { screen: "EventsMain" } | { screen: "EventDetails"; params: { event: any } }
}

// Define the ProfileStackParamList with the new screen types
export type ProfileStackParamList = {
  ProfileMain: undefined
  UserProfile: { userId: string }
  Safety: undefined
  BuddySystem: undefined
  MentalHealth: undefined
  Notifications: undefined
  EditProfile: undefined
  SavedPlaces: undefined
  MyEvents: undefined
  NotificationSettings: undefined
  PrivacySafety: undefined
  HelpSupport: undefined
  BusinessDetails: { business: import("./index").Business }
  Home: { screen: "BusinessDetails"; params: { business: import("./index").Business } } | { screen: "HomeMain" }
  Search: { screen: "SearchMain" }
  Events: { screen: "EventsMain" } | { screen: "EventDetails"; params: { event: any } }
}

// Define the corresponding screen props types
export type RootStackScreenProps = StackScreenProps<RootStackParamList, "Main" | "Auth">
export type AuthStackScreenProps = StackScreenProps<AuthStackParamList, "Loading" | "Auth">
export type TabScreenProps = BottomTabScreenProps<TabParamList, keyof TabParamList>
export type HomeStackScreenProps = StackScreenProps<HomeStackParamList, keyof HomeStackParamList>
export type SearchStackScreenProps = StackScreenProps<SearchStackParamList, keyof SearchStackParamList>
export type EventsStackScreenProps = StackScreenProps<EventsStackParamList, keyof EventsStackParamList>
export type CommunityStackScreenProps = StackScreenProps<CommunityStackParamList, keyof CommunityStackParamList>
export type ProfileStackScreenProps = StackScreenProps<ProfileStackParamList, keyof ProfileStackParamList>

// Individual screen props for specific screens
export type EditProfileScreenProps = StackScreenProps<ProfileStackParamList, "EditProfile">
export type SavedPlacesScreenProps = StackScreenProps<ProfileStackParamList, "SavedPlaces">
export type MyEventsScreenProps = StackScreenProps<ProfileStackParamList, "MyEvents">
export type NotificationSettingsScreenProps = StackScreenProps<ProfileStackParamList, "NotificationSettings">
export type PrivacySafetyScreenProps = StackScreenProps<ProfileStackParamList, "PrivacySafety">
export type HelpSupportScreenProps = StackScreenProps<ProfileStackParamList, "HelpSupport">
export type CreateEventScreenProps = StackScreenProps<EventsStackParamList, "CreateEvent">
export type EventsScreenProps = StackScreenProps<EventsStackParamList, "EventsMain">
export type ProfileScreenProps = StackScreenProps<ProfileStackParamList, "ProfileMain">
export type ChatScreenProps = StackScreenProps<CommunityStackParamList, "Chat">
export type HomeScreenProps = StackScreenProps<HomeStackParamList, "HomeMain">
export type BusinessDetailsScreenProps = StackScreenProps<HomeStackParamList, "BusinessDetails">
export type CommunityScreenProps = StackScreenProps<CommunityStackParamList, "CommunityMain">
export type EventDetailsScreenProps = StackScreenProps<EventsStackParamList, "EventDetails">
export type WriteReviewScreenProps = StackScreenProps<HomeStackParamList, "WriteReview">
