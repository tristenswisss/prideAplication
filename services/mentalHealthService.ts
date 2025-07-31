import { storage } from "../lib/storage"

export interface MoodEntry {
  id: string
  user_id: string
  mood: number // 1-10 scale
  energy: number // 1-10 scale
  anxiety: number // 1-10 scale
  notes?: string
  triggers?: string[]
  activities?: string[]
  created_at: string
}

export interface MoodPattern {
  period: "week" | "month" | "year"
  averageMood: number
  moodTrend: "improving" | "declining" | "stable"
  commonTriggers: string[]
  bestDays: string[]
  insights: string[]
}

export interface MentalHealthResource {
  id: string
  title: string
  description: string
  type: "article" | "video" | "podcast" | "exercise" | "hotline"
  category: "anxiety" | "depression" | "lgbtq+" | "general" | "crisis"
  url?: string
  phone?: string
  duration?: number
  difficulty?: "easy" | "medium" | "hard"
  tags: string[]
}

export interface Therapist {
  id: string
  name: string
  credentials: string[]
  specialties: string[]
  lgbtq_friendly: boolean
  accepts_insurance: boolean
  languages: string[]
  location: {
    city: string
    state: string
    remote_available: boolean
  }
  rating: number
  price_range: "$" | "$$" | "$$$"
  availability: "immediate" | "within_week" | "within_month"
  bio: string
  phone?: string
  email?: string
  website?: string
}

export interface WellnessTip {
  id: string
  title: string
  content: string
  category: "mindfulness" | "exercise" | "social" | "self_care" | "lgbtq+"
  difficulty: "easy" | "medium" | "hard"
  duration: number // in minutes
  mood_boost: number // 1-10 scale
}

