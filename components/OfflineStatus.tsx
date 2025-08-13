import { View, Text, StyleSheet } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useOffline } from "../Contexts/OfflineContext"

export default function OfflineStatus() {
  const { isOffline } = useOffline()

  if (!isOffline) {
    return null
  }

  return (
    <View style={styles.container}>
      <MaterialIcons name="wifi-off" size={16} color="white" />
      <Text style={styles.text}>You're offline</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FF6B6B",
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  text: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
})
