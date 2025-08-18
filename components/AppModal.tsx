"use client"

import React from "react"
import { Modal, View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"

type Variant = "sheet" | "center" | "full"

interface ActionButton {
  label: string
  onPress: () => void
  disabled?: boolean
  destructive?: boolean
}

interface AppModalProps {
  visible: boolean
  onClose: () => void
  title?: string
  leftAction?: ActionButton
  rightAction?: ActionButton
  children: React.ReactNode
  variant?: Variant
}

export default function AppModal({
  visible,
  onClose,
  title,
  leftAction,
  rightAction,
  children,
  variant = "sheet",
}: AppModalProps) {
  if (variant === "full") {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={styles.fullContainer}>
          <View style={styles.header}>
            {leftAction ? (
              <TouchableOpacity onPress={leftAction.onPress} disabled={leftAction.disabled}>
                <Text style={[styles.headerAction, leftAction.disabled && styles.disabled]}>{leftAction.label}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={onClose}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            )}
            {!!title && <Text style={styles.title}>{title}</Text>}
            {rightAction ? (
              <TouchableOpacity onPress={rightAction.onPress} disabled={rightAction.disabled}>
                <Text
                  style={[
                    styles.headerAction,
                    styles.primary,
                    rightAction.destructive && styles.destructive,
                    rightAction.disabled && styles.disabled,
                  ]}
                >
                  {rightAction.label}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 24 }} />
            )}
          </View>
          <View style={styles.fullContent}>{children}</View>
        </SafeAreaView>
      </Modal>
    )
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={[
            styles.card,
            variant === "center" ? styles.cardCenter : styles.cardSheet,
          ]}
        >
          <View style={styles.header}>
            {leftAction ? (
              <TouchableOpacity onPress={leftAction.onPress} disabled={leftAction.disabled}>
                <Text style={[styles.headerAction, leftAction.disabled && styles.disabled]}>{leftAction.label}</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 48 }} />
            )}
            {!!title && <Text style={styles.title}>{title}</Text>}
            {rightAction ? (
              <TouchableOpacity onPress={rightAction.onPress} disabled={rightAction.disabled}>
                <Text
                  style={[
                    styles.headerAction,
                    styles.primary,
                    rightAction.destructive && styles.destructive,
                    rightAction.disabled && styles.disabled,
                  ]}
                >
                  {rightAction.label}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 48 }} />
            )}
          </View>
          <View style={styles.content}>{children}</View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "white",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  cardSheet: {
    paddingBottom: Platform.select({ ios: 24, android: 24 }),
  },
  cardCenter: {
    alignSelf: "center",
    marginTop: "auto",
    marginBottom: "auto",
    borderRadius: 18,
    width: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  headerAction: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
  primary: {
    color: "#4ECDC4",
  },
  destructive: {
    color: "#FF6B6B",
  },
  disabled: {
    color: "#bbb",
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  fullContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  fullContent: {
    flex: 1,
  },
})

