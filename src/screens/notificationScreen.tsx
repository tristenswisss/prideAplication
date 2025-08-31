"use client"

import { useState, useEffect } from "react"
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { notificationService } from "../../services/notificationService"
import { useAuth } from "../../Contexts/AuthContexts"
import type { Notification } from "../../types"
import { useTheme } from "../../Contexts/ThemeContext"

interface NotificationsScreenProps {
  navigation: any
}

export default function NotificationsScreen({ navigation }: NotificationsScreenProps) {
  const { theme } = useTheme()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      loadNotifications()
    }
  }, [user])

  const loadNotifications = async () => {
    if (!user) return
    try {
      setLoading(true)
      const data = await notificationService.getUserNotifications(user.id)
      setNotifications(data)
    } catch (error) {
      console.error("Error loading notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId)
      setNotifications(notifications.map((n) => (n.id === notificationId ? { ...n, read: true } : n)))
    } catch (error) {
      Alert.alert("Error", "Failed to mark notification as read")
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!user) return
    try {
      await notificationService.markAllAsRead(user.id)
      setNotifications(notifications.map((n) => ({ ...n, read: true })))
    } catch (error) {
      Alert.alert("Error", "Failed to mark all notifications as read")
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "event_reminder":
        return "event"
      case "new_event":
        return "celebration"
      case "review_response":
        return "chat"
      case "friend_request":
        return "person-add"
      default:
        return "notifications"
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "event_reminder":
        return theme.colors.primary
      case "new_event":
        return theme.colors.transFriendly
      case "review_response":
        return theme.colors.secondary
      case "friend_request":
        return theme.colors.success
      default:
        return theme.colors.textSecondary
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      return "Just now"
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}d ago`
    }
  }

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationCard, {
        backgroundColor: theme.colors.card,
        shadowColor: theme.colors.shadow,
        borderLeftColor: !item.read ? theme.colors.primary : 'transparent'
      }, !item.read && styles.unreadNotification]}
      onPress={() => handleMarkAsRead(item.id)}
    >
      <View style={[styles.notificationIcon, { backgroundColor: getNotificationColor(item.type) }]}>
        <MaterialIcons name={getNotificationIcon(item.type) as any} size={20} color={theme.colors.surface} />
      </View>

      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, { color: theme.colors.text }, !item.read && [styles.unreadText, { color: theme.colors.primary }]]}>{item.title}</Text>
        <Text style={[styles.notificationMessage, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={[styles.notificationTime, { color: theme.colors.textTertiary }]}>{formatTime(item.created_at)}</Text>
      </View>

      {!item.read && <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />}
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.colors.surface + '20' }]}>
            <MaterialIcons name="arrow-back" size={24} color={theme.colors.headerText} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.headerText }]}>Notifications</Text>
          <TouchableOpacity onPress={handleMarkAllAsRead} style={[styles.markAllButton, { backgroundColor: theme.colors.surface + '20' }]}>
            <Text style={[styles.markAllText, { color: theme.colors.headerText }]}>Mark All Read</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        style={styles.notificationsList}
        contentContainerStyle={styles.notificationsListContent}
        refreshing={loading}
        onRefresh={loadNotifications}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="notifications-none" size={64} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>No notifications yet</Text>
            <Text style={[styles.emptyStateSubtext, { color: theme.colors.textTertiary }]}>
              You'll see updates about events, reviews, and community activity here
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: "600",
  },
  notificationsList: {
    flex: 1,
  },
  notificationsListContent: {
    padding: 20,
  },
  notificationCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  unreadNotification: {
    borderLeftWidth: 4,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: "bold",
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 10,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 40,
  },
})
