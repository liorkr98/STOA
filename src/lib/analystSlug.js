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

// Canonical analyst-profile URL with a ?u=<email> disambiguator.
//
// Without the disambiguator, two users that share a full_name (e.g. two
// "Lior Krisi" accounts) collide on the same slug and AnalystProfilePage
// just renders whichever the .find() hits first. With ?u=, the profile
// page resolves by exact email first and falls back to slug only if no
// email match is found — so every user gets their own URL even when
// the slug would otherwise collide.
//
// Accepts either a full user object ({email, full_name, ...}) or a bare
// email string for ergonomics with subscriber/follow records that only
// carry the email.
export function analystHref(userOrEmail) {
  if (!userOrEmail) return "/analyst";
  const user = typeof userOrEmail === "string"
    ? { email: userOrEmail }
    : userOrEmail;
  const slug = getAnalystSlug(user) || "u";
  return user.email
    ? `/analyst/${slug}?u=${encodeURIComponent(user.email)}`
    : `/analyst/${slug}`;
}