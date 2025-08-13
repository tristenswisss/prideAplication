import type { NavigatorScreenParams } from "@react-navigation/native"
import type { StackScreenProps } from "@react-navigation/stack"
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs"
import type { Business, Event, UserProfile } from "./index"
import type { LiveEvent } from "./messaging"

// Root Stack Navigator
export type RootStackParamList = {
  Loading: undefined
  Auth: undefined
  Main: NavigatorScreenParams<MainTabParamList>
  BusinessDetails: { business: Business }
  EventDetails: { event: Event }
  UserProfile: { user: UserProfile }
  Chat: { conversation: any }
  LiveEvent: { liveEvent: LiveEvent }
  CreateEvent: undefined
  EditProfile: undefined
  Search: undefined
  WriteReview: { business: Business }
  HelpSupport: undefined
  PrivacySafety: undefined
  NotificationSettings: undefined
}

// Main Tab Navigator
export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>
  Community: NavigatorScreenParams<CommunityStackParamList>
  Events: NavigatorScreenParams<EventsStackParamList>
  Messages: NavigatorScreenParams<MessagesStackParamList>
  Profile: NavigatorScreenParams<ProfileStackParamList>
}

// Home Stack
export type HomeStackParamList = {
  HomeMain: undefined
  BusinessDetails: { business: Business }
  Search: undefined
  SavedPlaces: undefined
}

// Community Stack
export type CommunityStackParamList = {
  CommunityMain: undefined
  UserProfile: { user: UserProfile }
  Messages: undefined
}

// Events Stack
export type EventsStackParamList = {
  EventsMain: undefined
  EventDetails: { event: Event }
  CreateEvent: undefined
  MyEvents: undefined
  LiveEvents: undefined
  LiveEvent: { liveEvent: LiveEvent }
}

// Messages Stack
export type MessagesStackParamList = {
  MessagesMain: undefined
  Chat: { conversation: any }
}

// Profile Stack
export type ProfileStackParamList = {
  ProfileMain: undefined
  EditProfile: undefined
  SavedPlaces: undefined
  MyEvents: undefined
  Recordings: undefined
  Safety: undefined
  MentalHealth: undefined
  BuddySystem: undefined
  Notifications: undefined
  HelpSupport: undefined
  PrivacySafety: undefined
  NotificationSettings: undefined
}

// Screen Props Types
export type RootStackScreenProps<T extends keyof RootStackParamList> = StackScreenProps<RootStackParamList, T>
export type MainTabScreenProps<T extends keyof MainTabParamList> = BottomTabScreenProps<MainTabParamList, T>

// Individual Screen Props
export type HomeScreenProps = StackScreenProps<HomeStackParamList, "HomeMain">
export type CommunityScreenProps = StackScreenProps<CommunityStackParamList, "CommunityMain">
export type EventsScreenProps = StackScreenProps<EventsStackParamList, "EventsMain">
export type MessagesScreenProps = StackScreenProps<MessagesStackParamList, "MessagesMain">
export type ProfileScreenProps = StackScreenProps<ProfileStackParamList, "ProfileMain">

// Additional Screen Props
export type CreateEventScreenProps = StackScreenProps<EventsStackParamList, "CreateEvent">
export type EditProfileScreenProps = StackScreenProps<ProfileStackParamList, "EditProfile">
export type BusinessDetailScreenProps = StackScreenProps<HomeStackParamList, "BusinessDetails">
export type EventDetailScreenProps = StackScreenProps<EventsStackParamList, "EventDetails">
export type UserProfileScreenProps = StackScreenProps<CommunityStackParamList, "UserProfile">
export type ChatScreenProps = StackScreenProps<MessagesStackParamList, "Chat">
export type WriteReviewScreenProps = StackScreenProps<RootStackParamList, "WriteReview">
export type HelpSupportScreenProps = StackScreenProps<RootStackParamList, "HelpSupport">
export type PrivacySafetyScreenProps = StackScreenProps<RootStackParamList, "PrivacySafety">
export type NotificationSettingsScreenProps = StackScreenProps<RootStackParamList, "NotificationSettings">

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
