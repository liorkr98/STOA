import React from "react";
export default function AccessibilityPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Accessibility</h1>
      <p className="text-muted-foreground mb-6">STOA is committed to making our platform accessible to everyone.</p>
      <div className="space-y-4 text-sm text-foreground/90">
        <p>We aim to conform to WCAG 2.1 Level AA standards. Our platform is designed with keyboard navigation, screen reader compatibility, and sufficient color contrast in mind.</p>
        <h3 className="font-semibold">Known Issues</h3>
        <p>Some interactive charts may not be fully accessible to screen reader users. We are actively working to improve this.</p>
        <h3 className="font-semibold">Contact</h3>
        <p>If you experience accessibility barriers, please contact us at accessibility@stoa.finance.</p>
      </div>
    </div>
  );
}