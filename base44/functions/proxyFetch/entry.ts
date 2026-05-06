// Yahoo Finance requires a crumb + cookie for v10 endpoints.
// We fetch them fresh on each cold start (Deno isolates are short-lived).

let _crumb = null;
let _cookie = null;

async function getYahooCrumb() {
  if (_crumb && _cookie) return { crumb: _crumb, cookie: _cookie };

  // Step 1: hit the consent/home page to get a cookie
  const consentRes = await fetch("https://finance.yahoo.com/", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });

  const cookieHeader = consentRes.headers.get("set-cookie") || "";
  // Extract relevant cookies
  const cookies = cookieHeader.split(",").map(c => c.split(";")[0].trim()).filter(Boolean).join("; ");
  _cookie = cookies;

  // Step 2: fetch crumb
  const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://finance.yahoo.com/",
      "Cookie": _cookie,
    },
  });

  if (crumbRes.ok) {
    _crumb = await crumbRes.text();
  }

  return { crumb: _crumb, cookie: _cookie };
}

Deno.serve(async (req) => {
  try {
    const { url, headers: extraHeaders } = await req.json();

    if (!url) {
      return Response.json({ error: "Missing url parameter" }, { status: 400 });
    }

    const baseHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://finance.yahoo.com/",
      ...extraHeaders,
    };

    // For v10 endpoints that need crumb auth
    const needsCrumb = url.includes("query2.finance.yahoo.com/v10") || url.includes("query1.finance.yahoo.com/v10");
    
    let fetchUrl = url;
    if (needsCrumb) {
      const { crumb, cookie } = await getYahooCrumb();
      if (crumb) {
        const separator = url.includes("?") ? "&" : "?";
        fetchUrl = `${url}${separator}crumb=${encodeURIComponent(crumb)}`;
        if (cookie) baseHeaders["Cookie"] = cookie;
      }
    }

    const res = await fetch(fetchUrl, { headers: baseHeaders });

    if (!res.ok) {
      // Invalidate crumb cache on 401 so next request retries
      if (res.status === 401) {
        _crumb = null;
        _cookie = null;
      }
      const text = await res.text().catch(() => "");
      return Response.json({ error: `Upstream error ${res.status}`, detail: text.slice(0, 300) }, { status: res.status });
    }

    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});