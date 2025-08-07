// List of available avatar images in the assets directory
export const avatarImages = [
  "Amythest.svg",
  "Aubergine.svg",
  "Oranger.svg",
  "Sea Purple.svg",
  "Creative Spark.svg",
  "Cosmic Sky.svg",
  "Vibrant Cluster.svg",
  "Mystery of the Lost Treasure.svg",
  "Tropical Shore.svg",
  "Pina Colada.svg",
  "Sweet Soft.svg",
  "Dark Nature.svg",
  "Default.svg",
  "Galaxy.svg",
  "Supernova.svg",
];

/**
 * Generate a deterministic hash code from a string
 * @param str The string to hash
 * @returns A number hash of the string
 */
function hashString(str: string): number {
  let hash = 0;
  if (str.length === 0) return hash;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash); // Make sure it's positive
}

/**
 * Get a consistent avatar for a user based on their unique identifier (name, email, or ID)
 * @param identifier A unique string identifier for the user (name, email, ID)
 * @returns Path to avatar image
 */
export function getConsistentAvatar(identifier: string): string {
  // Generate a hash of the identifier
  const hash = hashString(identifier);

  // Use the hash to pick an avatar (modulo to get index within bounds)
  const avatarIndex = hash % avatarImages.length;

  // Return the path to the avatar
  return `/src/assets/avatars/${avatarImages[avatarIndex]}`;
  // Note: In production you'd want to use a more robust way to reference assets
  // but this works for development with Vite
}

/**
 * Generate initials from a name
 * @param name User's name
 * @returns Initials (up to 2 characters)
 */
export function getInitials(name: string): string {
  if (!name) return "";

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
