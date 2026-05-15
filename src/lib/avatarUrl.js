// Return the avatar URL for a user, preferring an uploaded profile picture
// over the auth-provider's default picture.
export function avatarUrl(user) {
  if (!user) return null;
  return (
    user.profile_picture_url ||
    user.profile_picture ||
    user.picture ||
    null
  );
}
