import React from "react";
import { Navigate } from "react-router-dom";

// Retired — profile editing now lives on /analyst?edit=1 (your public profile, edit mode).
// This route stays for backward-compat with any deep links or old menu items.
export default function EditProfilePage() {
  return <Navigate to="/analyst?edit=1" replace />;
}
