import React from "react";
import StoaLogo from "@/components/StoaLogo";

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <StoaLogo size={32} textSize="text-2xl" className="mb-6" />
      <h1 className="text-3xl font-bold mb-4">About STOA</h1>
      <p className="text-muted-foreground leading-relaxed mb-4">
        STOA is a transparent financial research platform where professional analysts publish data-driven research reports with locked price predictions — fully verifiable and tracked in real time.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        We believe in radical transparency in finance. Every prediction is locked at the time of publishing, and outcomes are tracked automatically so you can see exactly how each analyst performs over time.
      </p>
      <h2 className="text-xl font-bold mt-8 mb-3">Our Mission</h2>
      <p className="text-muted-foreground leading-relaxed">
        To bring institutional-grade research and accountability to retail investors. We track analyst accuracy with mathematical precision so you can make smarter decisions about whose research to follow and pay for.
      </p>
    </div>
  );
}