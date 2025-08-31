"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert, Image } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialIcons } from "@expo/vector-icons"
import { useAuth } from "../../Contexts/AuthContexts"
import { imageUploadService } from "../../services/imageUploadService"
import { profileService } from "../../services/profileService"
import type { EditProfileScreenProps } from "../../types/navigation"
import { useTheme } from "../../Contexts/ThemeContext"

export default function EditProfileScreen({ navigation }: EditProfileScreenProps) {
  const { user, refreshUser } = useAuth()
  const { theme } = useTheme()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    bio: "",
    phone: "",
    location: "",
    website: "",
    pronouns: "",
    interests: [] as string[],
  })
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(user?.avatar_url || null)

  const [privacySettings, setPrivacySettings] = useState({
    profileVisible: true,
    showEmail: false,
    showPhone: false,
    allowMessages: true,
    showLocation: true,
  })

  useEffect(() => {
    const loadExistingProfile = async () => {
      if (!user?.id) return
      try {
        const result = await profileService.getProfile(user.id)
        if (result.success && result.data) {
          const dbUser: any = result.data
          const profile = Array.isArray(dbUser.profiles) ? dbUser.profiles[0] : dbUser.profiles
          setFormData((prev) => ({
            ...prev,
            name: dbUser.name || prev.name,
            email: dbUser.email || prev.email,
            bio: dbUser.bio || "",
            location: dbUser.location || "",
            pronouns: dbUser.pronouns || "",
            interests: dbUser.interests || [],
          }))
          setCurrentAvatarUrl(dbUser.avatar_url || null)
          setPrivacySettings((prev) => ({
            ...prev,
            profileVisible: profile?.show_profile ?? true,
            allowMessages: profile?.allow_direct_messages ?? true,
          }))
        }
      } catch (e) {
        // ignore
      }
    }
    loadExistingProfile()
  }, [user?.id])

  const interestOptions = [
    "Art & Culture",
    "Music",
    "Sports",
    "Food & Dining",
    "Travel",
    "Technology",
    "Books",
    "Movies",
    "Fashion",
    "Health & Wellness",
    "Activism",
    "Community Events",
  ]

  const handlePickImage = async () => {
    try {
      const result = await imageUploadService.pickImage()
      if (result && !result.canceled && result.assets && result.assets.length > 0) {
        setProfileImage(result.assets[0].uri)
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image")
    }
  }

  const handleTakePhoto = async () => {
    try {
      const result = await imageUploadService.takePhoto()
      if (result && !result.canceled && result.assets && result.assets.length > 0) {
        setProfileImage(result.assets[0].uri)
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo")
    }
  }

  // Helper function to save profile data
  const saveProfileData = async (avatarUrl?: string) => {
    if (user?.id) {
      const profileData = {
        name: formData.name,
        bio: formData.bio,
        avatar_url: avatarUrl || undefined,
        pronouns: formData.pronouns,
        location: formData.location,
        show_profile: privacySettings.profileVisible,
        allow_direct_messages: privacySettings.allowMessages,
      }

      console.log("Saving profile data:", profileData)
      const { data, error } = await profileService.updateProfile(user.id, profileData)

      if (error) {
        throw new Error(error)
      }

      // persist in context
      await refreshUser()

      Alert.alert("Success", "Profile updated successfully!")
      navigation.goBack()
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Name is required")
      return
    }

    setLoading(true)
    try {
      let avatarUrl: string | undefined = undefined
      
      // Upload image if selected
      if (profileImage) {
        try {
          console.log("Uploading profile image...")
          const uploadResult = await imageUploadService.uploadImage(profileImage, user!.id, "avatars")
          if (!uploadResult.success || !uploadResult.url) {
            throw new Error(uploadResult.error || "Failed to upload avatar")
          }
          avatarUrl = uploadResult.url
          console.log("Image uploaded successfully:", avatarUrl)
        } catch (imageError: any) {
          console.error("Image upload failed:", imageError)
          // Ask user if they want to continue without the image
          Alert.alert(
            "Image Upload Failed", 
            `${imageError.message}\n\nWould you like to save your profile without the new photo?`,
            [
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => {
                  setLoading(false)
                  return
                }
              },
              {
                text: "Save Without Photo",
                onPress: async () => {
                  await saveProfileData(undefined)
                }
              }
            ]
          )
          return
        }
      }

      await saveProfileData(avatarUrl)
    } catch (error: any) {
      console.error("Error updating profile:", error)
      Alert.alert("Error", `Failed to update profile: ${error.message || error}`)
    } finally {
      setLoading(false)
    }
  }

  const toggleInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i: string) => i !== interest)
        : [...prev.interests, interest],
    }))
  }

  const togglePrivacySetting = (setting: keyof typeof privacySettings) => {
    setPrivacySettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }))
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient colors={[theme.colors.headerBackground, theme.colors.headerBackground]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={theme.colors.headerText} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.headerText }]}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} style={[styles.saveButton, { backgroundColor: theme.colors.surface }]} disabled={loading}>
            <Text style={[styles.saveButtonText, { color: theme.colors.text }]}>{loading ? "Saving..." : "Save"}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Photo Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Profile Photo</Text>
          <View style={styles.photoContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : currentAvatarUrl ? (
              <Image source={{ uri: currentAvatarUrl }} style={styles.profileImage} />
            ) : (
              <View style={[styles.photoPlaceholder, { backgroundColor: theme.colors.card }]}>
                <MaterialIcons name="person" size={60} color={theme.colors.textTertiary} />
              </View>
            )}
            <View style={styles.changePhotoActions}>
              <TouchableOpacity style={[styles.changePhotoButton, { borderColor: theme.colors.border }]} onPress={handlePickImage}>
                <MaterialIcons name="photo-library" size={20} color={theme.colors.text} />
                <Text style={[styles.changePhotoText, { color: theme.colors.text }]}>Choose Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.changePhotoButton, { borderColor: theme.colors.border }]} onPress={handleTakePhoto}>
                <MaterialIcons name="camera-alt" size={20} color={theme.colors.text} />
                <Text style={[styles.changePhotoText, { color: theme.colors.text }]}>Take Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Basic Information */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Basic Information</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              value={formData.name}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
              placeholder="Enter your name"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Email</Text>
            <TextInput
              style={[styles.input, styles.disabledInput, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.textSecondary }]}
              value={formData.email}
              editable={false}
              placeholder="Email address"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              value={formData.bio}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, bio: text }))}
              placeholder="Tell us about yourself..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Pronouns</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              value={formData.pronouns}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, pronouns: text }))}
              placeholder="e.g., they/them, she/her, he/him"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
        </View>

        {/* Contact Information */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Contact Information</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Phone</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              value={formData.phone}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, phone: text }))}
              placeholder="Phone number"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Location</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              value={formData.location}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, location: text }))}
              placeholder="City, State"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Website</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              value={formData.website}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, website: text }))}
              placeholder="https://yourwebsite.com"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="url"
            />
          </View>
        </View>

        {/* Interests */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Interests</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>Select topics you're interested in</Text>
          <View style={styles.interestsContainer}>
            {interestOptions.map((interest) => (
              <TouchableOpacity
                key={interest}
                style={[
                  styles.interestTag,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                  formData.interests.includes(interest) && [styles.selectedInterestTag, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]
                ]}
                onPress={() => toggleInterest(interest)}
              >
                <Text
                  style={[
                    styles.interestTagText,
                    { color: theme.colors.textSecondary },
                    formData.interests.includes(interest) && [styles.selectedInterestTagText, { color: theme.colors.surface }],
                  ]}
                >
                  {interest}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Privacy Settings */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Privacy Settings</Text>

          {Object.entries(privacySettings).map(([key, value]) => (
            <TouchableOpacity
              key={key}
              style={[styles.privacyOption, { borderBottomColor: theme.colors.divider }]}
              onPress={() => togglePrivacySetting(key as keyof typeof privacySettings)}
            >
              <View style={styles.privacyOptionContent}>
                <Text style={[styles.privacyOptionTitle, { color: theme.colors.text }]}>
                  {key === "profileVisible" && "Profile Visible to Others"}
                  {key === "showEmail" && "Show Email Address"}
                  {key === "showPhone" && "Show Phone Number"}
                  {key === "allowMessages" && "Allow Direct Messages"}
                  {key === "showLocation" && "Show Location"}
                </Text>
                <Text style={[styles.privacyOptionDescription, { color: theme.colors.textSecondary }]}>
                  {key === "profileVisible" && "Others can find and view your profile"}
                  {key === "showEmail" && "Display email on your public profile"}
                  {key === "showPhone" && "Display phone number on your profile"}
                  {key === "allowMessages" && "Allow other users to message you"}
                  {key === "showLocation" && "Display your location on your profile"}
                </Text>
              </View>
              <View style={[styles.toggle, { backgroundColor: theme.colors.card }, value && [styles.toggleActive, { backgroundColor: theme.colors.primary }]]}>
                <View style={[styles.toggleThumb, { backgroundColor: theme.colors.surface }, value && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 20,
  },
  saveButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: "white",
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
  },
  photoContainer: {
    alignItems: "center",
    marginTop: 10,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  changePhotoActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  changePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "black",
    marginHorizontal: 5,
  },
  changePhotoText: {
    marginLeft: 8,
    color: "black",
    fontWeight: "600",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "white",
  },
  disabledInput: {
    backgroundColor: "#f5f5f5",
    color: "#999",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  interestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  interestTag: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  selectedInterestTag: {
    backgroundColor: "#FF6B6B",
    borderColor: "#FF6B6B",
  },
  interestTagText: {
    fontSize: 14,
    color: "#666",
  },
  selectedInterestTagText: {
    color: "white",
  },
  privacyOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  privacyOptionContent: {
    flex: 1,
  },
  privacyOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  privacyOptionDescription: {
    fontSize: 14,
    color: "#666",
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#ddd",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: "black",
     borderRadius: 15,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
})