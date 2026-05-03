import React from "react";
export default function CookiePolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Cookie Policy</h1>
      <p className="text-muted-foreground mb-6">Last updated: May 1, 2026</p>
      <div className="space-y-4 text-sm text-foreground/90">
        <p>STOA uses cookies to enhance your experience and provide core functionality.</p>
        <h3 className="font-semibold">Types of Cookies</h3>
        <p><strong>Essential:</strong> Required for authentication and session management.</p>
        <p><strong>Analytics:</strong> Google Analytics to understand how users interact with the platform.</p>
        <p><strong>Preferences:</strong> Remembers your settings and preferences.</p>
        <h3 className="font-semibold">Managing Cookies</h3>
        <p>You can disable non-essential cookies in your browser settings. This may affect some functionality.</p>
      </div>
    </div>
  );
}