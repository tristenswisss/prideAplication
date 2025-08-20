import AsyncStorage from "@react-native-async-storage/async-storage"

export const storage = {
  // Generic storage methods
  setItem: async (key: string, value: any): Promise<void> => {
    try {
      const jsonValue = JSON.stringify(value)
      await AsyncStorage.setItem(key, jsonValue)
    } catch (error) {
      console.error(`Error storing ${key}:`, error)
    }
  },

  getItem: async <T>(key: string): Promise<T | null> =>
{
  try {
    const jsonValue = await AsyncStorage.getItem(key)
    return jsonValue != null ? JSON.parse(jsonValue) : null
  } catch (error) {
    console.error(`Error retrieving ${key}:`, error)
    return null
  }
  
}
,

  removeItem: async (key: string): Promise<void> =>
{
  try {
    await AsyncStorage.removeItem(key)
  } catch (error) {
    console.error(`Error removing ${key}:`, error)
  }
  
}
,

  // Cache with expiration
  setCacheItem: async (key: string, value: any, expirationMinutes: number = 60): Promise<void> =>
{
  try {
    const expirationTime = Date.now() + expirationMinutes * 60 * 1000
    const cacheItem = {
      data: value,
      expiration: expirationTime,
    }
    await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem))
  } catch (error) {
    console.error(`Error caching ${key}:`, error)
  }
  
}
,

  getCacheItem: async <T>(key: string): Promise<T | null> =>
{
  try {
    const jsonValue = await AsyncStorage.getItem(`cache_${key}`)
    if (jsonValue != null) {
      const cacheItem = JSON.parse(jsonValue)
      if (Date.now() < cacheItem.expiration) {
        return cacheItem.data
      } else {
        // Cache expired, remove it
        await AsyncStorage.removeItem(`cache_${key}`)
      }
    }
    return null
  } catch (error) {
    console.error(`Error retrieving cached ${key}:`, error)
    return null
  }
  
}
,

  // Remove one cache item by key
  removeCacheItem: async (key: string): Promise<void> =>
{
  try {
    await AsyncStorage.removeItem(`cache_${key}`)
  } catch (error) {
    console.error(`Error removing cached ${key}:`, error)
  }
  
}
,

  // Clear all cache
  clearCache: async (): Promise<void> =>
{
  try {
    const keys = await AsyncStorage.getAllKeys()
    const cacheKeys = keys.filter((key) => key.startsWith("cache_"))
    await AsyncStorage.multiRemove(cacheKeys)
  } catch (error) {
    console.error("Error clearing cache:", error)
  }
  
}
,
}

// Specific storage keys
export const STORAGE_KEYS = {
  BUSINESSES: "businesses",
  EVENTS: "events",
  REVIEWS: "reviews",
  USER_FAVORITES: "user_favorites",
  SEARCH_HISTORY: "search_history",
  OFFLINE_ACTIONS: "offline_actions",
  LAST_SYNC: "last_sync",
}