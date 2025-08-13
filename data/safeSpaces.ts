export interface SafeSpace {
  id: string
  name: string
  description: string
  category: "organization" | "clinic" | "restaurant" | "cafe" | "drop_in_center"
  address: string
  phone?: string
  email?: string
  services: string[]
  lgbtq_friendly: boolean
  trans_friendly: boolean
  verified: boolean
  created_at: string
}

export interface CrisisContact {
  id: string
  name: string
  phone: string
  location: string
  type: "legal" | "crisis" | "medical" | "general"
  available_24_7: boolean
}

export const zimbabweSafeSpaces: SafeSpace[] = [
  {
    id: "galz-harare",
    name: "GALZ - Gays and Lesbians of Zimbabwe",
    description: "An Association of LGBTI with membership subscription services",
    category: "organization",
    address: "35 Colenbrander Milton Park, Harare",
    services: ["Membership", "Support Groups", "Advocacy", "Community Events"],
    lgbtq_friendly: true,
    trans_friendly: true,
    verified: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "pakasipiti-harare",
    name: "Pakasipiti Zimbabwe LBQ Organisation",
    description: "Zimbabwe LBQ (Lesbian, Bisexual, Queer) Organisation providing support and advocacy",
    category: "organization",
    address: "91 McMeekan Road, Belvedere, Harare",
    services: ["LBQ Support", "Advocacy", "Community Programs", "Safe Spaces"],
    lgbtq_friendly: true,
    trans_friendly: true,
    verified: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "cesshar-harare",
    name: "Cesshar Drop In Centre",
    description: "Drop-in centre hosting various organizations and clinic services",
    category: "drop_in_center",
    address: "91 Selous Avenue, Avenues, Harare",
    services: ["Drop-in Services", "Clinic", "Various Organizations", "Support Services"],
    lgbtq_friendly: true,
    trans_friendly: true,
    verified: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "newstart-harare",
    name: "New Start Center General Clinic",
    description: "General clinic providing healthcare services",
    category: "clinic",
    address: "New Africa House, 40 Kwame Nkurumah Avenue, Harare CBD",
    services: ["General Healthcare", "Medical Consultations", "Health Screenings"],
    lgbtq_friendly: true,
    trans_friendly: true,
    verified: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "afrotopia-harare",
    name: "Afrotopia Cafe",
    description: "LGBTQ+ friendly cafe located in the National Gallery",
    category: "cafe",
    address: "National Gallery of Zimbabwe, 20 Julius Nyerere Way, Parklane, Harare",
    services: ["Cafe", "Safe Space", "Community Meetups", "Cultural Events"],
    lgbtq_friendly: true,
    trans_friendly: true,
    verified: true,
    created_at: new Date().toISOString(),
  },
]

export const crisisContacts: CrisisContact[] = [
  {
    id: "zlhr-harare",
    name: "Zimbabwe Lawyers for Human Rights - Harare",
    phone: "077257247",
    location: "Harare",
    type: "legal",
    available_24_7: false,
  },
  {
    id: "zlhr-mutare",
    name: "Zimbabwe Lawyers for Human Rights - Mutare",
    phone: "0773855718",
    location: "Mutare",
    type: "legal",
    available_24_7: false,
  },
  {
    id: "zlhr-bulawayo",
    name: "Zimbabwe Lawyers for Human Rights - Bulawayo",
    phone: "0773855635",
    location: "Bulawayo",
    type: "legal",
    available_24_7: false,
  },
]

export const adminContact = {
  email: "prog.shout@gmail.com",
  name: "Pride Application Admin",
}
