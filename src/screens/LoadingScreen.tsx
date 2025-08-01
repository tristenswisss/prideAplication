import { View, Text, StyleSheet, Animated } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useEffect, useRef } from "react"
import { useAuth } from "../../Contexts/AuthContexts"
import { storage, STORAGE_KEYS } from "../../lib/storage"
import { mockBusinesses } from "../../data/mockBusinesses"
import { mockEvents } from "../../data/mockEvents"
import type { AuthStackScreenProps } from "../../types/navigation"

export default function LoadingScreen({ navigation }: AuthStackScreenProps) {
  const { user, loading } = useAuth()
  const bounceValue = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Initialize mock data in cache
    const initializeMockData = async () => {
      try {
        // Store mock businesses in cache
        await storage.setCacheItem(STORAGE_KEYS.BUSINESSES, mockBusinesses, 60);
        
        // Store mock events in cache
        await storage.setCacheItem(STORAGE_KEYS.EVENTS, mockEvents, 60);
      } catch (error) {
        console.error("Error initializing mock data:", error);
      }
    };
    
    initializeMockData();

    // Start bouncing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceValue, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(bounceValue, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start()

    // Check if user is authenticated
    const checkAuthAndNavigate = async () => {
      // Wait for a minimum time to show the animation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      if (!loading) {
        // If user is authenticated, navigate to main app
        if (user) {
          // Navigate to the main app through the root navigator
          navigation.getParent()?.navigate("Main")
        } else {
          // If user is not authenticated, navigate to auth screen
          navigation.navigate("Auth")
        }
      }
    };
    
    checkAuthAndNavigate();
  }, [user, loading, navigation, bounceValue])

  const bounce = bounceValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  })

  return (
    <LinearGradient colors={["#FF6B6B", "#4ECDC4"]} style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={[styles.logo, { transform: [{ translateY: bounce }] }]}>
          <Text style={styles.logoText}>🏳️‍🌈</Text>
        </Animated.View>
        <Text style={styles.title}>Pride App</Text>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  logoText: {
    fontSize: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
  },
})
