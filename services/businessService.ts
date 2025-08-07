import type { Business } from "../types"
import { supabase } from "../lib/supabase"

export const businessService = {
  // Get all businesses
  getAllBusinesses: async (): Promise<Business[]> => {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching businesses:', error);
      return [];
    }

    return data || [];
  },

  // Get businesses by category
  getBusinessesByCategory: async (category: string): Promise<Business[]> => {
    if (category === "all") {
      return businessService.getAllBusinesses();
    }

    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('category', category)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching businesses by category:', error);
      return [];
    }

    return data || [];
  },

  // Search businesses
  searchBusinesses: async (query: string): Promise<Business[]> => {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`);

    if (error) {
      console.error('Error searching businesses:', error);
      return [];
    }

    return data || [];
  },

  // Get businesses near location
  getBusinessesNearLocation: async (latitude: number, longitude: number, radius = 10): Promise<Business[]> => {
    // Note: Supabase doesn't have built-in geospatial functions in the free tier
    // For a production app, you might want to use PostGIS extension or a geospatial API
    // For now, we'll fetch all businesses and filter by distance on the client side
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('*');

    if (error) {
      console.error('Error fetching businesses for location search:', error);
      return [];
    }

    // Filter by distance on the client side
    return businesses.filter((business) => {
      if (!business.latitude || !business.longitude) return false;
      
      const distance = Math.sqrt(
        Math.pow(business.latitude - latitude, 2) + Math.pow(business.longitude - longitude, 2)
      );
      
      // Rough conversion for demo (1 degree ≈ 111 km)
      return distance <= radius / 111;
    });
  },

  // Get business by ID
  getBusinessById: async (id: string): Promise<Business | null> => {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching business by ID:', error);
      return null;
    }

    return data || null;
  },

  // Get featured businesses (highest rated)
  getFeaturedBusinesses: async (): Promise<Business[]> => {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .gte('rating', 4.7)
      .order('rating', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching featured businesses:', error);
      return [];
    }

    return data || [];
  },
}
