import { storage } from "../lib/storage"
import type { Post } from "../types"

export interface ModerationResult {
  isApproved: boolean
  confidence: number
  flaggedReasons: string[]
  suggestedAction: "approve" | "review" | "reject"
  moderatedContent?: string
}

export interface ModerationRule {
  id: string
  name: string
  pattern: RegExp
  severity: "low" | "medium" | "high"
  action: "flag" | "block" | "review"
}

const defaultRules: ModerationRule[] = [
  {
    id: "hate_speech",
    name: "Hate Speech",
    pattern: /\b(hate|kill|die|stupid|ugly|gross)\b/gi,
    severity: "high",
    action: "block",
  },
  {
    id: "harassment",
    name: "Harassment",
    pattern: /\b(harass|bully|stalk|threaten)\b/gi,
    severity: "high",
    action: "block",
  },
  {
    id: "spam",
    name: "Spam Content",
    pattern: /\b(buy now|click here|free money|win now)\b/gi,
    severity: "medium",
    action: "review",
  },
  {
    id: "inappropriate",
    name: "Inappropriate Content",
    pattern: /\b(explicit|nsfw|adult)\b/gi,
    severity: "medium",
    action: "flag",
  },
]

export const aiModerationService = {
  // Moderate text content
  moderateText: async (content: string): Promise<ModerationResult> => {
    await new Promise((resolve) => setTimeout(resolve, 200)) // Simulate API call

    const flaggedReasons: string[] = []
    let highestSeverity = "low"
    let confidence = 0.8

    for (const rule of defaultRules) {
      if (rule.pattern.test(content)) {
        flaggedReasons.push(rule.name)
        if (rule.severity === "high") {
          highestSeverity = "high"
          confidence = 0.95
        } else if (rule.severity === "medium" && highestSeverity !== "high") {
          highestSeverity = "medium"
          confidence = 0.85
        }
      }
    }

    let suggestedAction: "approve" | "review" | "reject" = "approve"
    let isApproved = true

    if (flaggedReasons.length > 0) {
      if (highestSeverity === "high") {
        suggestedAction = "reject"
        isApproved = false
      } else if (highestSeverity === "medium") {
        suggestedAction = "review"
        isApproved = false
      } else {
        suggestedAction = "review"
      }
    }

    return {
      isApproved,
      confidence,
      flaggedReasons,
      suggestedAction,
      moderatedContent: isApproved ? content : "[Content under review]",
    }
  },

  // Moderate post content
  moderatePost: async (post: Omit<Post, "id" | "created_at" | "updated_at">): Promise<ModerationResult> => {
    const textResult = await aiModerationService.moderateText(post.content)

    // Additional checks for posts
    if (post.tags.some((tag) => tag.toLowerCase().includes("spam"))) {
      textResult.flaggedReasons.push("Spam Tags")
      textResult.suggestedAction = "review"
      textResult.isApproved = false
    }

    return textResult
  },

  // Get moderation rules
  getModerationRules: async (): Promise<ModerationRule[]> => {
    try {
      const customRules = await storage.getItem<ModerationRule[]>("moderation_rules")
      return customRules || defaultRules
    } catch (error) {
      console.error("Error getting moderation rules:", error)
      return defaultRules
    }
  },

  // Update moderation rules
  updateModerationRules: async (rules: ModerationRule[]): Promise<void> => {
    try {
      await storage.setItem("moderation_rules", rules)
    } catch (error) {
      console.error("Error updating moderation rules:", error)
    }
  },

  // Report false positive
  reportFalsePositive: async (content: string, moderationResult: ModerationResult): Promise<void> => {
    try {
      const reports = (await storage.getItem<any[]>("false_positive_reports")) || []
      reports.push({
        content,
        moderationResult,
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9),
      })
      await storage.setItem("false_positive_reports", reports)
    } catch (error) {
      console.error("Error reporting false positive:", error)
    }
  },

  // Get moderation statistics
  getModerationStats: async (): Promise<{
    totalModerated: number
    approved: number
    rejected: number
    underReview: number
  }> => {
    try {
      const stats = (await storage.getItem("moderation_stats")) || {
        totalModerated: 0,
        approved: 0,
        rejected: 0,
        underReview: 0,
      }
      return stats
    } catch (error) {
      console.error("Error getting moderation stats:", error)
      return { totalModerated: 0, approved: 0, rejected: 0, underReview: 0 }
    }
  },
}