export const mentalHealthService = {
  // Mood tracking
  logMood: async (moodData: Omit<MoodEntry, "id" | "created_at">): Promise<MoodEntry> => {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const moodEntry: MoodEntry = {
      ...moodData,
      id: Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
    }

    // Store mood entry locally
    const moodEntries = (await storage.getItem<MoodEntry[]>("mood_entries")) || []
    moodEntries.push(moodEntry)
    await storage.setItem("mood_entries", moodEntries)

    return moodEntry
  },

  // Get mood entries
  getMoodEntries: async (userId: string, days = 30): Promise<MoodEntry[]> => {
    await new Promise((resolve) => setTimeout(resolve, 200))

    const moodEntries = (await storage.getItem<MoodEntry[]>("mood_entries")) || []
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    return moodEntries
      .filter((entry) => entry.user_id === userId && new Date(entry.created_at) > cutoffDate)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  },

  // Analyze mood patterns
  analyzeMoodPatterns: async (userId: string): Promise<MoodPattern> => {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const moodEntries = await mentalHealthService.getMoodEntries(userId, 30)

    if (moodEntries.length === 0) {
      return {
        period: "month",
        averageMood: 5,
        moodTrend: "stable",
        commonTriggers: [],
        bestDays: [],
        insights: ["Start logging your mood to see patterns!"],
      }
    }

    // Calculate average mood
    const averageMood = moodEntries.reduce((sum, entry) => sum + entry.mood, 0) / moodEntries.length

    // Determine trend (simplified)
    const recentEntries = moodEntries.slice(0, 7)
    const olderEntries = moodEntries.slice(7, 14)
    const recentAvg = recentEntries.reduce((sum, entry) => sum + entry.mood, 0) / recentEntries.length
    const olderAvg = olderEntries.reduce((sum, entry) => sum + entry.mood, 0) / olderEntries.length

    let moodTrend: "improving" | "declining" | "stable" = "stable"
    if (recentAvg > olderAvg + 0.5) moodTrend = "improving"
    else if (recentAvg < olderAvg - 0.5) moodTrend = "declining"

    // Find common triggers
    const allTriggers = moodEntries.flatMap((entry) => entry.triggers || [])
    const triggerCounts = allTriggers.reduce(
      (acc, trigger) => {
        acc[trigger] = (acc[trigger] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
    const commonTriggers = Object.entries(triggerCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([trigger]) => trigger)

    // Find best days
    const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const dayMoods = moodEntries.reduce(
      (acc, entry) => {
        const day = dayOfWeek[new Date(entry.created_at).getDay()]
        if (!acc[day]) acc[day] = []
        acc[day].push(entry.mood)
        return acc
      },
      {} as Record<string, number[]>,
    )

    const bestDays = Object.entries(dayMoods)
      .map(([day, moods]) => ({
        day,
        avgMood: moods.reduce((sum, mood) => sum + mood, 0) / moods.length,
      }))
      .sort((a, b) => b.avgMood - a.avgMood)
      .slice(0, 2)
      .map(({ day }) => day)

    // Generate insights
    const insights: string[] = []
    if (moodTrend === "improving") {
      insights.push("Your mood has been improving lately! Keep up the good work.")
    } else if (moodTrend === "declining") {
      insights.push("Your mood has been declining. Consider reaching out for support.")
    }

    if (averageMood >= 7) {
      insights.push("You're maintaining a positive mood overall!")
    } else if (averageMood <= 4) {
      insights.push("Your mood has been low. Consider speaking with a mental health professional.")
    }

    if (bestDays.length > 0) {
      insights.push(`You tend to feel better on ${bestDays.join(" and ")}.`)
    }

    return {
      period: "month",
      averageMood: Math.round(averageMood * 10) / 10,
      moodTrend,
      commonTriggers,
      bestDays,
      insights,
    }
  },

  // Get mental health resources
  getMentalHealthResources: async (category?: string): Promise<MentalHealthResource[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const allResources: MentalHealthResource[] = [
      {
        id: "1",
        title: "LGBTQ+ Crisis Hotline",
        description: "24/7 crisis support for LGBTQ+ individuals",
        type: "hotline",
        category: "crisis",
        phone: "1-866-488-7386",
        tags: ["crisis", "24/7", "lgbtq+", "support"],
      },
      {
        id: "2",
        title: "Mindfulness for Anxiety",
        description: "Learn mindfulness techniques to manage anxiety",
        type: "article",
        category: "anxiety",
        url: "https://example.com/mindfulness-anxiety",
        duration: 10,
        difficulty: "easy",
        tags: ["mindfulness", "anxiety", "breathing", "meditation"],
      },
      {
        id: "3",
        title: "Coming Out Support Guide",
        description: "Resources and support for coming out",
        type: "article",
        category: "lgbtq+",
        url: "https://example.com/coming-out-guide",
        duration: 15,
        difficulty: "medium",
        tags: ["coming out", "family", "support", "lgbtq+"],
      },
      {
        id: "4",
        title: "Depression Self-Care Toolkit",
        description: "Practical tools for managing depression",
        type: "exercise",
        category: "depression",
        duration: 20,
        difficulty: "medium",
        tags: ["depression", "self-care", "coping", "tools"],
      },
      {
        id: "5",
        title: "Trans Lifeline",
        description: "Crisis support specifically for transgender individuals",
        type: "hotline",
        category: "crisis",
        phone: "877-565-8860",
        tags: ["transgender", "crisis", "support", "24/7"],
      },
    ]

    if (category) {
      return allResources.filter((resource) => resource.category === category)
    }

    return allResources
  },

  // Find therapists
  findTherapists: async (filters?: {
    lgbtq_friendly?: boolean
    location?: string
    specialties?: string[]
    insurance?: boolean
    remote?: boolean
  }): Promise<Therapist[]> => {
    await new Promise((resolve) => setTimeout(resolve, 400))

    const allTherapists: Therapist[] = [
      {
        id: "1",
        name: "Dr. Sarah Chen",
        credentials: ["PhD", "Licensed Clinical Psychologist"],
        specialties: ["LGBTQ+ Issues", "Anxiety", "Depression", "Identity Development"],
        lgbtq_friendly: true,
        accepts_insurance: true,
        languages: ["English", "Mandarin"],
        location: {
          city: "San Francisco",
          state: "CA",
          remote_available: true,
        },
        rating: 4.9,
        price_range: "$$",
        availability: "within_week",
        bio: "Specializing in LGBTQ+ mental health with over 10 years of experience. I provide a safe, affirming space for all identities.",
        phone: "(555) 123-4567",
        email: "dr.chen@example.com",
        website: "https://drchen-therapy.com",
      },
      {
        id: "2",
        name: "Alex Rodriguez, LMFT",
        credentials: ["LMFT", "Licensed Marriage and Family Therapist"],
        specialties: ["Couples Therapy", "LGBTQ+ Issues", "Trauma", "Relationship Issues"],
        lgbtq_friendly: true,
        accepts_insurance: false,
        languages: ["English", "Spanish"],
        location: {
          city: "Los Angeles",
          state: "CA",
          remote_available: true,
        },
        rating: 4.8,
        price_range: "$$$",
        availability: "within_month",
        bio: "I work with individuals and couples to build healthy, authentic relationships. LGBTQ+ affirming practice.",
        phone: "(555) 987-6543",
        website: "https://alexrodriguez-therapy.com",
      },
      {
        id: "3",
        name: "Jordan Kim, LCSW",
        credentials: ["LCSW", "Licensed Clinical Social Worker"],
        specialties: ["Anxiety", "Depression", "PTSD", "LGBTQ+ Youth"],
        lgbtq_friendly: true,
        accepts_insurance: true,
        languages: ["English", "Korean"],
        location: {
          city: "Seattle",
          state: "WA",
          remote_available: false,
        },
        rating: 4.7,
        price_range: "$",
        availability: "immediate",
        bio: "Passionate about supporting LGBTQ+ youth and young adults through life transitions and mental health challenges.",
        phone: "(555) 456-7890",
        email: "jordan@seattletherapy.com",
      },
    ]

    let filteredTherapists = allTherapists

    if (filters) {
      if (filters.lgbtq_friendly) {
        filteredTherapists = filteredTherapists.filter((t) => t.lgbtq_friendly)
      }
      if (filters.insurance) {
        filteredTherapists = filteredTherapists.filter((t) => t.accepts_insurance)
      }
      if (filters.remote) {
        filteredTherapists = filteredTherapists.filter((t) => t.location.remote_available)
      }
      if (filters.specialties && filters.specialties.length > 0) {
        filteredTherapists = filteredTherapists.filter((t) =>
          filters.specialties!.some((specialty) =>
            t.specialties.some((ts) => ts.toLowerCase().includes(specialty.toLowerCase())),
          ),
        )
      }
    }

    return filteredTherapists
  },

  // Get wellness tips
  getWellnessTips: async (moodLevel?: number): Promise<WellnessTip[]> => {
    await new Promise((resolve) => setTimeout(resolve, 200))

    const allTips: WellnessTip[] = [
      {
        id: "1",
        title: "5-Minute Breathing Exercise",
        content:
          "Take 5 deep breaths, inhaling for 4 counts, holding for 4, and exhaling for 6. This activates your parasympathetic nervous system.",
        category: "mindfulness",
        difficulty: "easy",
        duration: 5,
        mood_boost: 6,
      },
      {
        id: "2",
        title: "Gratitude Journaling",
        content: "Write down 3 things you're grateful for today. Focus on specific details and how they made you feel.",
        category: "self_care",
        difficulty: "easy",
        duration: 10,
        mood_boost: 7,
      },
      {
        id: "3",
        title: "Quick Walk Outside",
        content: "Take a 10-minute walk outside. Fresh air and movement can significantly boost your mood and energy.",
        category: "exercise",
        difficulty: "easy",
        duration: 10,
        mood_boost: 8,
      },
      {
        id: "4",
        title: "Connect with LGBTQ+ Community",
        content:
          "Reach out to a friend in the community or join an online LGBTQ+ support group. Connection is healing.",
        category: "social",
        difficulty: "medium",
        duration: 30,
        mood_boost: 9,
      },
      {
        id: "5",
        title: "Progressive Muscle Relaxation",
        content:
          "Tense and release each muscle group for 5 seconds, starting from your toes and working up to your head.",
        category: "mindfulness",
        difficulty: "medium",
        duration: 15,
        mood_boost: 7,
      },
    ]

    // If mood level is provided, prioritize tips that might help
    if (moodLevel && moodLevel <= 5) {
      // For low mood, prioritize high mood-boost tips
      return allTips.sort((a, b) => b.mood_boost - a.mood_boost).slice(0, 3)
    }

    return allTips
  },

  // Schedule therapy appointment (mock)
  scheduleAppointment: async (
    therapistId: string,
    userId: string,
    preferredTimes: string[],
  ): Promise<{ success: boolean; appointmentId?: string; message: string }> => {
    await new Promise((resolve) => setTimeout(resolve, 600))

    // Mock appointment scheduling
    const appointmentId = Math.random().toString(36).substr(2, 9)

    return {
      success: true,
      appointmentId,
      message: "Appointment request sent! The therapist will contact you within 24 hours to confirm.",
    }
  },
}
