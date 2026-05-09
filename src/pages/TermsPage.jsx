import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { setMeta } from "@/lib/seo";
import { AlertTriangle } from "lucide-react";

const SECTIONS = [
  { id: "acceptance", title: "1. Acceptance of Terms" },
  { id: "description", title: "2. Platform Description" },
  { id: "disclaimer", title: "3. Not Financial Advice" },
  { id: "eligibility", title: "4. User Eligibility" },
  { id: "account", title: "5. Account Registration" },
  { id: "content", title: "6. Content & Predictions" },
  { id: "subscriptions", title: "7. Subscriptions & Payments" },
  { id: "prohibited", title: "8. Prohibited Conduct" },
  { id: "ip", title: "9. Intellectual Property" },
  { id: "scoring", title: "10. Accuracy Score & Ranking" },
  { id: "liability", title: "11. Limitation of Liability" },
  { id: "law", title: "12. Governing Law" },
  { id: "changes", title: "13. Changes to Terms" },
  { id: "contact", title: "14. Contact" },
];

function SectionBlock({ id, title, children }) {
  return (
    <div id={id} className="mb-10 scroll-mt-24">
      <h2 className="text-xl font-bold mb-4 text-foreground">{title}</h2>
      <div className="text-sm text-foreground/80 leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

export default function TermsPage() {
  const [active, setActive] = useState("acceptance");

  useEffect(() => {
    setMeta({ title: "Terms & Conditions — STOA", description: "STOA platform terms of service, user agreements, and legal policies." });
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
          <span>Terms & Conditions</span>
        </div>
        <h1 className="text-4xl font-extrabold mb-2">Terms & Conditions</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs bg-secondary text-muted-foreground px-3 py-1 rounded-full border border-border">Last updated: May 9, 2026</span>
          <span className="text-xs bg-secondary text-muted-foreground px-3 py-1 rounded-full border border-border">Effective: May 9, 2026</span>
        </div>
      </div>

      {/* Disclaimer banner */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 leading-relaxed">
          <strong>Important:</strong> STOA is not a registered investment advisor. Nothing on this platform constitutes financial advice. All content is for informational and educational purposes only.
        </p>
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
          <SectionBlock id="acceptance" title="1. Acceptance of Terms">
            <p>By accessing or using STOA ("the Platform"), you agree to be bound by these Terms and Conditions. If you do not agree, do not use the Platform.</p>
          </SectionBlock>

          <SectionBlock id="description" title="2. Platform Description">
            <p>STOA is a financial research and analyst tracking platform. Analysts publish investment research and lock predictions publicly. Investors can follow analysts, track prediction outcomes, and subscribe to premium research. STOA does not provide investment advice and is not a registered investment advisor.</p>
          </SectionBlock>

          <SectionBlock id="disclaimer" title="3. Not Financial Advice">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="font-bold text-red-700 mb-2">CRITICAL DISCLAIMER</p>
              <p className="text-red-800">Nothing published on STOA — including analyst reports, predictions, price targets, ratings, or any other content — constitutes financial advice, investment recommendations, or an offer to buy or sell securities. All content is for informational and educational purposes only. You should consult a licensed financial advisor before making investment decisions. STOA, its employees, and affiliated analysts are not responsible for investment decisions made based on platform content.</p>
            </div>
          </SectionBlock>

          <SectionBlock id="eligibility" title="4. User Eligibility">
            <p>You must be at least 18 years of age to use STOA. By using the Platform, you represent that you meet this requirement. Users in jurisdictions where access to this type of platform is prohibited should not use STOA.</p>
          </SectionBlock>

          <SectionBlock id="account" title="5. Account Registration">
            <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate, current, and complete information during registration. STOA reserves the right to suspend accounts that provide false information or violate these Terms.</p>
          </SectionBlock>

          <SectionBlock id="content" title="6. Content & Predictions">
            <p><strong>6.1 Prediction Locking:</strong> When analysts publish predictions on STOA, they are locked at the time of publication with a timestamp and price at lock. Predictions cannot be edited or deleted after publication. This is a core feature of the platform's integrity.</p>
            <p><strong>6.2 Analyst Content Standards:</strong> Analysts agree to publish honest, good-faith research. Content that is knowingly false, designed to manipulate markets, or constitutes pump-and-dump schemes is strictly prohibited and may result in account termination and reporting to relevant authorities.</p>
            <p><strong>6.3 Accuracy Calculation:</strong> STOA calculates analyst accuracy scores algorithmically based on resolved prediction outcomes. These calculations are automated and reflect historical data. Past accuracy does not predict future performance.</p>
            <p><strong>6.4 Content Ownership:</strong> Analysts retain ownership of their published content but grant STOA a non-exclusive license to display, distribute, and store it on the platform.</p>
          </SectionBlock>

          <SectionBlock id="subscriptions" title="7. Subscriptions & Payments">
            <p><strong>7.1 Analyst Pricing:</strong> Each analyst independently sets the price for their premium subscription. STOA does not control or guarantee analyst pricing.</p>
            <p><strong>7.2 Platform Fee:</strong> STOA retains 15% of all subscription revenue generated by analysts on the platform.</p>
            <p><strong>7.3 Refunds:</strong> Subscription fees are generally non-refundable except where required by applicable law. If an analyst's account is terminated for policy violations, affected subscribers may be entitled to a pro-rated refund.</p>
            <p><strong>7.4 Cancellation:</strong> Subscribers may cancel at any time. Access continues until the end of the current billing period.</p>
          </SectionBlock>

          <SectionBlock id="prohibited" title="8. Prohibited Conduct">
            <p>Users agree not to:</p>
            {[
              "Publish knowingly false or misleading financial information",
              "Attempt to manipulate prediction outcomes or accuracy scores",
              "Use the platform to coordinate market manipulation schemes",
              "Scrape, crawl, or systematically extract platform data without permission",
              "Impersonate analysts or other users",
              "Use the platform in violation of applicable securities laws",
            ].map((item, i) => <p key={i}>• {item}</p>)}
          </SectionBlock>

          <SectionBlock id="ip" title="9. Intellectual Property">
            <p>STOA's brand, logo, scoring algorithms, and platform infrastructure are owned by STOA Technologies Ltd. User-generated content (reports, predictions) remains the property of the respective authors.</p>
          </SectionBlock>

          <SectionBlock id="scoring" title="10. Accuracy Score & Ranking System">
            <p>STOA uses a proprietary Elo-based scoring system to calculate analyst accuracy. The methodology is described at <Link to="/scoring" className="text-primary hover:underline">/scoring</Link>. Scores are updated automatically and reflect historical prediction outcomes. STOA reserves the right to adjust the scoring methodology with notice. Scores are informational only and do not constitute endorsement of any analyst or their investment views.</p>
          </SectionBlock>

          <SectionBlock id="liability" title="11. Limitation of Liability">
            <div className="bg-secondary rounded-xl p-4 border border-border">
              <p className="font-bold mb-2">TO THE MAXIMUM EXTENT PERMITTED BY LAW, STOA SHALL NOT BE LIABLE FOR:</p>
              {["Investment losses resulting from following analyst content", "Inaccuracies in analyst track records or scores", "Platform downtime or data loss", "Actions of third-party analysts"].map((item, i) => <p key={i}>• {item}</p>)}
              <p className="mt-3">STOA's total liability for any claim shall not exceed the subscription fees paid by you in the 12 months prior to the claim.</p>
            </div>
          </SectionBlock>

          <SectionBlock id="law" title="12. Governing Law">
            <p>These Terms are governed by the laws of the State of Israel. Disputes shall be resolved in the courts of Tel Aviv.</p>
          </SectionBlock>

          <SectionBlock id="changes" title="13. Changes to Terms">
            <p>We may update these Terms periodically. Material changes will be communicated via email or platform notice. Continued use constitutes acceptance of updated Terms.</p>
          </SectionBlock>

          <SectionBlock id="contact" title="14. Contact">
            <p><strong>Email:</strong> <a href="mailto:legal@stoamarket.ai" className="text-primary hover:underline">legal@stoamarket.ai</a></p>
            <p><strong>Company:</strong> STOA Technologies Ltd.</p>
          </SectionBlock>
        </main>
      </div>
    </div>
  );
}