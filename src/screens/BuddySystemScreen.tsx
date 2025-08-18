import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialIcons } from "@expo/vector-icons"
import AppModal from "../../components/AppModal"

interface BuddySystemScreenProps {
  navigation: any
}

export default function BuddySystemScreen({ navigation }: BuddySystemScreenProps) {
  const [isRequestModalVisible, setIsRequestModalVisible] = useState(false)
  const [requestMessage, setRequestMessage] = useState("")

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["black", "black"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Buddy System</Text>
          <View style={{ width: 24 }} />
        </View>
        <Text style={styles.headerSubtitle}>Find and coordinate with trusted buddies</Text>
      </LinearGradient>

      <View style={styles.body}>
        <Text style={styles.infoText}>Discover buddies nearby and send requests to connect.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setIsRequestModalVisible(true)}>
          <MaterialIcons name="person-add" size={20} color="white" />
          <Text style={styles.primaryButtonText}>Request Buddy</Text>
        </TouchableOpacity>
      </View>

      <AppModal
        visible={isRequestModalVisible}
        onClose={() => setIsRequestModalVisible(false)}
        title="Request Buddy"
        leftAction={{ label: "Cancel", onPress: () => setIsRequestModalVisible(false) }}
        rightAction={{ label: "Send", onPress: () => setIsRequestModalVisible(false), disabled: !requestMessage.trim() }}
        variant="sheet"
      >
        <View style={styles.requestContainer}>
          <Text style={styles.requestLabel}>Message</Text>
          <TextInput
            style={styles.requestInput}
            placeholder="Introduce yourself and share why you'd like to connect"
            value={requestMessage}
            onChangeText={setRequestMessage}
            placeholderTextColor="#666"
            multiline
          />
        </View>
      </AppModal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "white",
    opacity: 0.9,
  },
  body: {
    padding: 20,
  },
  infoText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 16,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#4ECDC4",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  requestContainer: {
    gap: 8,
  },
  requestLabel: {
    fontSize: 14,
    color: "#666",
  },
  requestInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fafafa",
    fontSize: 14,
    color: "#333",
  },
})