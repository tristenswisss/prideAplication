# UI Access Plan for Chat and Live Event Features

## Current State Analysis

### Chat Access
1. Messages are accessed through the Community tab in the bottom navigation
2. The CommunityStack.Navigator includes a "Messages" screen that points to MessageScreen
3. From MessageScreen, users can navigate to individual chats via the "Chat" screen
4. However, there's no direct way to access messages from the CommunityScreen (main community feed)

### Live Event Access
1. Live events are accessed through the Events tab in the bottom navigation
2. The EventsStack.Navigator includes a "LiveEvent" screen that points to LiveEventScreen
3. Users can access live events from the EventsScreen (main events list)
4. There's also a "Recordings" screen for accessing recorded streams

## Proposed Improvements

### 1. Add Direct Access to Messages from Community Screen

We should add a button or icon in the CommunityScreen header to allow users to access their messages directly.

```typescript
// In CommunityScreen.tsx header section
<LinearGradient colors={["black", "black"]} style={styles.header}>
  <Text style={styles.headerTitle}>Community</Text>
  <Text style={styles.headerSubtitle}>Connect with your Pride family</Text>
  {/* Add this button for direct access to messages */}
  <TouchableOpacity 
    style={styles.messagesButton} 
    onPress={() => navigation.navigate("Messages")}
  >
    <MaterialIcons name="message" size={24} color="white" />
  </TouchableOpacity>
</LinearGradient>
```

### 2. Add Live Events Access from Community Screen

We should add a section in the CommunityScreen to highlight ongoing live events.

```typescript
// In CommunityScreen.tsx render function, add after the header
{/* Live Events Banner */}
{liveEvents.length > 0 && (
  <TouchableOpacity 
    style={styles.liveEventsBanner} 
    onPress={() => navigation.navigate("Events", { screen: "EventsMain" })}
  >
    <View style={styles.liveIndicator}>
      <View style={styles.liveDot} />
      <Text style={styles.liveText}>LIVE</Text>
    </View>
    <Text style={styles.liveEventsText}>
      {liveEvents.length} live event{liveEvents.length > 1 ? 's' : ''} happening now
    </Text>
    <MaterialIcons name="chevron-right" size={20} color="white" />
  </TouchableOpacity>
)}
```

### 3. Add Quick Actions in Community Screen

Add quick action buttons for common community activities:

```typescript
// In CommunityScreen.tsx, in the ListHeaderComponent of the FlatList
<ListHeaderComponent={
  <>
    {/* Quick Actions */}
    <View style={styles.quickActions}>
      <TouchableOpacity 
        style={styles.quickActionButton} 
        onPress={() => navigation.navigate("Messages")}
      >
        <MaterialIcons name="message" size={24} color="#FF6B6B" />
        <Text style={styles.quickActionText}>Messages</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.quickActionButton} 
        onPress={() => navigation.navigate("Events", { screen: "EventsMain" })}
      >
        <MaterialIcons name="event" size={24} color="#4ECDC4" />
        <Text style={styles.quickActionText}>Events</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.quickActionButton} 
        onPress={handleCreatePost}
      >
        <MaterialIcons name="add-circle" size={24} color="#FFD166" />
        <Text style={styles.quickActionText}>Post</Text>
      </TouchableOpacity>
    </View>
    
    <TouchableOpacity style={styles.createPostPrompt} onPress={() => setShowCreatePost(true)}>
      <Image
        source={{ uri: user?.avatar_url || "/placeholder.svg?height=40&width=40&text=U" }}
        style={styles.promptAvatar}
      />
      <Text style={styles.promptText}>Share something with the community...</Text>
      <MaterialIcons name="add" size={24} color="black" />
    </TouchableOpacity>
  </>
}
```

### 4. Add Live Event Indicator in Events Screen

In the EventsScreen, we should highlight live events more prominently:

```typescript
// In EventsScreen.tsx, in the renderEvent function
const renderEvent = ({ item }: { item: Event }) => {
  // Check if there's a live event associated with this event
  const liveEvent = liveEvents.find(le => le.event_id === item.id);
  
  return (
    <TouchableOpacity style={styles.eventCard} onPress={() => navigation.navigate("EventDetails", { event: item })}>
      {/* Add live indicator if event is live */}
      {liveEvent && liveEvent.is_live && (
        <View style={styles.liveEventBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveEventText}>LIVE NOW</Text>
        </View>
      )}
      
      {/* Rest of the event rendering code */}
      {/* ... */}
    </TouchableOpacity>
  );
};
```

### 5. Add Direct Access to Live Events from Events Detail Screen

In the EventsDetailScreen, add a button to join the live event if it's happening:

```typescript
// In EventsDetailScreen.tsx, after the RSVP buttons
{liveEvent && liveEvent.is_live && (
  <View style={styles.liveEventSection}>
    <TouchableOpacity 
      style={styles.joinLiveButton} 
      onPress={() => navigation.navigate("LiveEvent", { liveEvent })}
    >
      <MaterialIcons name="videocam" size={20} color="white" />
      <Text style={styles.joinLiveButtonText}>Join Live Event</Text>
    </TouchableOpacity>
  </View>
)}
```

### 6. Add Navigation Shortcuts in Profile Screen

In the ProfileScreen, add quick access to messages and live events:

```typescript
// In ProfileScreen.tsx, add to profileOptions
const profileOptions = [
  // Existing options...
  {
    title: "Messages",
    description: "View your conversations",
    icon: "message",
    onPress: () => navigation.navigate("Community", { screen: "Messages" }),
  },
  {
    title: "Live Events",
    description: "Join ongoing live streams",
    icon: "videocam",
    onPress: () => navigation.navigate("Events", { screen: "EventsMain" }),
  },
  // Rest of options...
];
```

## Implementation Steps

1. Add messages access button to CommunityScreen header
2. Add live events banner to CommunityScreen
3. Add quick action buttons to CommunityScreen
4. Add live event indicators to EventsScreen
5. Add join live event button to EventsDetailScreen
6. Add navigation shortcuts to ProfileScreen

These changes will make it much easier for users to access chat and live event features directly from the main UI screens they're already using.