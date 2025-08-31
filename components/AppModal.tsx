"use client"

import React from "react"
import { Modal, View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useTheme } from "../Contexts/ThemeContext"

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
  const { theme } = useTheme()
  if (variant === "full") {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={[styles.fullContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            {leftAction ? (
              <TouchableOpacity onPress={leftAction.onPress} disabled={leftAction.disabled}>
                <Text style={[styles.headerAction, leftAction.disabled && styles.disabled]}>{leftAction.label}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={onClose}>
                <MaterialIcons name="close" size={24} color={theme.colors.text} />
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
      <TouchableOpacity style={[styles.backdrop, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)' }]} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={[
            [styles.card, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }],
            variant === "center" ? styles.cardCenter : styles.cardSheet,
          ]}
        >
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            {leftAction ? (
              <TouchableOpacity onPress={leftAction.onPress} disabled={leftAction.disabled}>
                <Text style={[styles.headerAction, { color: theme.colors.textSecondary }, leftAction.disabled && [styles.disabled, { color: theme.colors.textTertiary }]]}>{leftAction.label}</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 48 }} />
            )}
            {!!title && <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>}
            {rightAction ? (
              <TouchableOpacity onPress={rightAction.onPress} disabled={rightAction.disabled}>
                <Text
                  style={[
                    styles.headerAction,
                    { color: theme.colors.primary },
                    rightAction.destructive && { color: theme.colors.error },
                    rightAction.disabled && [styles.disabled, { color: theme.colors.textTertiary }],
                  ]}
                >
                  {rightAction.label}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 48 }} />
            )}
          </View>
          <View style={styles.contentColumn}>{children}</View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  card: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
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
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  headerAction: {
    fontSize: 16,
    fontWeight: "600",
  },
  primary: {
    // This will be overridden by inline styles
  },
  destructive: {
    // This will be overridden by inline styles
  },
  disabled: {
    // This will be overridden by inline styles
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  contentColumn: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "column",
    gap: 12,
  },
  fullContainer: {
    flex: 1,
  },
  fullContent: {
    flex: 1,
  },
})

