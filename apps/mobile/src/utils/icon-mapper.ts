import { Feather } from "@expo/vector-icons";

// Common icon mappings for route types
const iconMappings: Record<string, keyof typeof Feather.glyphMap> = {
  // Money/Finance related
  savings: "dollar-sign",
  money: "dollar-sign",
  cash: "dollar-sign",
  payment: "credit-card",
  credit: "credit-card",
  
  // Goals/Targets
  goal: "target",
  target: "target",
  
  // Shopping/Commerce
  shopping: "shopping-cart",
  cart: "shopping-cart",
  shop: "shopping-bag",
  store: "shopping-bag",
  
  // Travel
  travel: "map-pin",
  vacation: "sun",
  trip: "compass",
  
  // Home/Property
  home: "home",
  house: "home",
  rent: "home",
  
  // Health
  health: "heart",
  medical: "activity",
  fitness: "activity",
  
  // Education
  education: "book",
  school: "book",
  learning: "book-open",
  study: "book-open",
  
  // Entertainment
  entertainment: "film",
  games: "play",
  gaming: "play",
  fun: "smile",
  
  // Food
  food: "coffee",
  restaurant: "coffee",
  dining: "coffee",
  
  // Tech
  tech: "cpu",
  technology: "cpu",
  computer: "monitor",
  
  // Investment
  investment: "trending-up",
  stocks: "trending-up",
  crypto: "trending-up",
  
  // Gift/Present
  gift: "gift",
  present: "gift",
  birthday: "gift",
  
  // Emergency
  emergency: "alert-circle",
  urgent: "alert-triangle",
  
  // Default
  package: "package",
  route: "navigation",
  jar: "archive",
  box: "box",
  folder: "folder",
};

/**
 * Maps an icon string to a valid Feather icon name
 * Falls back to "package" if no mapping is found
 */
export function mapIconToFeather(
  icon?: string | null
): keyof typeof Feather.glyphMap {
  if (!icon) return "package";
  
  // First check if it's already a valid Feather icon
  if (icon in Feather.glyphMap) {
    return icon as keyof typeof Feather.glyphMap;
  }
  
  // Check our custom mappings (case-insensitive)
  const lowerIcon = icon.toLowerCase();
  for (const [key, value] of Object.entries(iconMappings)) {
    if (lowerIcon.includes(key)) {
      return value;
    }
  }
  
  // Default fallback
  return "package";
}

/**
 * Get a list of suggested icons for route creation
 */
export const SUGGESTED_ICONS: {
  name: keyof typeof Feather.glyphMap;
  label: string;
}[] = [
  { name: "package", label: "Default" },
  { name: "dollar-sign", label: "Savings" },
  { name: "target", label: "Goal" },
  { name: "shopping-cart", label: "Shopping" },
  { name: "home", label: "Home" },
  { name: "heart", label: "Health" },
  { name: "book", label: "Education" },
  { name: "gift", label: "Gift" },
  { name: "sun", label: "Vacation" },
  { name: "trending-up", label: "Investment" },
  { name: "coffee", label: "Food" },
  { name: "film", label: "Entertainment" },
  { name: "cpu", label: "Tech" },
  { name: "credit-card", label: "Payment" },
];