import type { StackScreenProps } from "@react-navigation/stack"
import type { CompositeScreenProps } from "@react-navigation/native"
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs"
import type { Business, Event } from "./index"
import type { Conversation, LiveEvent } from "./messaging"

// Root Tab Navigator
export type RootTabParamList = {
  Home: undefined
  Community: undefined
  Events: undefined
  Messages: undefined
  Profile: undefined
}

// Home Stack Navigator
export type HomeStackParamList = {
  HomeMain: undefined
  BusinessDetails: { business: Business }
  WriteReview: { business: Business }
  Search: undefined
}

// Events Stack Navigator
export type EventsStackParamList = {
  EventsMain: undefined
  EventDetails: { event: Event }
  CreateEvent: undefined
  LiveEvents: undefined
  LiveEvent: { liveEvent: LiveEvent }
  Notifications: undefined
}

// Community Stack Navigator
export type CommunityStackParamList = {
  CommunityMain: undefined
  UserProfile: { userId: string }
}

// Messages Stack Navigator
export type MessagesStackParamList = {
  MessagesMain: undefined
  Chat: { conversation: Conversation }
}

// Screen Props Types
export type HomeScreenProps = CompositeScreenProps<
  StackScreenProps<HomeStackParamList, "HomeMain">,
  BottomTabScreenProps<RootTabParamList>
>

export type BusinessDetailsScreenProps = StackScreenProps<HomeStackParamList, "BusinessDetails">
export type WriteReviewScreenProps = StackScreenProps<HomeStackParamList, "WriteReview">

export type EventsScreenProps = CompositeScreenProps<
  StackScreenProps<EventsStackParamList, "EventsMain">,
  BottomTabScreenProps<RootTabParamList>
>

export type EventDetailsScreenProps = StackScreenProps<EventsStackParamList, "EventDetails">

export type CommunityScreenProps = CompositeScreenProps<
  StackScreenProps<CommunityStackParamList, "CommunityMain">,
  BottomTabScreenProps<RootTabParamList>
>

export type MessagesScreenProps = CompositeScreenProps<
  StackScreenProps<MessagesStackParamList, "MessagesMain">,
  BottomTabScreenProps<RootTabParamList>
>

export type ProfileScreenProps = BottomTabScreenProps<RootTabParamList, "Profile">
