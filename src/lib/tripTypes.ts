import { BuilderDay } from "@/pages/TripBuilder";

/**
 * Unified trip interface for both AI-generated and custom trips
 * Distinguishes source via the 'source' field while using BuilderDay as canonical format
 */
export interface SavedTrip {
  // Metadata
  id: string;
  source: 'ai' | 'custom' | 'bucket_list';
  createdAt: string;
  updatedAt: string;

  // Trip details (unified from both models)
  title: string;
  destination: string;
  travelers: number;

  // Days structure (uses BuilderDay from TripBuilder)
  days: BuilderDay[];

  // Trip Diary features
  isPublic?: boolean;
  isBucketList?: boolean;
  isFavorite?: boolean;
  rating?: number;              // 1-5 stars
  review?: string;              // User's trip review/notes
  photos?: string[];            // Array of photo URLs
  tags?: string[];              // Custom tags for organization

  // AI-specific metadata (optional, preserved when source='ai')
  aiMetadata?: {
    comfortLevel: number;
    comfortLevelName: string;
    comfortLevelEmoji: string;
    originalDates: string;            // "2025-03-01 - 2025-03-05"
    flights?: {
      outbound: string;
      return: string;
      totalCost: number;
    };
    accommodation?: {
      name: string;
      nights: number;
      totalCost: number;
    };
  };
}
