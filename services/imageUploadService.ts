import * as ImagePicker from "expo-image-picker"
import { Platform } from "react-native"

export const imageUploadService = {
  // Request permissions for image picking
  requestPermissions: async (): Promise<boolean> => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      return status === "granted"
    }
    return true
  },

  // Pick an image from the library
  pickImage: async (): Promise<{ uri: string; type: string } | null> => {
    try {
      const permissionGranted = await imageUploadService.requestPermissions()
      if (!permissionGranted) {
        throw new Error("Permission to access media library was denied")
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0]
        return {
          uri: asset.uri,
          type: asset.type || "image/jpeg",
        }
      }

      return null
    } catch (error) {
      console.error("Error picking image:", error)
      return null
    }
  },

  // Take a photo with the camera
  takePhoto: async (): Promise<{ uri: string; type: string } | null> => {
    try {
      const permissionGranted = await imageUploadService.requestPermissions()
      if (!permissionGranted) {
        throw new Error("Permission to access camera was denied")
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0]
        return {
          uri: asset.uri,
          type: asset.type || "image/jpeg",
        }
      }

      return null
    } catch (error) {
      console.error("Error taking photo:", error)
      return null
    }
  },

  // Upload image to a mock service (in a real app, this would connect to your backend)
  uploadImage: async (imageUri: string): Promise<string> => {
    // In a real implementation, this would upload to your backend service
    // For now, we'll just return the URI as if it was uploaded
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800))
    
    // In a real app, you would do something like:
    // const formData = new FormData()
    // formData.append('image', {
    //   uri: imageUri,
    //   type: 'image/jpeg',
    //   name: 'photo.jpg',
    // })
    // const response = await fetch('YOUR_UPLOAD_ENDPOINT', {
    //   method: 'POST',
    //   body: formData,
    //   headers: {
    //     'Content-Type': 'multipart/form-data',
    //   },
    // })
    // const data = await response.json()
    // return data.url
    
    return imageUri
  },
}