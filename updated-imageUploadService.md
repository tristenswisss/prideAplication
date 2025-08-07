# Updated Image Upload Service for Supabase Integration

To update the image upload service to work with Supabase storage bucket "mirae", replace the current implementation with the following code:

```typescript
import * as ImagePicker from "expo-image-picker"
import { Platform } from "react-native"
import { supabase } from "../lib/supabase"

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

  // Upload image to Supabase storage bucket "mirae"
  uploadImage: async (imageUri: string): Promise<string> => {
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error("User not authenticated")
      }
      
      // Generate a unique file name
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.jpg`
      
      // Fetch the image as a blob
      const response = await fetch(imageUri)
      const blob = await response.blob()
      
      // Upload the image to the "mirae" bucket
      const { data, error } = await supabase.storage
        .from("mirae")
        .upload(fileName, blob, {
          cacheControl: "3600",
          upsert: false
        })
      
      if (error) {
        throw error
      }
      
      // Get the public URL of the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from("mirae")
        .getPublicUrl(fileName)
      
      return publicUrl
    } catch (error) {
      console.error("Error uploading image:", error)
      throw error
    }
  },
}
```

## Key Changes Made:

1. Added import for the Supabase client from `../lib/supabase`
2. Replaced the mock `uploadImage` function with a real implementation that:
   - Gets the current authenticated user
   - Generates a unique file name using the user ID and timestamp
   - Fetches the image as a blob from the URI
   - Uploads the image to the "mirae" bucket in Supabase storage
   - Returns the public URL of the uploaded image

## Required Setup:

1. Create a storage bucket named "mirae" in your Supabase project
2. Set appropriate security policies for the bucket to allow authenticated users to upload and read files
3. Ensure the Supabase client is properly configured with storage access

## Security Policies:

You should set up the following policies for the "mirae" bucket:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Users can upload files" ON storage.objects 
FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'mirae');

-- Allow public read access to files
CREATE POLICY "Public read access" ON storage.objects 
FOR SELECT TO public 
USING (bucket_id = 'mirae');

-- Allow users to update their own files
CREATE POLICY "Users can update their own files" ON storage.objects 
FOR UPDATE TO authenticated 
USING (bucket_id = 'mirae' AND owner = auth.uid());

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own files" ON storage.objects 
FOR DELETE TO authenticated 
USING (bucket_id = 'mirae' AND owner = auth.uid());
```

This implementation ensures that images are properly uploaded to the Supabase storage bucket "mirae" and can be accessed by the application.