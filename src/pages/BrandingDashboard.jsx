import React from "react";
import { Navigate } from "react-router-dom";

// Retired — all branding now lives on /analyst?edit=1 (your public profile, edit mode).
// Banner theme, bio, tagline, specialties, social links, and layout config are all in one place.
export default function BrandingDashboard() {
  return <Navigate to="/analyst?edit=1" replace />;
}
