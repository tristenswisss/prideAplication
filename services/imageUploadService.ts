import * as ImagePicker from "expo-image-picker"
import { Platform } from "react-native"
import * as FileSystem from "expo-file-system"
import { supabase } from "../lib/supabase"

export const imageUploadService = {
  // Request permissions for image picking
  requestPermissions: async (): Promise<boolean> => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== "granted") {
        // Also request camera permissions
        const cameraStatus = await ImagePicker.requestCameraPermissionsAsync()
        return cameraStatus.status === "granted"
      }
      return true
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
        aspect: [1, 1], // Square aspect ratio for profile pictures
        quality: 0.7, // Slightly lower quality to reduce file size
        exif: false, // Don't include EXIF data
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
        aspect: [1, 1], // Square aspect ratio for profile pictures
        quality: 0.7, // Slightly lower quality to reduce file size
        exif: false, // Don't include EXIF data
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

  // Upload image to Supabase storage bucket "mirae"
  uploadImage: async (imageUri: string): Promise<string> => {
    try {
      console.log("Starting image upload for URI:", imageUri)

      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        throw new Error(`Authentication error: ${userError.message}`)
      }
      
      if (!user) {
        throw new Error("User not authenticated")
      }

      console.log("User authenticated:", user.id)
      
      // Generate a unique file name
      const fileExtension = imageUri.split('.').pop() || 'jpg'
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`
      
      console.log("Generated filename:", fileName)

      let fileData: string | Blob

      if (Platform.OS === 'web') {
        // Web platform - use fetch to get blob
        const response = await fetch(imageUri)
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
        }
        fileData = await response.blob()
        console.log("Web blob created, size:", fileData.size)
      } else {
        // Mobile platform - use base64 string directly
        const fileInfo = await FileSystem.getInfoAsync(imageUri)
        
        if (!fileInfo.exists) {
          throw new Error("Image file does not exist")
        }

        console.log("File info:", fileInfo)

        // Read the file as base64
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        })

        if (!base64 || base64.length === 0) {
          throw new Error("Failed to read image file")
        }

        // For React Native, we need to use the decode option with base64
        fileData = base64
        console.log("Base64 string created, length:", base64.length)
      }

      // Upload the image to the "mirae" bucket
      console.log("Uploading to Supabase...")
      
      let uploadOptions: any = {
        cacheControl: "3600",
        upsert: false,
        contentType: 'image/jpeg'
      }

      // For mobile platforms, add decode option for base64
      if (Platform.OS !== 'web') {
        uploadOptions.decode = 'base64'
      }

      const { data, error } = await supabase.storage
        .from("mirae")
        .upload(fileName, fileData, uploadOptions)
      
      if (error) {
        console.error("Supabase upload error:", error)
        throw new Error(`Storage upload error: ${error.message}`)
      }

      console.log("Upload successful:", data)
      
      // Get the public URL of the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from("mirae")
        .getPublicUrl(fileName)

      console.log("Public URL generated:", publicUrl)
      
      return publicUrl
    } catch (error: any) {
      console.error("Error uploading image:", error)
      
      // More specific error messages
      if (error.message.includes('Network request failed')) {
        throw new Error('Network connection failed. Please check your internet connection and try again.')
      } else if (error.message.includes('413')) {
        throw new Error('Image file is too large. Please select a smaller image.')
      } else if (error.message.includes('401') || error.message.includes('403')) {
        throw new Error('Authentication failed. Please sign in again.')
      } else {
        throw new Error(`Image upload failed: ${error.message || error}`)
      }
    }
  },
}