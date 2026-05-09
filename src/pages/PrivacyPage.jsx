import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { setMeta } from "@/lib/seo";

const SECTIONS = [
  { id: "intro", title: "1. Introduction" },
  { id: "collect", title: "2. Information We Collect" },
  { id: "use", title: "3. How We Use Your Information" },
  { id: "sharing", title: "4. Sharing Your Information" },
  { id: "public", title: "5. Public Information" },
  { id: "cookies", title: "6. Cookies & Tracking" },
  { id: "retention", title: "7. Data Retention" },
  { id: "rights", title: "8. Your Rights" },
  { id: "security", title: "9. Data Security" },
  { id: "children", title: "10. Children's Privacy" },
  { id: "international", title: "11. International Users" },
  { id: "changes", title: "12. Changes to This Policy" },
  { id: "contact", title: "13. Contact Us" },
];

function SectionBlock({ id, title, children }) {
  return (
    <div id={id} className="mb-10 scroll-mt-24">
      <h2 className="text-xl font-bold mb-4 text-foreground">{title}</h2>
      <div className="text-sm text-foreground/80 leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

export default function PrivacyPage() {
  const [active, setActive] = useState("intro");

  useEffect(() => {
    setMeta({ title: "Privacy Policy — STOA", description: "How STOA collects, uses, and protects your personal information." });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }); },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    SECTIONS.forEach(s => { const el = document.getElementById(s.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>›</span>
          <span>Privacy Policy</span>
        </div>
        <div className="flex items-start gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-extrabold mb-2">Privacy Policy</h1>
            <div className="flex items-center gap-3">
              <span className="text-xs bg-secondary text-muted-foreground px-3 py-1 rounded-full border border-border">Last updated: May 9, 2026</span>
              <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200">STOA Technologies Ltd.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-24 bg-secondary rounded-xl p-4 border border-border">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">On This Page</p>
            <nav className="space-y-1">
              {SECTIONS.map(s => (
                <a key={s.id} href={`#${s.id}`}
                  className={`block text-xs py-1.5 px-2 rounded-lg transition-colors truncate ${active === s.id ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}>
                  {s.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 bg-card border border-border rounded-2xl p-8">
          <SectionBlock id="intro" title="1. Introduction">
            <p>STOA ("we," "us," or "our") operates the financial research platform accessible at stoamarket.ai and stakify-f5b3c3a0.base44.app. This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use our platform.</p>
            <p>By using STOA, you consent to the practices described in this policy.</p>
          </SectionBlock>

          <SectionBlock id="collect" title="2. Information We Collect">
            <p><strong>Account Information:</strong> When you register, we collect your name, email address, and profile information.</p>
            <p><strong>Usage Data:</strong> We collect information about how you use the platform — pages visited, features used, reports viewed, predictions followed, and interactions with content.</p>
            <p><strong>Content You Submit:</strong> Reports, predictions, comments, votes, and other content you publish or submit on the platform.</p>
            <p><strong>Payment Information:</strong> If you subscribe to an analyst's premium content or receive subscription revenue, payment processing is handled by our payment providers. We do not store full credit card numbers.</p>
            <p><strong>Communications:</strong> If you contact us, we retain records of those communications.</p>
            <p><strong>Device & Technical Data:</strong> IP address, browser type, device identifiers, and analytics data collected through cookies and similar technologies.</p>
          </SectionBlock>

          <SectionBlock id="use" title="3. How We Use Your Information">
            {[
              "To provide, operate, and improve the STOA platform",
              "To calculate and display analyst accuracy scores, yields, and track records",
              "To process subscriptions and payments between users",
              "To send notifications about analyst activity you follow",
              "To communicate platform updates, security notices, and support",
              "To enforce our Terms of Service and prevent fraud or abuse",
              "To comply with legal obligations",
            ].map((item, i) => <p key={i}>• {item}</p>)}
          </SectionBlock>

          <SectionBlock id="sharing" title="4. Sharing Your Information">
            <p>We do not sell your personal information. We may share information with:</p>
            <p><strong>Analysts you subscribe to:</strong> Your subscription status is shared with analysts you subscribe to for content access purposes. Your full profile is not shared.</p>
            <p><strong>Service Providers:</strong> Third-party vendors who help us operate the platform (hosting, payment processing, analytics). They are bound by confidentiality agreements.</p>
            <p><strong>Legal Requirements:</strong> If required by law, regulation, or valid legal process.</p>
            <p><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, with notice to affected users.</p>
          </SectionBlock>

          <SectionBlock id="public" title="5. Public Information">
            <p>The following information is publicly visible on STOA:</p>
            {["Analyst profiles, accuracy scores, yields, and track records", "Published reports and predictions", "Analyst leaderboard rankings", "Aggregate poll results"].map((item, i) => <p key={i}>• {item}</p>)}
            <p>Your personal email address and payment information are never publicly visible.</p>
          </SectionBlock>

          <SectionBlock id="cookies" title="6. Cookies & Tracking">
            <p>We use cookies and similar technologies for:</p>
            {["Session management (keeping you logged in)", "Preference storage (e.g., feed tab preferences)", "Analytics (understanding platform usage)", "Performance optimization"].map((item, i) => <p key={i}>• {item}</p>)}
            <p>You can control cookie settings through your browser. Disabling certain cookies may affect platform functionality.</p>
          </SectionBlock>

          <SectionBlock id="retention" title="7. Data Retention">
            <p>We retain your account data for as long as your account is active. If you delete your account, we retain certain data for up to 90 days for legal compliance, fraud prevention, and resolving disputes. Prediction records and track records may be retained as part of the platform's historical accuracy data.</p>
          </SectionBlock>

          <SectionBlock id="rights" title="8. Your Rights">
            <p>Depending on your jurisdiction, you may have the right to:</p>
            {["Access the personal data we hold about you", "Request correction of inaccurate data", "Request deletion of your data (subject to legal retention requirements)", "Object to or restrict certain processing", "Data portability"].map((item, i) => <p key={i}>• {item}</p>)}
            <p>To exercise these rights, contact us at <a href="mailto:privacy@stoamarket.ai" className="text-primary hover:underline">privacy@stoamarket.ai</a></p>
          </SectionBlock>

          <SectionBlock id="security" title="9. Data Security">
            <p>We implement appropriate technical and organizational security measures to protect your personal information, including encryption in transit (HTTPS/TLS), access controls, and security monitoring. No method of transmission over the internet is 100% secure; we cannot guarantee absolute security.</p>
          </SectionBlock>

          <SectionBlock id="children" title="10. Children's Privacy">
            <p>STOA is not directed to individuals under 18 years of age. We do not knowingly collect personal information from minors. If we become aware we have collected information from a minor, we will delete it promptly.</p>
          </SectionBlock>

          <SectionBlock id="international" title="11. International Users">
            <p>STOA is operated from Israel. By using the platform, users outside Israel consent to the transfer and processing of their data in Israel and other countries where our service providers operate, which may have different privacy protections than your home country.</p>
          </SectionBlock>

          <SectionBlock id="changes" title="12. Changes to This Policy">
            <p>We may update this Privacy Policy periodically. We will notify you of material changes via email or prominent notice on the platform. Continued use after changes constitutes acceptance.</p>
          </SectionBlock>

          <SectionBlock id="contact" title="13. Contact Us">
            <p>For privacy-related inquiries:</p>
            <p><strong>Email:</strong> <a href="mailto:privacy@stoamarket.ai" className="text-primary hover:underline">privacy@stoamarket.ai</a></p>
            <p><strong>Company:</strong> STOA Technologies Ltd.</p>
          </SectionBlock>
        </main>
      </div>
    </div>
  );
}