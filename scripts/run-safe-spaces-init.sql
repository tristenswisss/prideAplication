-- Initialize safe spaces data
-- This script will be executed to populate your Supabase database

-- First, let's make sure the app_settings table exists
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Zimbabwe safe spaces into businesses table
INSERT INTO businesses (
  id, name, description, category, address, phone, website, image_url,
  rating, review_count, lgbtq_friendly, trans_friendly, wheelchair_accessible,
  verified, latitude, longitude, price_range, created_at, updated_at
) VALUES 
(
  'galz-harare',
  'GALZ - Gays and Lesbians of Zimbabwe',
  'An Association of LGBTI with membership subscription services',
  'service',
  '35 Colenbrander Milton Park, Harare',
  NULL,
  NULL,
  NULL,
  5.0,
  0,
  true,
  true,
  true,
  true,
  -17.8292,
  31.0522,
  '$',
  NOW(),
  NOW()
),
(
  'pakasipiti-harare',
  'Pakasipiti Zimbabwe LBQ Organisation',
  'Zimbabwe LBQ (Lesbian, Bisexual, Queer) Organisation providing support and advocacy',
  'service',
  '91 McMeekan Road, Belvedere, Harare',
  NULL,
  NULL,
  NULL,
  5.0,
  0,
  true,
  true,
  true,
  true,
  -17.8292,
  31.0522,
  '$',
  NOW(),
  NOW()
),
(
  'cesshar-harare',
  'Cesshar Drop In Centre',
  'Drop-in centre hosting various organizations and clinic services',
  'service',
  '91 Selous Avenue, Avenues, Harare',
  NULL,
  NULL,
  NULL,
  5.0,
  0,
  true,
  true,
  true,
  true,
  -17.8292,
  31.0522,
  '$',
  NOW(),
  NOW()
),
(
  'newstart-harare',
  'New Start Center General Clinic',
  'General clinic providing healthcare services',
  'healthcare',
  'New Africa House, 40 Kwame Nkurumah Avenue, Harare CBD',
  NULL,
  NULL,
  NULL,
  5.0,
  0,
  true,
  true,
  true,
  true,
  -17.8292,
  31.0522,
  '$',
  NOW(),
  NOW()
),
(
  'afrotopia-harare',
  'Afrotopia Cafe',
  'LGBTQ+ friendly cafe located in the National Gallery',
  'restaurant',
  'National Gallery of Zimbabwe, 20 Julius Nyerere Way, Parklane, Harare',
  NULL,
  NULL,
  NULL,
  5.0,
  0,
  true,
  true,
  true,
  true,
  -17.8292,
  31.0522,
  '$',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Insert crisis contacts and admin email into app_settings
INSERT INTO app_settings (key, value, updated_at) VALUES 
(
  'crisis_contacts',
  '[
    {
      "id": "zlhr-harare",
      "name": "Zimbabwe Lawyers for Human Rights - Harare",
      "phone": "077257247",
      "location": "Harare",
      "type": "legal",
      "available_24_7": false
    },
    {
      "id": "zlhr-mutare",
      "name": "Zimbabwe Lawyers for Human Rights - Mutare",
      "phone": "0773855718",
      "location": "Mutare",
      "type": "legal",
      "available_24_7": false
    },
    {
      "id": "zlhr-bulawayo",
      "name": "Zimbabwe Lawyers for Human Rights - Bulawayo",
      "phone": "0773855635",
      "location": "Bulawayo",
      "type": "legal",
      "available_24_7": false
    }
  ]',
  NOW()
),
(
  'admin_email',
  'prog.shout@gmail.com',
  NOW()
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Verify the data was inserted
SELECT 'Safe Spaces Inserted:' as status, COUNT(*) as count 
FROM businesses 
WHERE id IN ('galz-harare', 'pakasipiti-harare', 'cesshar-harare', 'newstart-harare', 'afrotopia-harare');

SELECT 'Settings Inserted:' as status, COUNT(*) as count 
FROM app_settings 
WHERE key IN ('crisis_contacts', 'admin_email');

-- Verify tables exist
SELECT 
  table_name, 
  table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('safe_spaces', 'crisis_contacts');

-- Check if data was inserted successfully
SELECT 'Safe Spaces Count' as table_name, COUNT(*) as count FROM safe_spaces
UNION ALL
SELECT 'Crisis Contacts Count' as table_name, COUNT(*) as count FROM crisis_contacts;

-- Display all safe spaces
SELECT 
  name,
  category,
  address,
  array_length(services, 1) as services_count,
  verified
FROM safe_spaces
ORDER BY category, name;

-- Display all crisis contacts
SELECT 
  name,
  phone,
  location,
  type
FROM crisis_contacts
ORDER BY location, name;
