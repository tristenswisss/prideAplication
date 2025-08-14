-- Seed crisis contacts for Safety Center
-- Creates table if missing and inserts Zimbabwe Lawyers for Human Rights numbers

-- Ensure extensions for UUID if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create crisis_contacts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.crisis_contacts (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	description TEXT,
	phone TEXT NOT NULL,
	email TEXT,
	website TEXT,
	category TEXT DEFAULT 'other',
	country TEXT,
	available_hours TEXT,
	languages TEXT[] DEFAULT '{}'::TEXT[],
	services TEXT[] DEFAULT '{}'::TEXT[],
	is_active BOOLEAN DEFAULT TRUE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and allow public SELECT
ALTER TABLE public.crisis_contacts ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policy WHERE polname = 'Public can view crisis contacts'
		AND polrelid = 'public.crisis_contacts'::regclass
	) THEN
		CREATE POLICY "Public can view crisis contacts" ON public.crisis_contacts
		FOR SELECT USING (TRUE);
	END IF;
END $$;

-- Upsert Zimbabwe Lawyers for Human Rights contacts
INSERT INTO public.crisis_contacts (id, name, description, phone, email, website, category, country, available_hours, languages, services, is_active)
VALUES
	(
		'zlhr-harare',
		'Zimbabwe Lawyers for Human Rights - Harare',
		'Legal rights assistance and support in Harare',
		'077257247',
		null,
		null,
		'other',
		'Zimbabwe',
		'Business hours',
		ARRAY['English'],
		ARRAY['Legal aid','Human rights support'],
		TRUE
	),
	(
		'zlhr-mutare',
		'Zimbabwe Lawyers for Human Rights - Mutare',
		'Legal rights assistance and support in Mutare',
		'0773855718',
		null,
		null,
		'other',
		'Zimbabwe',
		'Business hours',
		ARRAY['English'],
		ARRAY['Legal aid','Human rights support'],
		TRUE
	),
	(
		'zlhr-bulawayo',
		'Zimbabwe Lawyers for Human Rights - Bulawayo',
		'Legal rights assistance and support in Bulawayo',
		'0773855635',
		null,
		null,
		'other',
		'Zimbabwe',
		'Business hours',
		ARRAY['English'],
		ARRAY['Legal aid','Human rights support'],
		TRUE
	)
ON CONFLICT (id) DO UPDATE SET
	name = EXCLUDED.name,
	description = EXCLUDED.description,
	phone = EXCLUDED.phone,
	country = EXCLUDED.country,
	available_hours = EXCLUDED.available_hours,
	languages = EXCLUDED.languages,
	services = EXCLUDED.services,
	is_active = EXCLUDED.is_active,
	updated_at = NOW();