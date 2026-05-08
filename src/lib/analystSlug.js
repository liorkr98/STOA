// Utility: generate a URL slug for an analyst
// Uses sanitized full_name (lowercase, hyphens) or email prefix as fallback

export function getAnalystSlug(user) {
  if (!user) return "";
  if (user.full_name && user.full_name.trim()) {
    return user.full_name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }
  return (user.email || "").split("@")[0].toLowerCase().replace(/[^a-z0-9-]/g, "");
}

// Given a slug, find the matching user from a list
export function findUserBySlug(users, slug) {
  return users.find(u => getAnalystSlug(u) === slug) || null;
}