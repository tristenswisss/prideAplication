import * as ImagePicker from "expo-image-picker"
import { supabase } from "../lib/supabase"

export interface ImageUploadResult {
  success: boolean
  url?: string
  error?: string
}

export interface ImageValidationResult {
  valid: boolean
  error?: string
}

class ImageUploadService {
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  private readonly ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
  private readonly BUCKET_NAME = "mirae" // Using existing bucket

  // Custom base64 to ArrayBuffer converter
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }

  async pickImage(): Promise<ImagePicker.ImagePickerResult | null> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== "granted") {
        throw new Error("Permission to access media library was denied")
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      })

      return result
    } catch (error: any) {
      console.error("Error picking image:", error)
      return null
    }
  }

  async takePhoto(): Promise<ImagePicker.ImagePickerResult | null> {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== "granted") {
        throw new Error("Permission to access camera was denied")
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      })

      return result
    } catch (error: any) {
      console.error("Error taking photo:", error)
      return null
    }
  }

  validateImageUri(uri: string): ImageValidationResult {
    if (!uri) {
      return { valid: false, error: "Image URI is required" }
    }

    if (!uri.startsWith("file://") && !uri.startsWith("data:") && !uri.startsWith("http")) {
      return { valid: false, error: "Invalid image URI format" }
    }

    return { valid: true }
  }

  async uploadImage(imageUri: string, userId?: string, folder = "posts"): Promise<ImageUploadResult> {
    try {
      console.log("Starting image upload...")
      console.log("Image URI:", imageUri)
      console.log("User ID:", userId)
      console.log("Folder:", folder)

      const validation = this.validateImageUri(imageUri)
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 15)
      const fileName = `${folder}/${userId || "anonymous"}/${timestamp}_${randomString}.jpg`

      let fileData: ArrayBuffer

      if (imageUri.startsWith("data:")) {
        const base64Data = imageUri.split(",")[1]
        if (!base64Data) {
          return { success: false, error: "Invalid base64 data" }
        }
        fileData = this.base64ToArrayBuffer(base64Data)
      } else {
        const response = await fetch(imageUri)
        if (!response.ok) {
          return { success: false, error: "Failed to fetch image data" }
        }
        fileData = await response.arrayBuffer()
      }

      if (fileData.byteLength > this.MAX_FILE_SIZE) {
        return {
          success: false,
          error: `File size too large. Maximum size is ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`,
        }
      }

      console.log("Uploading to Supabase storage...")
      console.log("File name:", fileName)
      console.log("File size:", fileData.byteLength, "bytes")

      const { data, error } = await supabase.storage.from(this.BUCKET_NAME).upload(fileName, fileData, {
        contentType: "image/jpeg",
        upsert: true,
      })

      if (error) {
        console.error("Supabase upload error:", error)
        return { success: false, error: error.message }
      }

      console.log("Upload successful:", data)

      const { data: urlData } = supabase.storage.from(this.BUCKET_NAME).getPublicUrl(fileName)

      if (!urlData?.publicUrl) {
        return { success: false, error: "Failed to get public URL" }
      }

      console.log("Public URL:", urlData.publicUrl)
      return { success: true, url: urlData.publicUrl }
    } catch (error: any) {
      console.error("Error in uploadImage:", error)
      return { success: false, error: error.message || "Unknown error occurred" }
    }
  }

  async deleteImage(imageUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
      const urlParts = imageUrl.split("/")
      const fileName = urlParts[urlParts.length - 1]
      const folder = urlParts[urlParts.length - 2]
      const userId = urlParts[urlParts.length - 3]
      const category = urlParts[urlParts.length - 4]
      const filePath = `${category}/${userId}/${fileName}`

      const { error } = await supabase.storage.from(this.BUCKET_NAME).remove([filePath])

      if (error) {
        console.error("Error deleting image:", error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      console.error("Error in deleteImage:", error)
      return { success: false, error: error.message }
    }
  }

  async uploadMultipleImages(
    imageUris: string[],
    userId?: string,
    folder = "posts",
  ): Promise<{ success: boolean; urls?: string[]; errors?: string[] }> {
    const results = await Promise.all(imageUris.map((uri) => this.uploadImage(uri, userId, folder)))

    const successful = results.filter((r) => r.success)
    const failed = results.filter((r) => !r.success)

    return {
      success: successful.length > 0,
      urls: successful.map((r) => r.url!),
      errors: failed.map((r) => r.error!),
    }
  }

  async compressImage(imageUri: string, quality = 0.8): Promise<string> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: quality,
        base64: false,
      })

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri
      }

      return imageUri
    } catch (error) {
      console.warn("Image compression failed, using original:", error)
      return imageUri
    }
  }

  async getImageDimensions(imageUri: string): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      const image = new Image()
      image.onload = () => {
        resolve({ width: image.width, height: image.height })
      }
      image.onerror = () => {
        resolve(null)
      }
      image.src = imageUri
    })
  }

  private isValidImageType(mimeType: string): boolean {
    return this.ALLOWED_TYPES.includes(mimeType.toLowerCase())
  }

  async validateImage(imageUri: string): Promise<ImageValidationResult> {
    const basicValidation = this.validateImageUri(imageUri)
    if (!basicValidation.valid) {
      return basicValidation
    }

    try {
      if (imageUri.startsWith("data:")) {
        const mimeType = imageUri.substring(5, imageUri.indexOf(";"))
        if (!this.isValidImageType(mimeType)) {
          return {
            valid: false,
            error: `Invalid image type. Allowed types: ${this.ALLOWED_TYPES.join(", ")}`,
          }
        }
      }

      return { valid: true }
    } catch (error: any) {
      return { valid: false, error: error.message }
    }
  }

  async resizeImageIfNeeded(imageUri: string, maxWidth = 1080, maxHeight = 1080): Promise<string> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri
      }

      return imageUri
    } catch (error) {
      console.warn("Image resize failed, using original:", error)
      return imageUri
    }
  }
}

export const imageUploadService = new ImageUploadService()
