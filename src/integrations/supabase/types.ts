export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      amenity_tags: {
        Row: {
          category: string
          display_name: string
          id: string
          tag: string
        }
        Insert: {
          category: string
          display_name: string
          id?: string
          tag: string
        }
        Update: {
          category?: string
          display_name?: string
          id?: string
          tag?: string
        }
        Relationships: []
      }
      attractions: {
        Row: {
          active: boolean | null
          address: string | null
          category: string
          created_at: string | null
          description: string | null
          destination_id: string
          id: string
          last_updated: string | null
          latitude: number | null
          longitude: number | null
          name: string
          opening_hours: Json | null
          price_range: string | null
          rating: number | null
          tags: string[] | null
          typical_duration_hours: number | null
          website: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          destination_id: string
          id?: string
          last_updated?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          opening_hours?: Json | null
          price_range?: string | null
          rating?: number | null
          tags?: string[] | null
          typical_duration_hours?: number | null
          website?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          destination_id?: string
          id?: string
          last_updated?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          opening_hours?: Json | null
          price_range?: string | null
          rating?: number | null
          tags?: string[] | null
          typical_duration_hours?: number | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attractions_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      climate_data: {
        Row: {
          avg_rainfall_mm: number | null
          avg_temp_c: number | null
          condition: string | null
          destination_id: string
          fortnight: number
          id: string
          last_updated: string | null
          notes: string | null
          peak_season: boolean | null
        }
        Insert: {
          avg_rainfall_mm?: number | null
          avg_temp_c?: number | null
          condition?: string | null
          destination_id: string
          fortnight: number
          id?: string
          last_updated?: string | null
          notes?: string | null
          peak_season?: boolean | null
        }
        Update: {
          avg_rainfall_mm?: number | null
          avg_temp_c?: number | null
          condition?: string | null
          destination_id?: string
          fortnight?: number
          id?: string
          last_updated?: string | null
          notes?: string | null
          peak_season?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "climate_data_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          country_code: string
          country_name: string
          created_at: string | null
          currency_code: string | null
          iata_code: string | null
          id: string
          language: string | null
          latitude: number
          longitude: number
          name: string
          region: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          country_code: string
          country_name: string
          created_at?: string | null
          currency_code?: string | null
          iata_code?: string | null
          id?: string
          language?: string | null
          latitude: number
          longitude: number
          name: string
          region?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string | null
          currency_code?: string | null
          iata_code?: string | null
          id?: string
          language?: string | null
          latitude?: number
          longitude?: number
          name?: string
          region?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      flight_routes: {
        Row: {
          active: boolean | null
          airline_iata: string
          airline_name: string | null
          created_at: string | null
          destination_iata: string
          id: string
          last_verified: string | null
          origin_iata: string
          typical_duration_min: number | null
          typical_stops: number | null
        }
        Insert: {
          active?: boolean | null
          airline_iata: string
          airline_name?: string | null
          created_at?: string | null
          destination_iata: string
          id?: string
          last_verified?: string | null
          origin_iata: string
          typical_duration_min?: number | null
          typical_stops?: number | null
        }
        Update: {
          active?: boolean | null
          airline_iata?: string
          airline_name?: string | null
          created_at?: string | null
          destination_iata?: string
          id?: string
          last_verified?: string | null
          origin_iata?: string
          typical_duration_min?: number | null
          typical_stops?: number | null
        }
        Relationships: []
      }
      hotel_amenities: {
        Row: {
          amenity_tag: string
          hotel_id: string
        }
        Insert: {
          amenity_tag: string
          hotel_id: string
        }
        Update: {
          amenity_tag?: string
          hotel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_amenities_amenity_tag_fkey"
            columns: ["amenity_tag"]
            isOneToOne: false
            referencedRelation: "amenity_tags"
            referencedColumns: ["tag"]
          },
          {
            foreignKeyName: "hotel_amenities_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          active: boolean | null
          address: string | null
          city: string
          country_code: string
          created_at: string | null
          description: string | null
          destination_id: string | null
          id: string
          last_verified: string | null
          latitude: number | null
          longitude: number | null
          name: string
          provider: string | null
          provider_id: string | null
          star_rating: number | null
          website: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          city: string
          country_code: string
          created_at?: string | null
          description?: string | null
          destination_id?: string | null
          id?: string
          last_verified?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          provider?: string | null
          provider_id?: string | null
          star_rating?: number | null
          website?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          city?: string
          country_code?: string
          created_at?: string | null
          description?: string | null
          destination_id?: string | null
          id?: string
          last_verified?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          provider?: string | null
          provider_id?: string | null
          star_rating?: number | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotels_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_requests: {
        Row: {
          created_at: string | null
          error_message: string | null
          form_data: Json
          id: string
          result: Json | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          form_data: Json
          id?: string
          result?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          form_data?: Json
          id?: string
          result?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          handle: string | null
          id: string
          passport_country: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          handle?: string | null
          id: string
          passport_country?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          handle?: string | null
          id?: string
          passport_country?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      trip_collaborators: {
        Row: {
          accepted_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          role: string
          status: string
          trip_id: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role?: string
          status?: string
          trip_id: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role?: string
          status?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_collaborators_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_collaborators_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          ai_metadata: Json | null
          created_at: string | null
          days: Json
          destination: string
          id: string
          is_bucket_list: boolean
          is_favorite: boolean | null
          is_public: boolean
          photos: string[] | null
          rating: number | null
          review: string | null
          source: string
          tags: string[] | null
          thumbnail: string | null
          title: string
          travelers: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ai_metadata?: Json | null
          created_at?: string | null
          days?: Json
          destination: string
          id?: string
          is_bucket_list?: boolean
          is_favorite?: boolean | null
          is_public?: boolean
          photos?: string[] | null
          rating?: number | null
          review?: string | null
          source: string
          tags?: string[] | null
          thumbnail?: string | null
          title: string
          travelers?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ai_metadata?: Json | null
          created_at?: string | null
          days?: Json
          destination?: string
          id?: string
          is_bucket_list?: boolean
          is_favorite?: boolean | null
          is_public?: boolean
          photos?: string[] | null
          rating?: number | null
          review?: string | null
          source?: string
          tags?: string[] | null
          thumbnail?: string | null
          title?: string
          travelers?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      visa_requirements: {
        Row: {
          destination_country: string
          id: string
          last_updated: string | null
          max_stay_days: number | null
          notes: string | null
          passport_country: string
          requirement: string
          source_url: string | null
        }
        Insert: {
          destination_country: string
          id?: string
          last_updated?: string | null
          max_stay_days?: number | null
          notes?: string | null
          passport_country: string
          requirement: string
          source_url?: string | null
        }
        Update: {
          destination_country?: string
          id?: string
          last_updated?: string | null
          max_stay_days?: number | null
          notes?: string | null
          passport_country?: string
          requirement?: string
          source_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_email_by_handle: { Args: { p_handle: string }; Returns: string }
      get_pending_invites_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_accessible_trips: {
        Args: { p_user_id: string }
        Returns: {
          ai_metadata: Json | null
          created_at: string | null
          days: Json
          destination: string
          id: string
          is_bucket_list: boolean
          is_favorite: boolean | null
          is_public: boolean
          photos: string[] | null
          rating: number | null
          review: string | null
          source: string
          tags: string[] | null
          thumbnail: string | null
          title: string
          travelers: number
          updated_at: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "trips"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      is_handle_available: { Args: { p_handle: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
