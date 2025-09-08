import AsyncStorage from "@react-native-async-storage/async-storage"

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

export class QueryCache {
  private static instance: QueryCache
  private memoryCache = new Map<string, CacheEntry<any>>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_MEMORY_CACHE_SIZE = 50

  static getInstance(): QueryCache {
    if (!QueryCache.instance) {
      QueryCache.instance = new QueryCache()
    }
    return QueryCache.instance
  }

  private getCacheKey(query: string, params?: any): string {
    const paramStr = params ? JSON.stringify(params) : ''
    return `query_cache_${query}_${paramStr}`
  }

  async get<T>(query: string, params?: any): Promise<T | null> {
    const key = this.getCacheKey(query, params)

    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key)
    if (memoryEntry && Date.now() - memoryEntry.timestamp < memoryEntry.ttl) {
      return memoryEntry.data
    }

    // Check persistent cache
    try {
      const stored = await AsyncStorage.getItem(key)
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored)
        if (Date.now() - entry.timestamp < entry.ttl) {
          // Update memory cache
          this.memoryCache.set(key, entry)
          return entry.data
        } else {
          // Remove expired entry
          await AsyncStorage.removeItem(key)
        }
      }
    } catch (error) {
      console.warn('Error reading from query cache:', error)
    }

    return null
  }

  async set<T>(query: string, data: T, params?: any, ttl?: number): Promise<void> {
    const key = this.getCacheKey(query, params)
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL
    }

    // Update memory cache
    this.memoryCache.set(key, entry)

    // Maintain memory cache size limit
    if (this.memoryCache.size > this.MAX_MEMORY_CACHE_SIZE) {
      const firstKey = this.memoryCache.keys().next().value
      if (firstKey) {
        this.memoryCache.delete(firstKey)
      }
    }

    // Update persistent cache
    try {
      await AsyncStorage.setItem(key, JSON.stringify(entry))
    } catch (error) {
      console.warn('Error writing to query cache:', error)
    }
  }

  async invalidate(query: string, params?: any): Promise<void> {
    const key = this.getCacheKey(query, params)

    // Remove from memory cache
    this.memoryCache.delete(key)

    // Remove from persistent cache
    try {
      await AsyncStorage.removeItem(key)
    } catch (error) {
      console.warn('Error removing from query cache:', error)
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    // Clear memory cache entries matching pattern
    for (const [key] of this.memoryCache) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key)
      }
    }

    // Clear persistent cache entries matching pattern
    try {
      const keys = await AsyncStorage.getAllKeys()
      const matchingKeys = keys.filter(key => key.includes(pattern))
      if (matchingKeys.length > 0) {
        await AsyncStorage.multiRemove(matchingKeys)
      }
    } catch (error) {
      console.warn('Error clearing pattern from query cache:', error)
    }
  }

  async clear(): Promise<void> {
    this.memoryCache.clear()
    try {
      const keys = await AsyncStorage.getAllKeys()
      const cacheKeys = keys.filter(key => key.startsWith('query_cache_'))
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys)
      }
    } catch (error) {
      console.warn('Error clearing query cache:', error)
    }
  }

  // Get cache statistics
  getStats() {
    return {
      memoryCacheSize: this.memoryCache.size,
      maxMemoryCacheSize: this.MAX_MEMORY_CACHE_SIZE
    }
  }
}

// Export singleton instance
export const queryCache = QueryCache.getInstance()

// Helper function to create cached query wrapper
export function withCache<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  queryName: string,
  ttl?: number
) {
  return async (...args: T): Promise<R> => {
    const cacheKey = `${queryName}_${JSON.stringify(args)}`

    // Try to get from cache
    const cached = await queryCache.get<R>(cacheKey)
    if (cached !== null) {
      return cached
    }

    // Execute function and cache result
    const result = await fn(...args)
    await queryCache.set(cacheKey, result, undefined, ttl)
    return result
  }
}