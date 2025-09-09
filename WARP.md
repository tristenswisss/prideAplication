# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Mirae is a React Native Expo app focused on LGBTQ+ safe spaces, community building, and event management. The app uses Supabase as the backend with real-time messaging, live events, and comprehensive safety features.

## Core Commands

### Development
- `npm start` - Start Expo development server
- `npm run android` - Run on Android device/emulator  
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run web version in browser

### Building & Deployment
- `eas build --platform android --profile development` - Development build for Android
- `eas build --platform android --profile production` - Production build for Android
- `eas build --platform ios --profile production` - Production build for iOS
- `eas build --platform android --profile apk` - Generate APK file

### Environment Setup
- Copy `.env` file and update `GOOGLE_MAPS_API_KEY` for maps functionality
- Supabase configuration is in `app.config.js` and `.env`

## Architecture Overview

### Navigation Structure
- **Root Navigator**: Handles Loading → Auth → Main app flow
- **Tab Navigator**: Bottom tabs for Home, Events, Community, Profile
- **Stack Navigators**: Nested for each main section (Home, Events, Community, Profile)
- **Navigation Types**: Defined in `types/navigation.ts` with proper TypeScript support

### Core Context Providers
- **AuthProvider** (`Contexts/AuthContexts.tsx`): Manages Supabase authentication, user blocking checks, and online status
- **ThemeProvider** (`Contexts/ThemeContext.tsx`): Handles light/dark theme switching
- **OfflineProvider** (`Contexts/OfflineContext.tsx`): Manages offline state and queue actions

### Data Layer Architecture
- **Supabase Client** (`lib/supabase.ts`): Configured with AsyncStorage persistence and real-time subscriptions
- **Services Pattern** (`services/`): Business logic abstracted into dedicated services
  - `messagingService.ts` - Real-time messaging with caching and deduplication
  - `eventService.ts` - Event management with pagination and caching
  - `businessService.ts` - Safe space business directory
  - `liveEventService.ts` - Live streaming events with LiveKit integration
  - `adminService.ts` - User moderation and blocking
  - `safetyService.ts` - Safety features and buddy system
- **Caching** (`lib/queryCache.ts`): Query-level caching with expiration
- **Real-time** (`lib/realtime.ts`): Supabase real-time subscriptions for messages, live events, posts

### Key Features
- **Real-time Messaging**: End-to-end conversations with read receipts and reactions
- **Live Events**: Video streaming with live chat using LiveKit
- **Safe Spaces Directory**: LGBTQ+-friendly businesses with reviews and ratings  
- **Community Feed**: Posts, comments, and social interactions
- **Safety Features**: User blocking, reporting, buddy system, mental health resources
- **Offline Support**: Queue actions when offline, sync when back online

## Database Schema
- Full Supabase schema documented in `supabase-schema.md`
- Uses Row Level Security (RLS) policies
- Real-time subscriptions enabled for messages, notifications, posts, comments
- Comprehensive indexing for performance

## Key Development Patterns

### Service Integration
Services use consistent patterns with caching, error handling, and TypeScript types:
```typescript
export const serviceName = {
  getItems: async (): Promise<Item[]> => {
    const cacheKey = 'getItems'
    const cached = await queryCache.get<Item[]>(cacheKey)
    if (cached) return cached
    
    const { data, error } = await supabase.from('table').select('*')
    if (error) {
      console.error('Error:', error)
      return []
    }
    
    await queryCache.set(cacheKey, data, undefined, 10 * 60 * 1000)
    return data
  }
}
```

### Real-time Subscriptions
Real-time features use the centralized `realtime.ts` module:
```typescript
useEffect(() => {
  const unsubscribe = realtime.subscribeToMessages(conversationId, (message) => {
    setMessages(prev => [...prev, message])
  })
  return unsubscribe
}, [conversationId])
```

### Authentication Flow
- Users go through sign-up → email verification → profile creation
- Auth context automatically checks for blocked users on every auth state change
- Online status is tracked and synced with app foreground/background state

## File Organization

- `App.tsx` - Root component with navigation setup
- `src/screens/` - All screen components
- `components/` - Reusable UI components  
- `services/` - Business logic and API calls
- `lib/` - Utilities, configs, and low-level functionality
- `Contexts/` - React context providers
- `types/` - TypeScript type definitions
- `data/` - Mock data and constants
- `assets/` - Images, icons, and static assets

## Environment Configuration

The app uses environment variables for configuration:
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key  
- `GOOGLE_MAPS_API_KEY` - Required for maps functionality

Configuration is handled through both `.env` files and `app.config.js` with fallbacks for production builds.

## Testing

- SQL test scripts in `scripts/` directory for database functionality
- No automated test suite currently implemented
- Manual testing through Expo development builds

## Common Development Tasks

### Adding New Screens
1. Create screen component in `src/screens/`
2. Add to navigation in `App.tsx` 
3. Update `types/navigation.ts` with route parameters
4. Import and configure in appropriate navigator

### Creating New Services
1. Follow existing service patterns with caching and error handling
2. Export service object with methods
3. Use TypeScript for all interfaces and return types
4. Integrate with Supabase client for data operations

### Real-time Features
1. Add subscription method to `lib/realtime.ts`
2. Use in components with proper cleanup in useEffect
3. Enable real-time on Supabase table if needed
4. Consider RLS policies for security

### Adding Database Tables
1. Update schema in `supabase-schema.md`  
2. Create migration in Supabase dashboard
3. Add TypeScript types
4. Create corresponding service methods
5. Update RLS policies as needed
