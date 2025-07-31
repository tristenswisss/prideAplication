import { storage } from "../lib/storage"

export interface SafetyReport {
  id: string
  business_id?: string
  event_id?: string
  reporter_id: string
  type: "harassment" | "discrimination" | "unsafe_environment" | "staff_behavior" | "other"
  description: string
  severity: "low" | "medium" | "high" | "critical"
  status: "pending" | "investigating" | "resolved" | "dismissed"
  location?: {
    latitude: number
    longitude: number
    address: string
  }
  evidence?: string[]
  created_at: string
  updated_at: string
}

export interface SafetyAlert {
  id: string
  title: string
  message: string
  description: string
  type: "warning" | "advisory" | "emergency"
  severity: "low" | "medium" | "high"
  location?: {
    latitude: number
    longitude: number
    radius: number
  }
  expires_at?: string
  created_at: string
}

export interface EmergencyContact {
  id: string
  name: string
  phone: string
  relationship: "friend" | "family" | "partner" | "other"
  type: "police" | "medical" | "lgbtq_hotline" | "crisis_support" | "legal_aid" | "personal"
  available_24_7: boolean
  location?: string
}

export const safetyService = {
  // Safety Reporting
  submitSafetyReport: async (
    report: Omit<SafetyReport, "id" | "created_at" | "updated_at" | "status">,
  ): Promise<SafetyReport> => {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const newReport: SafetyReport = {
      ...report,
      id: Math.random().toString(36).substr(2, 9),
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Store report locally (in real app, send to server)
    const reports = (await storage.getItem<SafetyReport[]>("safety_reports")) || []
    reports.push(newReport)
    await storage.setItem("safety_reports", reports)

    console.log("Safety report submitted:", newReport)
    return newReport
  },

  // Get safety reports for a business
  getBusinessSafetyReports: async (businessId: string): Promise<SafetyReport[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const reports = (await storage.getItem<SafetyReport[]>("safety_reports")) || []
    return reports.filter((report) => report.business_id === businessId)
  },

  // Safety Alerts
  getSafetyAlerts: async (userId: string): Promise<SafetyAlert[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300))

    // Mock safety alerts
    const mockAlerts: SafetyAlert[] = [
      {
        id: "alert1",
        title: "Community Advisory",
        message: "Increased reports of harassment in downtown area. Stay alert and travel in groups when possible.",
        description:
          "Several community members have reported incidents of harassment in the downtown area, particularly near 5th Street. Please exercise extra caution and consider traveling with friends.",
        type: "advisory",
        severity: "medium",
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          radius: 2000, // 2km radius
        },
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "alert2",
        title: "Safety Update",
        message: "New safe space opened on Castro Street - LGBTQ+ friendly cafe with security.",
        description:
          "Rainbow Cafe has opened as a verified safe space for the LGBTQ+ community, featuring trained security staff and a zero-tolerance policy for discrimination.",
        type: "advisory",
        severity: "low",
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
    ]

    return mockAlerts
  },

  // Emergency Contacts
  getEmergencyContacts: async (userId: string): Promise<EmergencyContact[]> => {
    await new Promise((resolve) => setTimeout(resolve, 200))

    const personalContacts = (await storage.getItem<EmergencyContact[]>(`emergency_contacts_${userId}`)) || []

    const defaultContacts: EmergencyContact[] = [
      {
        id: "ec1",
        name: "LGBTQ National Hotline",
        phone: "1-888-843-4564",
        relationship: "other",
        type: "lgbtq_hotline",
        available_24_7: true,
        location: "National",
      },
      {
        id: "ec2",
        name: "Trans Lifeline",
        phone: "877-565-8860",
        relationship: "other",
        type: "crisis_support",
        available_24_7: true,
        location: "National",
      },
      {
        id: "ec3",
        name: "Emergency Services",
        phone: "911",
        relationship: "other",
        type: "police",
        available_24_7: true,
        location: "National",
      },
    ]

    return [...personalContacts, ...defaultContacts]
  },

  // Add Emergency Contact
  addEmergencyContact: async (
    userId: string,
    contact: Omit<EmergencyContact, "id" | "type" | "available_24_7">,
  ): Promise<EmergencyContact> => {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const newContact: EmergencyContact = {
      ...contact,
      id: Math.random().toString(36).substr(2, 9),
      type: "personal",
      available_24_7: false,
    }

    const contacts = (await storage.getItem<EmergencyContact[]>(`emergency_contacts_${userId}`)) || []
    contacts.push(newContact)
    await storage.setItem(`emergency_contacts_${userId}`, contacts)

    return newContact
  },

  // Safety Check-in
  performSafetyCheckIn: async (
    userId: string,
    status: "safe" | "need_help",
    location: { latitude: number; longitude: number },
  ): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const checkIn = {
      user_id: userId,
      location,
      status,
      timestamp: new Date().toISOString(),
    }

    console.log("Safety check-in:", checkIn)

    // Store check-in locally
    const checkIns = (await storage.getItem<any[]>("safety_checkins")) || []
    checkIns.push(checkIn)
    await storage.setItem("safety_checkins", checkIns)

    // In a real app, this would notify emergency contacts if status is "need_help"
    if (status === "need_help") {
      console.log("ALERT: User needs help! Notifying emergency contacts...")
    }
  },

  // Report Incident
  reportIncident: async (
    userId: string,
    incident: {
      type: string
      description: string
      location: string
      anonymous: boolean
    },
  ): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 400))

    const report = {
      id: Math.random().toString(36).substr(2, 9),
      user_id: incident.anonymous ? "anonymous" : userId,
      ...incident,
      timestamp: new Date().toISOString(),
    }

    // Store incident report locally
    const incidents = (await storage.getItem<any[]>("incident_reports")) || []
    incidents.push(report)
    await storage.setItem("incident_reports", incidents)

    console.log("Incident reported:", report)
  },

  // Business Safety Score
  calculateSafetyScore: async (businessId: string): Promise<{ score: number; factors: string[] }> => {
    await new Promise((resolve) => setTimeout(resolve, 400))

    const reports = await safetyService.getBusinessSafetyReports(businessId)
    const recentReports = reports.filter((report) => {
      const reportDate = new Date(report.created_at)
      const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
      return reportDate > sixMonthsAgo
    })

    let score = 100 // Start with perfect score
    const factors: string[] = []

    // Deduct points for safety reports
    recentReports.forEach((report) => {
      switch (report.severity) {
        case "critical":
          score -= 25
          factors.push("Critical safety incident reported")
          break
        case "high":
          score -= 15
          factors.push("High severity incident reported")
          break
        case "medium":
          score -= 10
          factors.push("Medium severity incident reported")
          break
        case "low":
          score -= 5
          factors.push("Minor incident reported")
          break
      }
    })

    // Add positive factors
    if (recentReports.length === 0) {
      factors.push("No recent safety incidents")
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      factors,
    }
  },
}
