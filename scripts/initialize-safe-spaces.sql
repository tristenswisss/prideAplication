-- Create safe_spaces table
CREATE TABLE IF NOT EXISTS safe_spaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('organization', 'clinic', 'restaurant', 'cafe', 'drop_in_center')),
  address TEXT NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  services TEXT[] DEFAULT '{}',
  lgbtq_friendly BOOLEAN DEFAULT true,
  trans_friendly BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create crisis_contacts table
CREATE TABLE IF NOT EXISTS crisis_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  location VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('legal', 'crisis', 'medical', 'general')),
  available_24_7 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_safe_spaces_category ON safe_spaces(category);
CREATE INDEX IF NOT EXISTS idx_safe_spaces_verified ON safe_spaces(verified);
CREATE INDEX IF NOT EXISTS idx_crisis_contacts_type ON crisis_contacts(type);
CREATE INDEX IF NOT EXISTS idx_crisis_contacts_location ON crisis_contacts(location);

-- Enable Row Level Security
ALTER TABLE safe_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for safe_spaces (read-only for authenticated users)
CREATE POLICY "Safe spaces are viewable by authenticated users" ON safe_spaces
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create policies for crisis_contacts (read-only for authenticated users)
CREATE POLICY "Crisis contacts are viewable by authenticated users" ON crisis_contacts
  FOR SELECT USING (auth.role() = 'authenticated');

-- Insert initial safe spaces data
INSERT INTO safe_spaces (name, description, category, address, services, lgbtq_friendly, trans_friendly, verified) VALUES
('GALZ - Gays and Lesbians of Zimbabwe', 'An Association of LGBTI with membership subscription services', 'organization', '35 Colenbrander Milton Park, Harare', ARRAY['Membership', 'Support Groups', 'Advocacy', 'Community Events'], true, true, true),
('Pakasipiti Zimbabwe LBQ Organisation', 'Zimbabwe LBQ (Lesbian, Bisexual, Queer) Organisation providing support and advocacy', 'organization', '91 McMeekan Road, Belvedere, Harare', ARRAY['LBQ Support', 'Advocacy', 'Community Programs', 'Safe Spaces'], true, true, true),
('Cesshar Drop In Centre', 'Drop-in centre hosting various organizations and clinic services', 'drop_in_center', '91 Selous Avenue, Avenues, Harare', ARRAY['Drop-in Services', 'Clinic', 'Various Organizations', 'Support Services'], true, true, true),
('New Start Center General Clinic', 'General clinic providing healthcare services', 'clinic', 'New Africa House, 40 Kwame Nkurumah Avenue, Harare CBD', ARRAY['General Healthcare', 'Medical Consultations', 'Health Screenings'], true, true, true),
('Afrotopia Cafe', 'LGBTQ+ friendly cafe located in the National Gallery', 'cafe', 'National Gallery of Zimbabwe, 20 Julius Nyerere Way, Parklane, Harare', ARRAY['Cafe', 'Safe Space', 'Community Meetups', 'Cultural Events'], true, true, true)
ON CONFLICT (name) DO NOTHING;

-- Insert initial crisis contacts data
INSERT INTO crisis_contacts (name, phone, location, type, available_24_7) VALUES
('Zimbabwe Lawyers for Human Rights - Harare', '077257247', 'Harare', 'legal', false),
('Zimbabwe Lawyers for Human Rights - Mutare', '0773855718', 'Mutare', 'legal', false),
('Zimbabwe Lawyers for Human Rights - Bulawayo', '0773855635', 'Bulawayo', 'legal', false)
ON CONFLICT (name, location) DO NOTHING;
