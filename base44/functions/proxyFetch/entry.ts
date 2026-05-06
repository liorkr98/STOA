Deno.serve(async (req) => {
  try {
    const { url, headers: extraHeaders } = await req.json();

    if (!url) {
      return Response.json({ error: "Missing url parameter" }, { status: 400 });
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        ...extraHeaders,
      },
    });

    if (!res.ok) {
      return Response.json({ error: `Upstream error ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});