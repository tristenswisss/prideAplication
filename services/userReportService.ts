import { supabase } from "../lib/supabase"

export interface UserReportPayload {
  reporter_id: string
  reported_user_id: string
  reason: string
  details?: string
}

export const userReportService = {
  submitReport: async (payload: UserReportPayload): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from("user_reports").insert({
        reporter_id: payload.reporter_id,
        reported_user_id: payload.reported_user_id,
        reason: payload.reason,
        details: payload.details || null,
        created_at: new Date().toISOString(),
      })

      if (error) {
        console.error("Error submitting user report:", error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      console.error("Error in submitReport:", error)
      return { success: false, error: error.message }
    }
  },
}