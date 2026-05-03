import React from "react";
export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-muted-foreground mb-6">Last updated: May 1, 2026</p>
      <div className="space-y-4 text-sm text-foreground/90">
        <p>STOA collects information necessary to provide our service, including your email, profile data, and usage analytics.</p>
        <h3 className="font-semibold">Data We Collect</h3>
        <p>Account information (email, name), profile data, published reports and predictions, payment information (processed by Stripe), and usage analytics.</p>
        <h3 className="font-semibold">How We Use Your Data</h3>
        <p>To provide and improve the STOA service, send notifications, process payments, and calculate analyst accuracy scores.</p>
        <h3 className="font-semibold">Your Rights</h3>
        <p>You may request deletion of your account and data at any time by contacting support@stoa.finance.</p>
      </div>
    </div>
  );
}