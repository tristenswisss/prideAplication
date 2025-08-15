import * as DocumentPicker from "expo-document-picker"
import { supabase } from "../lib/supabase"

export interface FilePickResult {
  canceled: boolean
  name?: string
  uri?: string
  mimeType?: string
  size?: number
}

export interface FileUploadResult {
  success: boolean
  url?: string
  error?: string
  name?: string
  mimeType?: string
  size?: number
}

class FileUploadService {
  private readonly BUCKET_NAME = "mirae"

  async pickDocument(allowedTypes: string[] = ["*/*"]): Promise<FilePickResult> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        type: allowedTypes,
        copyToCacheDirectory: true,
      })

      if (result.canceled) return { canceled: true }

      const asset = Array.isArray(result.assets) ? result.assets[0] : (result as any)
      return {
        canceled: false,
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType || "application/octet-stream",
        size: asset.size,
      }
    } catch (error: any) {
      console.error("Error picking document:", error)
      return { canceled: true }
    }
  }

  async uploadFile(fileUri: string, userId: string, originalName?: string, mimeType?: string): Promise<FileUploadResult> {
    try {
      if (!fileUri) return { success: false, error: "File URI is required" }

      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 10)
      const ext = originalName?.includes(".") ? originalName.split(".").pop() : undefined
      const safeExt = ext ? `.${ext}` : ""
      const fileName = `files/${userId}/${timestamp}_${randomString}${safeExt}`

      const response = await fetch(fileUri)
      if (!response.ok) return { success: false, error: "Failed to read file data" }
      const fileData = await response.arrayBuffer()

      const contentType = mimeType || response.headers.get("Content-Type") || "application/octet-stream"

      const { data, error } = await supabase.storage.from(this.BUCKET_NAME).upload(fileName, fileData, {
        contentType,
        upsert: true,
      })

      if (error) {
        console.error("Supabase file upload error:", error)
        return { success: false, error: error.message }
      }

      const { data: urlData } = supabase.storage.from(this.BUCKET_NAME).getPublicUrl(fileName)
      if (!urlData?.publicUrl) {
        return { success: false, error: "Failed to get public URL" }
      }

      return { success: true, url: urlData.publicUrl, name: originalName, mimeType: contentType }
    } catch (error: any) {
      console.error("Error in uploadFile:", error)
      return { success: false, error: error.message }
    }
  }
}

export const fileUploadService = new FileUploadService()