const DEFAULT_IMAGE = "https://stoamarket.ai/og-image.png";
const DEFAULT_DESC = "Follow verified analysts, track real predictions, and make smarter investment decisions backed by transparent data.";

export function setMeta({ title, description, image, url, type = "website" } = {}) {
  const fullTitle = title ? `${title} | STOA` : "STOA — Verified Financial Research";
  const desc = description || DEFAULT_DESC;
  const img = image || DEFAULT_IMAGE;
  const canonical = url || window.location.href;

  document.title = fullTitle;

  const setTag = (sel, attr, key, val) => {
    let el = document.querySelector(sel);
    if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
    el.content = val;
  };

  setTag('meta[name="description"]', "name", "description", desc);
  setTag('meta[property="og:title"]', "property", "og:title", fullTitle);
  setTag('meta[property="og:description"]', "property", "og:description", desc);
  setTag('meta[property="og:type"]', "property", "og:type", type);
  setTag('meta[property="og:url"]', "property", "og:url", canonical);
  setTag('meta[property="og:image"]', "property", "og:image", img);
  setTag('meta[property="og:site_name"]', "property", "og:site_name", "STOA");
  setTag('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
  setTag('meta[name="twitter:title"]', "name", "twitter:title", fullTitle);
  setTag('meta[name="twitter:description"]', "name", "twitter:description", desc);
  setTag('meta[name="twitter:image"]', "name", "twitter:image", img);

  // Canonical link
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
  link.href = canonical;
}

export function injectJsonLd(id, data) {
  let script = document.getElementById(id);
  if (!script) { script = document.createElement("script"); script.id = id; script.type = "application/ld+json"; document.head.appendChild(script); }
  script.textContent = JSON.stringify(data);
}