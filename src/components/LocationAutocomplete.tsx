import { useState, useEffect, useRef } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Location {
  city: string;
  country: string;
  countryCode: string;
  flag: string;
  display: string;
}

// Comprehensive list of cities with country flags
const popularLocations: Location[] = [
  // United States
  { city: "New York", country: "United States", countryCode: "US", flag: "🇺🇸", display: "New York, United States" },
  { city: "Los Angeles", country: "United States", countryCode: "US", flag: "🇺🇸", display: "Los Angeles, United States" },
  { city: "Chicago", country: "United States", countryCode: "US", flag: "🇺🇸", display: "Chicago, United States" },
  { city: "Miami", country: "United States", countryCode: "US", flag: "🇺🇸", display: "Miami, United States" },
  { city: "San Francisco", country: "United States", countryCode: "US", flag: "🇺🇸", display: "San Francisco, United States" },
  { city: "Las Vegas", country: "United States", countryCode: "US", flag: "🇺🇸", display: "Las Vegas, United States" },
  { city: "Seattle", country: "United States", countryCode: "US", flag: "🇺🇸", display: "Seattle, United States" },
  { city: "Boston", country: "United States", countryCode: "US", flag: "🇺🇸", display: "Boston, United States" },
  { city: "Washington DC", country: "United States", countryCode: "US", flag: "🇺🇸", display: "Washington DC, United States" },
  { city: "Denver", country: "United States", countryCode: "US", flag: "🇺🇸", display: "Denver, United States" },
  { city: "Austin", country: "United States", countryCode: "US", flag: "🇺🇸", display: "Austin, United States" },
  { city: "New Orleans", country: "United States", countryCode: "US", flag: "🇺🇸", display: "New Orleans, United States" },
  { city: "Nashville", country: "United States", countryCode: "US", flag: "🇺🇸", display: "Nashville, United States" },
  { city: "San Diego", country: "United States", countryCode: "US", flag: "🇺🇸", display: "San Diego, United States" },
  { city: "Orlando", country: "United States", countryCode: "US", flag: "🇺🇸", display: "Orlando, United States" },
  { city: "Honolulu", country: "United States", countryCode: "US", flag: "🇺🇸", display: "Honolulu, United States" },
  { city: "Phoenix", country: "United States", countryCode: "US", flag: "🇺🇸", display: "Phoenix, United States" },
  { city: "Philadelphia", country: "United States", countryCode: "US", flag: "🇺🇸", display: "Philadelphia, United States" },
  { city: "Portland", country: "United States", countryCode: "US", flag: "🇺🇸", display: "Portland, United States" },
  { city: "Atlanta", country: "United States", countryCode: "US", flag: "🇺🇸", display: "Atlanta, United States" },

  // Canada
  { city: "Toronto", country: "Canada", countryCode: "CA", flag: "🇨🇦", display: "Toronto, Canada" },
  { city: "Vancouver", country: "Canada", countryCode: "CA", flag: "🇨🇦", display: "Vancouver, Canada" },
  { city: "Montreal", country: "Canada", countryCode: "CA", flag: "🇨🇦", display: "Montreal, Canada" },
  { city: "Calgary", country: "Canada", countryCode: "CA", flag: "🇨🇦", display: "Calgary, Canada" },
  { city: "Ottawa", country: "Canada", countryCode: "CA", flag: "🇨🇦", display: "Ottawa, Canada" },
  { city: "Quebec City", country: "Canada", countryCode: "CA", flag: "🇨🇦", display: "Quebec City, Canada" },
  { city: "Edmonton", country: "Canada", countryCode: "CA", flag: "🇨🇦", display: "Edmonton, Canada" },
  { city: "Victoria", country: "Canada", countryCode: "CA", flag: "🇨🇦", display: "Victoria, Canada" },
  { city: "Winnipeg", country: "Canada", countryCode: "CA", flag: "🇨🇦", display: "Winnipeg, Canada" },
  { city: "Halifax", country: "Canada", countryCode: "CA", flag: "🇨🇦", display: "Halifax, Canada" },

  // United Kingdom
  { city: "London", country: "United Kingdom", countryCode: "GB", flag: "🇬🇧", display: "London, United Kingdom" },
  { city: "Edinburgh", country: "United Kingdom", countryCode: "GB", flag: "🇬🇧", display: "Edinburgh, United Kingdom" },
  { city: "Manchester", country: "United Kingdom", countryCode: "GB", flag: "🇬🇧", display: "Manchester, United Kingdom" },
  { city: "Liverpool", country: "United Kingdom", countryCode: "GB", flag: "🇬🇧", display: "Liverpool, United Kingdom" },
  { city: "Birmingham", country: "United Kingdom", countryCode: "GB", flag: "🇬🇧", display: "Birmingham, United Kingdom" },
  { city: "Glasgow", country: "United Kingdom", countryCode: "GB", flag: "🇬🇧", display: "Glasgow, United Kingdom" },
  { city: "Bristol", country: "United Kingdom", countryCode: "GB", flag: "🇬🇧", display: "Bristol, United Kingdom" },
  { city: "Oxford", country: "United Kingdom", countryCode: "GB", flag: "🇬🇧", display: "Oxford, United Kingdom" },
  { city: "Cambridge", country: "United Kingdom", countryCode: "GB", flag: "🇬🇧", display: "Cambridge, United Kingdom" },
  { city: "Bath", country: "United Kingdom", countryCode: "GB", flag: "🇬🇧", display: "Bath, United Kingdom" },

  // France
  { city: "Paris", country: "France", countryCode: "FR", flag: "🇫🇷", display: "Paris, France" },
  { city: "Nice", country: "France", countryCode: "FR", flag: "🇫🇷", display: "Nice, France" },
  { city: "Lyon", country: "France", countryCode: "FR", flag: "🇫🇷", display: "Lyon, France" },
  { city: "Marseille", country: "France", countryCode: "FR", flag: "🇫🇷", display: "Marseille, France" },
  { city: "Bordeaux", country: "France", countryCode: "FR", flag: "🇫🇷", display: "Bordeaux, France" },
  { city: "Toulouse", country: "France", countryCode: "FR", flag: "🇫🇷", display: "Toulouse, France" },
  { city: "Strasbourg", country: "France", countryCode: "FR", flag: "🇫🇷", display: "Strasbourg, France" },
  { city: "Cannes", country: "France", countryCode: "FR", flag: "🇫🇷", display: "Cannes, France" },
  { city: "Monaco", country: "France", countryCode: "FR", flag: "🇫🇷", display: "Monaco, France" },

  // Spain
  { city: "Barcelona", country: "Spain", countryCode: "ES", flag: "🇪🇸", display: "Barcelona, Spain" },
  { city: "Madrid", country: "Spain", countryCode: "ES", flag: "🇪🇸", display: "Madrid, Spain" },
  { city: "Seville", country: "Spain", countryCode: "ES", flag: "🇪🇸", display: "Seville, Spain" },
  { city: "Valencia", country: "Spain", countryCode: "ES", flag: "🇪🇸", display: "Valencia, Spain" },
  { city: "Granada", country: "Spain", countryCode: "ES", flag: "🇪🇸", display: "Granada, Spain" },
  { city: "Bilbao", country: "Spain", countryCode: "ES", flag: "🇪🇸", display: "Bilbao, Spain" },
  { city: "Malaga", country: "Spain", countryCode: "ES", flag: "🇪🇸", display: "Malaga, Spain" },
  { city: "Ibiza", country: "Spain", countryCode: "ES", flag: "🇪🇸", display: "Ibiza, Spain" },
  { city: "Palma de Mallorca", country: "Spain", countryCode: "ES", flag: "🇪🇸", display: "Palma de Mallorca, Spain" },
  { city: "San Sebastian", country: "Spain", countryCode: "ES", flag: "🇪🇸", display: "San Sebastian, Spain" },

  // Italy
  { city: "Rome", country: "Italy", countryCode: "IT", flag: "🇮🇹", display: "Rome, Italy" },
  { city: "Venice", country: "Italy", countryCode: "IT", flag: "🇮🇹", display: "Venice, Italy" },
  { city: "Florence", country: "Italy", countryCode: "IT", flag: "🇮🇹", display: "Florence, Italy" },
  { city: "Milan", country: "Italy", countryCode: "IT", flag: "🇮🇹", display: "Milan, Italy" },
  { city: "Naples", country: "Italy", countryCode: "IT", flag: "🇮🇹", display: "Naples, Italy" },
  { city: "Amalfi", country: "Italy", countryCode: "IT", flag: "🇮🇹", display: "Amalfi, Italy" },
  { city: "Cinque Terre", country: "Italy", countryCode: "IT", flag: "🇮🇹", display: "Cinque Terre, Italy" },
  { city: "Turin", country: "Italy", countryCode: "IT", flag: "🇮🇹", display: "Turin, Italy" },
  { city: "Bologna", country: "Italy", countryCode: "IT", flag: "🇮🇹", display: "Bologna, Italy" },
  { city: "Verona", country: "Italy", countryCode: "IT", flag: "🇮🇹", display: "Verona, Italy" },

  // Germany
  { city: "Berlin", country: "Germany", countryCode: "DE", flag: "🇩🇪", display: "Berlin, Germany" },
  { city: "Munich", country: "Germany", countryCode: "DE", flag: "🇩🇪", display: "Munich, Germany" },
  { city: "Frankfurt", country: "Germany", countryCode: "DE", flag: "🇩🇪", display: "Frankfurt, Germany" },
  { city: "Hamburg", country: "Germany", countryCode: "DE", flag: "🇩🇪", display: "Hamburg, Germany" },
  { city: "Cologne", country: "Germany", countryCode: "DE", flag: "🇩🇪", display: "Cologne, Germany" },
  { city: "Düsseldorf", country: "Germany", countryCode: "DE", flag: "🇩🇪", display: "Düsseldorf, Germany" },
  { city: "Dresden", country: "Germany", countryCode: "DE", flag: "🇩🇪", display: "Dresden, Germany" },
  { city: "Stuttgart", country: "Germany", countryCode: "DE", flag: "🇩🇪", display: "Stuttgart, Germany" },

  // Netherlands
  { city: "Amsterdam", country: "Netherlands", countryCode: "NL", flag: "🇳🇱", display: "Amsterdam, Netherlands" },
  { city: "Rotterdam", country: "Netherlands", countryCode: "NL", flag: "🇳🇱", display: "Rotterdam, Netherlands" },
  { city: "The Hague", country: "Netherlands", countryCode: "NL", flag: "🇳🇱", display: "The Hague, Netherlands" },
  { city: "Utrecht", country: "Netherlands", countryCode: "NL", flag: "🇳🇱", display: "Utrecht, Netherlands" },

  // Belgium
  { city: "Brussels", country: "Belgium", countryCode: "BE", flag: "🇧🇪", display: "Brussels, Belgium" },
  { city: "Bruges", country: "Belgium", countryCode: "BE", flag: "🇧🇪", display: "Bruges, Belgium" },
  { city: "Antwerp", country: "Belgium", countryCode: "BE", flag: "🇧🇪", display: "Antwerp, Belgium" },
  { city: "Ghent", country: "Belgium", countryCode: "BE", flag: "🇧🇪", display: "Ghent, Belgium" },

  // Switzerland
  { city: "Zurich", country: "Switzerland", countryCode: "CH", flag: "🇨🇭", display: "Zurich, Switzerland" },
  { city: "Geneva", country: "Switzerland", countryCode: "CH", flag: "🇨🇭", display: "Geneva, Switzerland" },
  { city: "Lucerne", country: "Switzerland", countryCode: "CH", flag: "🇨🇭", display: "Lucerne, Switzerland" },
  { city: "Interlaken", country: "Switzerland", countryCode: "CH", flag: "🇨🇭", display: "Interlaken, Switzerland" },
  { city: "Zermatt", country: "Switzerland", countryCode: "CH", flag: "🇨🇭", display: "Zermatt, Switzerland" },
  { city: "Bern", country: "Switzerland", countryCode: "CH", flag: "🇨🇭", display: "Bern, Switzerland" },

  // Austria
  { city: "Vienna", country: "Austria", countryCode: "AT", flag: "🇦🇹", display: "Vienna, Austria" },
  { city: "Salzburg", country: "Austria", countryCode: "AT", flag: "🇦🇹", display: "Salzburg, Austria" },
  { city: "Innsbruck", country: "Austria", countryCode: "AT", flag: "🇦🇹", display: "Innsbruck, Austria" },
  { city: "Hallstatt", country: "Austria", countryCode: "AT", flag: "🇦🇹", display: "Hallstatt, Austria" },

  // Scandinavia
  { city: "Copenhagen", country: "Denmark", countryCode: "DK", flag: "🇩🇰", display: "Copenhagen, Denmark" },
  { city: "Stockholm", country: "Sweden", countryCode: "SE", flag: "🇸🇪", display: "Stockholm, Sweden" },
  { city: "Oslo", country: "Norway", countryCode: "NO", flag: "🇳🇴", display: "Oslo, Norway" },
  { city: "Bergen", country: "Norway", countryCode: "NO", flag: "🇳🇴", display: "Bergen, Norway" },
  { city: "Reykjavik", country: "Iceland", countryCode: "IS", flag: "🇮🇸", display: "Reykjavik, Iceland" },
  { city: "Helsinki", country: "Finland", countryCode: "FI", flag: "🇫🇮", display: "Helsinki, Finland" },
  { city: "Gothenburg", country: "Sweden", countryCode: "SE", flag: "🇸🇪", display: "Gothenburg, Sweden" },

  // Eastern Europe
  { city: "Prague", country: "Czech Republic", countryCode: "CZ", flag: "🇨🇿", display: "Prague, Czech Republic" },
  { city: "Budapest", country: "Hungary", countryCode: "HU", flag: "🇭🇺", display: "Budapest, Hungary" },
  { city: "Krakow", country: "Poland", countryCode: "PL", flag: "🇵🇱", display: "Krakow, Poland" },
  { city: "Warsaw", country: "Poland", countryCode: "PL", flag: "🇵🇱", display: "Warsaw, Poland" },
  { city: "Bucharest", country: "Romania", countryCode: "RO", flag: "🇷🇴", display: "Bucharest, Romania" },
  { city: "Sofia", country: "Bulgaria", countryCode: "BG", flag: "🇧🇬", display: "Sofia, Bulgaria" },
  { city: "Tallinn", country: "Estonia", countryCode: "EE", flag: "🇪🇪", display: "Tallinn, Estonia" },
  { city: "Riga", country: "Latvia", countryCode: "LV", flag: "🇱🇻", display: "Riga, Latvia" },
  { city: "Vilnius", country: "Lithuania", countryCode: "LT", flag: "🇱🇹", display: "Vilnius, Lithuania" },
  { city: "Ljubljana", country: "Slovenia", countryCode: "SI", flag: "🇸🇮", display: "Ljubljana, Slovenia" },
  { city: "Zagreb", country: "Croatia", countryCode: "HR", flag: "🇭🇷", display: "Zagreb, Croatia" },
  { city: "Dubrovnik", country: "Croatia", countryCode: "HR", flag: "🇭🇷", display: "Dubrovnik, Croatia" },
  { city: "Split", country: "Croatia", countryCode: "HR", flag: "🇭🇷", display: "Split, Croatia" },

  // Greece
  { city: "Athens", country: "Greece", countryCode: "GR", flag: "🇬🇷", display: "Athens, Greece" },
  { city: "Santorini", country: "Greece", countryCode: "GR", flag: "🇬🇷", display: "Santorini, Greece" },
  { city: "Mykonos", country: "Greece", countryCode: "GR", flag: "🇬🇷", display: "Mykonos, Greece" },
  { city: "Crete", country: "Greece", countryCode: "GR", flag: "🇬🇷", display: "Crete, Greece" },
  { city: "Rhodes", country: "Greece", countryCode: "GR", flag: "🇬🇷", display: "Rhodes, Greece" },
  { city: "Corfu", country: "Greece", countryCode: "GR", flag: "🇬🇷", display: "Corfu, Greece" },
  { city: "Thessaloniki", country: "Greece", countryCode: "GR", flag: "🇬🇷", display: "Thessaloniki, Greece" },

  // Portugal
  { city: "Lisbon", country: "Portugal", countryCode: "PT", flag: "🇵🇹", display: "Lisbon, Portugal" },
  { city: "Porto", country: "Portugal", countryCode: "PT", flag: "🇵🇹", display: "Porto, Portugal" },
  { city: "Faro", country: "Portugal", countryCode: "PT", flag: "🇵🇹", display: "Faro, Portugal" },
  { city: "Madeira", country: "Portugal", countryCode: "PT", flag: "🇵🇹", display: "Madeira, Portugal" },
  { city: "Azores", country: "Portugal", countryCode: "PT", flag: "🇵🇹", display: "Azores, Portugal" },

  // Ireland
  { city: "Dublin", country: "Ireland", countryCode: "IE", flag: "🇮🇪", display: "Dublin, Ireland" },
  { city: "Galway", country: "Ireland", countryCode: "IE", flag: "🇮🇪", display: "Galway, Ireland" },
  { city: "Cork", country: "Ireland", countryCode: "IE", flag: "🇮🇪", display: "Cork, Ireland" },

  // Turkey
  { city: "Istanbul", country: "Turkey", countryCode: "TR", flag: "🇹🇷", display: "Istanbul, Turkey" },
  { city: "Cappadocia", country: "Turkey", countryCode: "TR", flag: "🇹🇷", display: "Cappadocia, Turkey" },
  { city: "Antalya", country: "Turkey", countryCode: "TR", flag: "🇹🇷", display: "Antalya, Turkey" },
  { city: "Bodrum", country: "Turkey", countryCode: "TR", flag: "🇹🇷", display: "Bodrum, Turkey" },
  { city: "Ephesus", country: "Turkey", countryCode: "TR", flag: "🇹🇷", display: "Ephesus, Turkey" },

  // Russia
  { city: "Moscow", country: "Russia", countryCode: "RU", flag: "🇷🇺", display: "Moscow, Russia" },
  { city: "St. Petersburg", country: "Russia", countryCode: "RU", flag: "🇷🇺", display: "St. Petersburg, Russia" },

  // Japan
  { city: "Tokyo", country: "Japan", countryCode: "JP", flag: "🇯🇵", display: "Tokyo, Japan" },
  { city: "Kyoto", country: "Japan", countryCode: "JP", flag: "🇯🇵", display: "Kyoto, Japan" },
  { city: "Osaka", country: "Japan", countryCode: "JP", flag: "🇯🇵", display: "Osaka, Japan" },
  { city: "Hiroshima", country: "Japan", countryCode: "JP", flag: "🇯🇵", display: "Hiroshima, Japan" },
  { city: "Nara", country: "Japan", countryCode: "JP", flag: "🇯🇵", display: "Nara, Japan" },
  { city: "Sapporo", country: "Japan", countryCode: "JP", flag: "🇯🇵", display: "Sapporo, Japan" },
  { city: "Fukuoka", country: "Japan", countryCode: "JP", flag: "🇯🇵", display: "Fukuoka, Japan" },
  { city: "Okinawa", country: "Japan", countryCode: "JP", flag: "🇯🇵", display: "Okinawa, Japan" },

  // China
  { city: "Beijing", country: "China", countryCode: "CN", flag: "🇨🇳", display: "Beijing, China" },
  { city: "Shanghai", country: "China", countryCode: "CN", flag: "🇨🇳", display: "Shanghai, China" },
  { city: "Hong Kong", country: "China", countryCode: "HK", flag: "🇭🇰", display: "Hong Kong" },
  { city: "Shenzhen", country: "China", countryCode: "CN", flag: "🇨🇳", display: "Shenzhen, China" },
  { city: "Guangzhou", country: "China", countryCode: "CN", flag: "🇨🇳", display: "Guangzhou, China" },
  { city: "Xi'an", country: "China", countryCode: "CN", flag: "🇨🇳", display: "Xi'an, China" },
  { city: "Chengdu", country: "China", countryCode: "CN", flag: "🇨🇳", display: "Chengdu, China" },
  { city: "Guilin", country: "China", countryCode: "CN", flag: "🇨🇳", display: "Guilin, China" },
  { city: "Macau", country: "China", countryCode: "MO", flag: "🇲🇴", display: "Macau, China" },

  // South Korea
  { city: "Seoul", country: "South Korea", countryCode: "KR", flag: "🇰🇷", display: "Seoul, South Korea" },
  { city: "Busan", country: "South Korea", countryCode: "KR", flag: "🇰🇷", display: "Busan, South Korea" },
  { city: "Jeju Island", country: "South Korea", countryCode: "KR", flag: "🇰🇷", display: "Jeju Island, South Korea" },
  { city: "Incheon", country: "South Korea", countryCode: "KR", flag: "🇰🇷", display: "Incheon, South Korea" },

  // Southeast Asia
  { city: "Singapore", country: "Singapore", countryCode: "SG", flag: "🇸🇬", display: "Singapore" },
  { city: "Bangkok", country: "Thailand", countryCode: "TH", flag: "🇹🇭", display: "Bangkok, Thailand" },
  { city: "Phuket", country: "Thailand", countryCode: "TH", flag: "🇹🇭", display: "Phuket, Thailand" },
  { city: "Chiang Mai", country: "Thailand", countryCode: "TH", flag: "🇹🇭", display: "Chiang Mai, Thailand" },
  { city: "Krabi", country: "Thailand", countryCode: "TH", flag: "🇹🇭", display: "Krabi, Thailand" },
  { city: "Koh Samui", country: "Thailand", countryCode: "TH", flag: "🇹🇭", display: "Koh Samui, Thailand" },
  { city: "Hanoi", country: "Vietnam", countryCode: "VN", flag: "🇻🇳", display: "Hanoi, Vietnam" },
  { city: "Ho Chi Minh City", country: "Vietnam", countryCode: "VN", flag: "🇻🇳", display: "Ho Chi Minh City, Vietnam" },
  { city: "Da Nang", country: "Vietnam", countryCode: "VN", flag: "🇻🇳", display: "Da Nang, Vietnam" },
  { city: "Hoi An", country: "Vietnam", countryCode: "VN", flag: "🇻🇳", display: "Hoi An, Vietnam" },
  { city: "Kuala Lumpur", country: "Malaysia", countryCode: "MY", flag: "🇲🇾", display: "Kuala Lumpur, Malaysia" },
  { city: "Penang", country: "Malaysia", countryCode: "MY", flag: "🇲🇾", display: "Penang, Malaysia" },
  { city: "Langkawi", country: "Malaysia", countryCode: "MY", flag: "🇲🇾", display: "Langkawi, Malaysia" },
  { city: "Bali", country: "Indonesia", countryCode: "ID", flag: "🇮🇩", display: "Bali, Indonesia" },
  { city: "Jakarta", country: "Indonesia", countryCode: "ID", flag: "🇮🇩", display: "Jakarta, Indonesia" },
  { city: "Yogyakarta", country: "Indonesia", countryCode: "ID", flag: "🇮🇩", display: "Yogyakarta, Indonesia" },
  { city: "Manila", country: "Philippines", countryCode: "PH", flag: "🇵🇭", display: "Manila, Philippines" },
  { city: "Cebu", country: "Philippines", countryCode: "PH", flag: "🇵🇭", display: "Cebu, Philippines" },
  { city: "Palawan", country: "Philippines", countryCode: "PH", flag: "🇵🇭", display: "Palawan, Philippines" },
  { city: "Boracay", country: "Philippines", countryCode: "PH", flag: "🇵🇭", display: "Boracay, Philippines" },
  { city: "Siem Reap", country: "Cambodia", countryCode: "KH", flag: "🇰🇭", display: "Siem Reap, Cambodia" },
  { city: "Phnom Penh", country: "Cambodia", countryCode: "KH", flag: "🇰🇭", display: "Phnom Penh, Cambodia" },
  { city: "Luang Prabang", country: "Laos", countryCode: "LA", flag: "🇱🇦", display: "Luang Prabang, Laos" },
  { city: "Vientiane", country: "Laos", countryCode: "LA", flag: "🇱🇦", display: "Vientiane, Laos" },
  { city: "Yangon", country: "Myanmar", countryCode: "MM", flag: "🇲🇲", display: "Yangon, Myanmar" },
  { city: "Bagan", country: "Myanmar", countryCode: "MM", flag: "🇲🇲", display: "Bagan, Myanmar" },

  // India & South Asia
  { city: "Mumbai", country: "India", countryCode: "IN", flag: "🇮🇳", display: "Mumbai, India" },
  { city: "Delhi", country: "India", countryCode: "IN", flag: "🇮🇳", display: "Delhi, India" },
  { city: "Bangalore", country: "India", countryCode: "IN", flag: "🇮🇳", display: "Bangalore, India" },
  { city: "Jaipur", country: "India", countryCode: "IN", flag: "🇮🇳", display: "Jaipur, India" },
  { city: "Goa", country: "India", countryCode: "IN", flag: "🇮🇳", display: "Goa, India" },
  { city: "Agra", country: "India", countryCode: "IN", flag: "🇮🇳", display: "Agra, India" },
  { city: "Kerala", country: "India", countryCode: "IN", flag: "🇮🇳", display: "Kerala, India" },
  { city: "Varanasi", country: "India", countryCode: "IN", flag: "🇮🇳", display: "Varanasi, India" },
  { city: "Udaipur", country: "India", countryCode: "IN", flag: "🇮🇳", display: "Udaipur, India" },
  { city: "Kathmandu", country: "Nepal", countryCode: "NP", flag: "🇳🇵", display: "Kathmandu, Nepal" },
  { city: "Pokhara", country: "Nepal", countryCode: "NP", flag: "🇳🇵", display: "Pokhara, Nepal" },
  { city: "Colombo", country: "Sri Lanka", countryCode: "LK", flag: "🇱🇰", display: "Colombo, Sri Lanka" },
  { city: "Maldives", country: "Maldives", countryCode: "MV", flag: "🇲🇻", display: "Maldives" },
  { city: "Dhaka", country: "Bangladesh", countryCode: "BD", flag: "🇧🇩", display: "Dhaka, Bangladesh" },

  // Middle East
  { city: "Dubai", country: "UAE", countryCode: "AE", flag: "🇦🇪", display: "Dubai, UAE" },
  { city: "Abu Dhabi", country: "UAE", countryCode: "AE", flag: "🇦🇪", display: "Abu Dhabi, UAE" },
  { city: "Doha", country: "Qatar", countryCode: "QA", flag: "🇶🇦", display: "Doha, Qatar" },
  { city: "Muscat", country: "Oman", countryCode: "OM", flag: "🇴🇲", display: "Muscat, Oman" },
  { city: "Tel Aviv", country: "Israel", countryCode: "IL", flag: "🇮🇱", display: "Tel Aviv, Israel" },
  { city: "Jerusalem", country: "Israel", countryCode: "IL", flag: "🇮🇱", display: "Jerusalem, Israel" },
  { city: "Amman", country: "Jordan", countryCode: "JO", flag: "🇯🇴", display: "Amman, Jordan" },
  { city: "Petra", country: "Jordan", countryCode: "JO", flag: "🇯🇴", display: "Petra, Jordan" },
  { city: "Beirut", country: "Lebanon", countryCode: "LB", flag: "🇱🇧", display: "Beirut, Lebanon" },
  { city: "Riyadh", country: "Saudi Arabia", countryCode: "SA", flag: "🇸🇦", display: "Riyadh, Saudi Arabia" },
  { city: "Jeddah", country: "Saudi Arabia", countryCode: "SA", flag: "🇸🇦", display: "Jeddah, Saudi Arabia" },
  { city: "Kuwait City", country: "Kuwait", countryCode: "KW", flag: "🇰🇼", display: "Kuwait City, Kuwait" },
  { city: "Bahrain", country: "Bahrain", countryCode: "BH", flag: "🇧🇭", display: "Bahrain" },

  // Africa
  { city: "Cairo", country: "Egypt", countryCode: "EG", flag: "🇪🇬", display: "Cairo, Egypt" },
  { city: "Luxor", country: "Egypt", countryCode: "EG", flag: "🇪🇬", display: "Luxor, Egypt" },
  { city: "Sharm El Sheikh", country: "Egypt", countryCode: "EG", flag: "🇪🇬", display: "Sharm El Sheikh, Egypt" },
  { city: "Cape Town", country: "South Africa", countryCode: "ZA", flag: "🇿🇦", display: "Cape Town, South Africa" },
  { city: "Johannesburg", country: "South Africa", countryCode: "ZA", flag: "🇿🇦", display: "Johannesburg, South Africa" },
  { city: "Kruger National Park", country: "South Africa", countryCode: "ZA", flag: "🇿🇦", display: "Kruger National Park, South Africa" },
  { city: "Marrakech", country: "Morocco", countryCode: "MA", flag: "🇲🇦", display: "Marrakech, Morocco" },
  { city: "Casablanca", country: "Morocco", countryCode: "MA", flag: "🇲🇦", display: "Casablanca, Morocco" },
  { city: "Fes", country: "Morocco", countryCode: "MA", flag: "🇲🇦", display: "Fes, Morocco" },
  { city: "Chefchaouen", country: "Morocco", countryCode: "MA", flag: "🇲🇦", display: "Chefchaouen, Morocco" },
  { city: "Nairobi", country: "Kenya", countryCode: "KE", flag: "🇰🇪", display: "Nairobi, Kenya" },
  { city: "Masai Mara", country: "Kenya", countryCode: "KE", flag: "🇰🇪", display: "Masai Mara, Kenya" },
  { city: "Zanzibar", country: "Tanzania", countryCode: "TZ", flag: "🇹🇿", display: "Zanzibar, Tanzania" },
  { city: "Serengeti", country: "Tanzania", countryCode: "TZ", flag: "🇹🇿", display: "Serengeti, Tanzania" },
  { city: "Mauritius", country: "Mauritius", countryCode: "MU", flag: "🇲🇺", display: "Mauritius" },
  { city: "Seychelles", country: "Seychelles", countryCode: "SC", flag: "🇸🇨", display: "Seychelles" },
  { city: "Victoria Falls", country: "Zimbabwe", countryCode: "ZW", flag: "🇿🇼", display: "Victoria Falls, Zimbabwe" },
  { city: "Accra", country: "Ghana", countryCode: "GH", flag: "🇬🇭", display: "Accra, Ghana" },
  { city: "Lagos", country: "Nigeria", countryCode: "NG", flag: "🇳🇬", display: "Lagos, Nigeria" },
  { city: "Tunis", country: "Tunisia", countryCode: "TN", flag: "🇹🇳", display: "Tunis, Tunisia" },
  { city: "Addis Ababa", country: "Ethiopia", countryCode: "ET", flag: "🇪🇹", display: "Addis Ababa, Ethiopia" },
  { city: "Kigali", country: "Rwanda", countryCode: "RW", flag: "🇷🇼", display: "Kigali, Rwanda" },

  // Australia & Oceania
  { city: "Sydney", country: "Australia", countryCode: "AU", flag: "🇦🇺", display: "Sydney, Australia" },
  { city: "Melbourne", country: "Australia", countryCode: "AU", flag: "🇦🇺", display: "Melbourne, Australia" },
  { city: "Brisbane", country: "Australia", countryCode: "AU", flag: "🇦🇺", display: "Brisbane, Australia" },
  { city: "Perth", country: "Australia", countryCode: "AU", flag: "🇦🇺", display: "Perth, Australia" },
  { city: "Gold Coast", country: "Australia", countryCode: "AU", flag: "🇦🇺", display: "Gold Coast, Australia" },
  { city: "Cairns", country: "Australia", countryCode: "AU", flag: "🇦🇺", display: "Cairns, Australia" },
  { city: "Great Barrier Reef", country: "Australia", countryCode: "AU", flag: "🇦🇺", display: "Great Barrier Reef, Australia" },
  { city: "Adelaide", country: "Australia", countryCode: "AU", flag: "🇦🇺", display: "Adelaide, Australia" },
  { city: "Auckland", country: "New Zealand", countryCode: "NZ", flag: "🇳🇿", display: "Auckland, New Zealand" },
  { city: "Queenstown", country: "New Zealand", countryCode: "NZ", flag: "🇳🇿", display: "Queenstown, New Zealand" },
  { city: "Wellington", country: "New Zealand", countryCode: "NZ", flag: "🇳🇿", display: "Wellington, New Zealand" },
  { city: "Rotorua", country: "New Zealand", countryCode: "NZ", flag: "🇳🇿", display: "Rotorua, New Zealand" },
  { city: "Fiji", country: "Fiji", countryCode: "FJ", flag: "🇫🇯", display: "Fiji" },
  { city: "Tahiti", country: "French Polynesia", countryCode: "PF", flag: "🇵🇫", display: "Tahiti, French Polynesia" },
  { city: "Bora Bora", country: "French Polynesia", countryCode: "PF", flag: "🇵🇫", display: "Bora Bora, French Polynesia" },

  // Central & South America
  { city: "Mexico City", country: "Mexico", countryCode: "MX", flag: "🇲🇽", display: "Mexico City, Mexico" },
  { city: "Cancun", country: "Mexico", countryCode: "MX", flag: "🇲🇽", display: "Cancun, Mexico" },
  { city: "Playa del Carmen", country: "Mexico", countryCode: "MX", flag: "🇲🇽", display: "Playa del Carmen, Mexico" },
  { city: "Tulum", country: "Mexico", countryCode: "MX", flag: "🇲🇽", display: "Tulum, Mexico" },
  { city: "Guadalajara", country: "Mexico", countryCode: "MX", flag: "🇲🇽", display: "Guadalajara, Mexico" },
  { city: "Puerto Vallarta", country: "Mexico", countryCode: "MX", flag: "🇲🇽", display: "Puerto Vallarta, Mexico" },
  { city: "Oaxaca", country: "Mexico", countryCode: "MX", flag: "🇲🇽", display: "Oaxaca, Mexico" },
  { city: "Los Cabos", country: "Mexico", countryCode: "MX", flag: "🇲🇽", display: "Los Cabos, Mexico" },
  { city: "Guatemala City", country: "Guatemala", countryCode: "GT", flag: "🇬🇹", display: "Guatemala City, Guatemala" },
  { city: "Antigua", country: "Guatemala", countryCode: "GT", flag: "🇬🇹", display: "Antigua, Guatemala" },
  { city: "San Jose", country: "Costa Rica", countryCode: "CR", flag: "🇨🇷", display: "San Jose, Costa Rica" },
  { city: "Panama City", country: "Panama", countryCode: "PA", flag: "🇵🇦", display: "Panama City, Panama" },
  { city: "Havana", country: "Cuba", countryCode: "CU", flag: "🇨🇺", display: "Havana, Cuba" },
  { city: "Varadero", country: "Cuba", countryCode: "CU", flag: "🇨🇺", display: "Varadero, Cuba" },
  { city: "Bogota", country: "Colombia", countryCode: "CO", flag: "🇨🇴", display: "Bogota, Colombia" },
  { city: "Cartagena", country: "Colombia", countryCode: "CO", flag: "🇨🇴", display: "Cartagena, Colombia" },
  { city: "Medellin", country: "Colombia", countryCode: "CO", flag: "🇨🇴", display: "Medellin, Colombia" },
  { city: "Lima", country: "Peru", countryCode: "PE", flag: "🇵🇪", display: "Lima, Peru" },
  { city: "Cusco", country: "Peru", countryCode: "PE", flag: "🇵🇪", display: "Cusco, Peru" },
  { city: "Machu Picchu", country: "Peru", countryCode: "PE", flag: "🇵🇪", display: "Machu Picchu, Peru" },
  { city: "Rio de Janeiro", country: "Brazil", countryCode: "BR", flag: "🇧🇷", display: "Rio de Janeiro, Brazil" },
  { city: "Sao Paulo", country: "Brazil", countryCode: "BR", flag: "🇧🇷", display: "Sao Paulo, Brazil" },
  { city: "Salvador", country: "Brazil", countryCode: "BR", flag: "🇧🇷", display: "Salvador, Brazil" },
  { city: "Florianopolis", country: "Brazil", countryCode: "BR", flag: "🇧🇷", display: "Florianopolis, Brazil" },
  { city: "Iguazu Falls", country: "Brazil", countryCode: "BR", flag: "🇧🇷", display: "Iguazu Falls, Brazil" },
  { city: "Buenos Aires", country: "Argentina", countryCode: "AR", flag: "🇦🇷", display: "Buenos Aires, Argentina" },
  { city: "Mendoza", country: "Argentina", countryCode: "AR", flag: "🇦🇷", display: "Mendoza, Argentina" },
  { city: "Patagonia", country: "Argentina", countryCode: "AR", flag: "🇦🇷", display: "Patagonia, Argentina" },
  { city: "Bariloche", country: "Argentina", countryCode: "AR", flag: "🇦🇷", display: "Bariloche, Argentina" },
  { city: "Santiago", country: "Chile", countryCode: "CL", flag: "🇨🇱", display: "Santiago, Chile" },
  { city: "Valparaiso", country: "Chile", countryCode: "CL", flag: "🇨🇱", display: "Valparaiso, Chile" },
  { city: "Easter Island", country: "Chile", countryCode: "CL", flag: "🇨🇱", display: "Easter Island, Chile" },
  { city: "Quito", country: "Ecuador", countryCode: "EC", flag: "🇪🇨", display: "Quito, Ecuador" },
  { city: "Galapagos Islands", country: "Ecuador", countryCode: "EC", flag: "🇪🇨", display: "Galapagos Islands, Ecuador" },
  { city: "Montevideo", country: "Uruguay", countryCode: "UY", flag: "🇺🇾", display: "Montevideo, Uruguay" },
  { city: "Punta del Este", country: "Uruguay", countryCode: "UY", flag: "🇺🇾", display: "Punta del Este, Uruguay" },

  // Caribbean
  { city: "Punta Cana", country: "Dominican Republic", countryCode: "DO", flag: "🇩🇴", display: "Punta Cana, Dominican Republic" },
  { city: "Santo Domingo", country: "Dominican Republic", countryCode: "DO", flag: "🇩🇴", display: "Santo Domingo, Dominican Republic" },
  { city: "San Juan", country: "Puerto Rico", countryCode: "PR", flag: "🇵🇷", display: "San Juan, Puerto Rico" },
  { city: "Nassau", country: "Bahamas", countryCode: "BS", flag: "🇧🇸", display: "Nassau, Bahamas" },
  { city: "Montego Bay", country: "Jamaica", countryCode: "JM", flag: "🇯🇲", display: "Montego Bay, Jamaica" },
  { city: "Kingston", country: "Jamaica", countryCode: "JM", flag: "🇯🇲", display: "Kingston, Jamaica" },
  { city: "Aruba", country: "Aruba", countryCode: "AW", flag: "🇦🇼", display: "Aruba" },
  { city: "Curacao", country: "Curacao", countryCode: "CW", flag: "🇨🇼", display: "Curacao" },
  { city: "Barbados", country: "Barbados", countryCode: "BB", flag: "🇧🇧", display: "Barbados" },
  { city: "St. Lucia", country: "Saint Lucia", countryCode: "LC", flag: "🇱🇨", display: "St. Lucia" },
  { city: "Turks and Caicos", country: "Turks and Caicos", countryCode: "TC", flag: "🇹🇨", display: "Turks and Caicos" },
  { city: "Grand Cayman", country: "Cayman Islands", countryCode: "KY", flag: "🇰🇾", display: "Grand Cayman, Cayman Islands" },
  { city: "US Virgin Islands", country: "US Virgin Islands", countryCode: "VI", flag: "🇻🇮", display: "US Virgin Islands" },
  { city: "British Virgin Islands", country: "British Virgin Islands", countryCode: "VG", flag: "🇻🇬", display: "British Virgin Islands" },
  { city: "Bermuda", country: "Bermuda", countryCode: "BM", flag: "🇧🇲", display: "Bermuda" },
];

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  autoDetect?: boolean;
  className?: string;
}

