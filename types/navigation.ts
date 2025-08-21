import type { NavigatorScreenParams, CompositeScreenProps } from "@react-navigation/native"
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
  WriteReview: { business: Business }
  HelpSupport: undefined
  PrivacySafety: undefined
  NotificationSettings: undefined
}

// Auth Stack Navigator (for Loading/Auth flow inside a stack)
export type AuthStackParamList = {
  SignIn: undefined
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
  SavedPlaces: undefined
  WriteReview: { business: Business }
  SuggestSafeSpace: undefined
}

 

// Community Stack
export type CommunityStackParamList = {
  CommunityMain: undefined
  UserProfile: { userId: string }
  Messages: undefined
  Chat: { conversation: any }
}

// Events Stack
export type EventsStackParamList = {
  EventsMain: undefined
  EventDetails: { event: Event }
  CreateEvent: undefined
  MyEvents: undefined
  LiveEvents: undefined
  LiveEvent: { liveEvent: LiveEvent }
  Recordings: undefined
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
  BusinessDetails: { business: Business }
  UserProfile: { userId: string }
  MyEvents: undefined
  Recordings: undefined
  Safety: undefined
  MentalHealth: undefined
  BuddySystem: undefined
  Notifications: undefined
  HelpSupport: undefined
  PrivacySafety: undefined
  NotificationSettings: undefined
  SuggestionReview: undefined
}

// Screen Props Types
export type RootStackScreenProps<T extends keyof RootStackParamList> = StackScreenProps<RootStackParamList, T>
export type MainTabScreenProps<T extends keyof MainTabParamList> = BottomTabScreenProps<MainTabParamList, T>
export type AuthStackScreenProps<T extends keyof AuthStackParamList> = StackScreenProps<AuthStackParamList, T>

// Individual Screen Props
export type HomeScreenProps = StackScreenProps<HomeStackParamList, "HomeMain">
export type CommunityScreenProps = StackScreenProps<CommunityStackParamList, "CommunityMain">
export type EventsScreenProps = StackScreenProps<EventsStackParamList, "EventsMain">
export type MessagesScreenProps = StackScreenProps<MessagesStackParamList, "MessagesMain">
export type ProfileScreenProps = CompositeScreenProps<
  StackScreenProps<ProfileStackParamList, "ProfileMain">,
  BottomTabScreenProps<MainTabParamList, "Profile">
>

// Additional Screen Props
export type CreateEventScreenProps = StackScreenProps<EventsStackParamList, "CreateEvent">
export type EditProfileScreenProps = StackScreenProps<ProfileStackParamList, "EditProfile">
export type BusinessDetailScreenProps = StackScreenProps<HomeStackParamList, "BusinessDetails">
export type EventDetailScreenProps = StackScreenProps<EventsStackParamList, "EventDetails">
export type UserProfileScreenProps = StackScreenProps<CommunityStackParamList, "UserProfile">
export type ChatScreenProps = StackScreenProps<MessagesStackParamList, "Chat">
export type WriteReviewScreenProps = StackScreenProps<HomeStackParamList, "WriteReview">
export type HelpSupportScreenProps = StackScreenProps<ProfileStackParamList, "HelpSupport">
export type PrivacySafetyScreenProps = StackScreenProps<ProfileStackParamList, "PrivacySafety">
export type NotificationSettingsScreenProps = StackScreenProps<ProfileStackParamList, "NotificationSettings">
export type SavedPlacesScreenProps = StackScreenProps<ProfileStackParamList, "SavedPlaces">
export type MyEventsScreenProps = CompositeScreenProps<
  StackScreenProps<ProfileStackParamList, "MyEvents">,
  BottomTabScreenProps<MainTabParamList, "Profile">
>

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
