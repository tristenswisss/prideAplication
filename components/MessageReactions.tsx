"use client"

import { useState } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"

interface Reaction {
  emoji: string
  count: number
  users: string[]
  hasReacted: boolean
}

interface MessageReactionsProps {
  messageId: string
  reactions: Reaction[]
  onAddReaction: (emoji: string) => void
  onRemoveReaction: (emoji: string) => void
}

const AVAILABLE_REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍", "👎", "🏳️‍🌈", "✨", "🔥"]

export default function MessageReactions({
  messageId,
  reactions,
  onAddReaction,
  onRemoveReaction,
}: MessageReactionsProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false)

  const handleReactionPress = (emoji: string) => {
    const reaction = reactions.find((r) => r.emoji === emoji)
    if (reaction?.hasReacted) {
      onRemoveReaction(emoji)
    } else {
      onAddReaction(emoji)
    }
  }

  const renderReaction = ({ item }: { item: Reaction }) => (
    <TouchableOpacity
      style={[styles.reactionButton, item.hasReacted && styles.reactionButtonActive]}
      onPress={() => handleReactionPress(item.emoji)}
    >
      <Text style={styles.reactionEmoji}>{item.emoji}</Text>
      <Text style={[styles.reactionCount, item.hasReacted && styles.reactionCountActive]}>{item.count}</Text>
    </TouchableOpacity>
  )

  const renderAvailableReaction = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.availableReactionButton}
      onPress={() => {
        onAddReaction(item)
        setShowReactionPicker(false)
      }}
    >
      <Text style={styles.availableReactionEmoji}>{item}</Text>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      {/* Existing Reactions */}
      {reactions.length > 0 && (
        <FlatList
          data={reactions}
          renderItem={renderReaction}
          keyExtractor={(item) => item.emoji}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.reactionsList}
        />
      )}

      {/* Add Reaction Button */}
      <TouchableOpacity style={styles.addReactionButton} onPress={() => setShowReactionPicker(true)}>
        <MaterialIcons name="add-reaction" size={16} color="#666" />
      </TouchableOpacity>

      {/* Reaction Picker Modal */}
      <Modal
        visible={showReactionPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReactionPicker(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowReactionPicker(false)}>
          <View style={styles.reactionPicker}>
            <FlatList
              data={AVAILABLE_REACTIONS}
              renderItem={renderAvailableReaction}
              keyExtractor={(item) => item}
              numColumns={5}
              contentContainerStyle={styles.reactionPickerContent}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  reactionsList: {
    flexGrow: 0,
  },
  reactionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  reactionButtonActive: {
    backgroundColor: "#FF6B6B",
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  reactionCount: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  reactionCountActive: {
    color: "white",
  },
  addReactionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  reactionPicker: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    margin: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  reactionPickerContent: {
    alignItems: "center",
  },
  availableReactionButton: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    margin: 5,
    borderRadius: 25,
    backgroundColor: "#f8f9fa",
  },
  availableReactionEmoji: {
    fontSize: 24,
  },
})