const LocationAutocomplete = ({
  value,
  onChange,
  placeholder = "Enter a city or country",
  id,
  autoDetect = false,
  className,
}: LocationAutocompleteProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Removed auto-detect on mount - now only triggers on button click

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const detectLocation = async () => {
    setIsDetecting(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: false,
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Use reverse geocoding API (free service)
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );
      
      if (response.ok) {
        const data = await response.json();
        const cityName = data.city || data.locality || data.principalSubdivision;
        const countryName = data.countryName;
        
        if (cityName && countryName) {
          onChange(`${cityName}, ${countryName}`);
        }
      }
    } catch (error) {
      console.log("Location detection failed:", error);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);
    
    if (inputValue.length > 0) {
      const filtered = popularLocations.filter(
        (loc) =>
          loc.city.toLowerCase().includes(inputValue.toLowerCase()) ||
          loc.country.toLowerCase().includes(inputValue.toLowerCase()) ||
          loc.display.toLowerCase().includes(inputValue.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 10));
      setIsOpen(true);
    } else {
      setSuggestions(popularLocations.slice(0, 8));
      setIsOpen(false);
    }
  };

  const handleFocus = () => {
    if (value.length === 0) {
      setSuggestions(popularLocations.slice(0, 8));
    } else {
      handleInputChange(value);
    }
    setIsOpen(true);
  };

  const handleSelect = (location: Location) => {
    onChange(location.display);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          className="h-12 text-base pr-10"
          autoComplete="off"
        />
        {isDetecting ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />
        ) : autoDetect && !value ? (
          <button
            type="button"
            onClick={detectLocation}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
            title="Detect my location"
          >
            <MapPin className="w-5 h-5" />
          </button>
        ) : null}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden animate-fade-in bottom-full mb-2 md:bottom-auto md:top-full md:mb-0 md:mt-1">
          <ul className="py-1 max-h-48 md:max-h-64 overflow-y-auto">
            {suggestions.map((location, index) => (
              <li key={`${location.city}-${location.countryCode}-${index}`}>
                <button
                  type="button"
                  onClick={() => handleSelect(location)}
                  className="w-full px-3 py-2.5 md:px-4 md:py-3 flex items-center gap-2 md:gap-3 hover:bg-accent transition-colors text-left"
                >
                  <span className="text-lg md:text-xl">{location.flag}</span>
                  <div className="truncate">
                    <span className="font-medium text-foreground text-sm md:text-base">{location.city}</span>
                    <span className="text-muted-foreground text-sm md:text-base">, {location.country}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;