import React from "react";
export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Terms & Conditions</h1>
      <p className="text-muted-foreground mb-6">Last updated: May 1, 2026</p>
      <div className="prose prose-sm max-w-none text-foreground/90 space-y-4">
        <p>By using STOA, you agree to these terms. STOA provides financial research and analyst tracking tools for informational purposes only. Nothing on this platform constitutes financial advice.</p>
        <h3 className="font-semibold">1. Use of Service</h3>
        <p>You must be 18 or older to use STOA. You agree not to misuse the platform, post false information, or attempt to manipulate prediction outcomes.</p>
        <h3 className="font-semibold">2. Content & Predictions</h3>
        <p>All predictions are locked at time of publishing and cannot be changed. STOA tracks outcomes algorithmically and is not responsible for investment decisions made based on content on this platform.</p>
        <h3 className="font-semibold">3. Subscriptions & Payments</h3>
        <p>Subscriptions renew monthly. You may cancel at any time. STOA takes a 15% platform fee on all premium report sales and analyst subscriptions.</p>
        <h3 className="font-semibold">4. Disclaimer</h3>
        <p>STOA is not a registered investment advisor. All content is for educational and informational purposes only. Past prediction accuracy does not guarantee future performance.</p>
      </div>
    </div>
  );
}