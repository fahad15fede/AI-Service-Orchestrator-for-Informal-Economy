-- KariGhar AI - Production Database Migration Schema (Supabase / PostgreSQL)
-- Description: Sets up the core profiles, providers, bookings, and live coordinates tracking tables.
-- Equipped with Row Level Security (RLS) policies, PostGIS capabilities, and custom geospatial functions.

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. Create Profiles Table (User Base)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(15) UNIQUE NOT NULL, -- E.164 normalized phone format (e.g., +923001234567)
    full_name TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('client', 'provider')),
    avatar_emoji VARCHAR(10) DEFAULT '👤',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Allow public read access to profiles" 
    ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Allow users to update their own profile" 
    ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Create Providers Specialty & Coordinates Table
CREATE TABLE public.providers (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- e.g., 'plumber', 'electrician', 'ac_technician'
    category_name VARCHAR(100) NOT NULL, -- e.g., 'AC Repair'
    experience_years INT DEFAULT 1,
    rating NUMERIC(3,2) DEFAULT 5.0 CHECK (rating >= 1.0 AND rating <= 5.0),
    completed_jobs INT DEFAULT 0,
    price_rate NUMERIC(10, 2) NOT NULL, -- in PKR
    is_available BOOLEAN DEFAULT TRUE,
    
    -- Live coordinate location locks
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326), -- PostGIS Spatial Index for location matching
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger to automatically synchronize PostGIS geometry field on lat/lng updates
CREATE OR REPLACE FUNCTION update_provider_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom = st_setsrid(st_makepoint(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_provider_geom
BEFORE INSERT OR UPDATE OF latitude, longitude ON public.providers
FOR EACH ROW EXECUTE FUNCTION update_provider_geom();

-- Enable RLS for providers
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- Providers Policies
CREATE POLICY "Allow anyone to search available providers" 
    ON public.providers FOR SELECT USING (true);

CREATE POLICY "Allow providers to edit their own registry details" 
    ON public.providers FOR UPDATE USING (auth.uid() = id);

-- 3. Create Slots Reservation Calendar Table
CREATE TABLE public.provider_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE NOT NULL,
    slot_date DATE NOT NULL,
    slot_time VARCHAR(50) NOT NULL, -- e.g., '10:00 AM - 12:00 PM'
    is_locked BOOLEAN DEFAULT FALSE,
    locked_until TIMESTAMP WITH TIME ZONE,
    booking_id UUID, -- NULL if vacant, points to bookings table if booked
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for slots
ALTER TABLE public.provider_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anyone to view slots availability" 
    ON public.provider_slots FOR SELECT USING (true);

CREATE POLICY "Allow providers to manage their slots" 
    ON public.provider_slots FOR ALL USING (auth.uid() = provider_id);

-- 4. Create Bookings Table (Database state ledger)
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.profiles(id) NOT NULL,
    provider_id UUID REFERENCES public.providers(id) NOT NULL,
    service_category VARCHAR(50) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'matched', 'confirmed', 'in_transit', 'arrived', 'completed', 'cancelled')),
    time_slot_id UUID REFERENCES public.provider_slots(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Backlink slots to booking after creation
ALTER TABLE public.provider_slots ADD CONSTRAINT fk_booking FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;

-- Enable RLS for bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Bookings RLS policies
CREATE POLICY "Users can select bookings where they are client or provider"
    ON public.bookings FOR SELECT
    USING (auth.uid() = client_id OR auth.uid() = provider_id);

CREATE POLICY "Clients can create bookings"
    ON public.bookings FOR INSERT
    WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Parties can update booking status"
    ON public.bookings FOR UPDATE
    USING (auth.uid() = client_id OR auth.uid() = provider_id);

-- 5. Geospatial Match Function using PostGIS
-- Returns nearby providers sorted by distance
CREATE OR REPLACE FUNCTION find_nearby_providers(
    search_lat DOUBLE PRECISION,
    search_lng DOUBLE PRECISION,
    search_category VARCHAR(50),
    max_distance_meters FLOAT DEFAULT 5000,
    max_results INT DEFAULT 5
)
RETURNS TABLE (
    provider_id UUID,
    full_name TEXT,
    category_name VARCHAR(100),
    rating NUMERIC,
    price_rate NUMERIC,
    distance_meters FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as provider_id,
        pr.full_name,
        p.category_name,
        p.rating,
        p.price_rate,
        st_distance(
            p.geom, 
            st_setsrid(st_makepoint(search_lng, search_lat), 4326)::geography
        ) as distance_meters
    FROM public.providers p
    JOIN public.profiles pr ON p.id = pr.id
    WHERE p.is_available = TRUE
      AND p.category = search_category
      AND st_dwithin(
            p.geom, 
            st_setsrid(st_makepoint(search_lng, search_lat), 4326)::geography,
            max_distance_meters
          )
    ORDER BY distance_meters ASC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;
