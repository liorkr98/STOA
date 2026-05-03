import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const report = payload.data;
    if (!report) return Response.json({ ok: true, skipped: 'no data' });

    const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const adminEmail = adminUsers?.[0]?.email;
    if (!adminEmail) return Response.json({ ok: true, skipped: 'no admin email' });

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: adminEmail,
      subject: `📄 New Report Published: "${report.title}"`,
      body: `
## New Report on Stakify

**Title:** ${report.title}

**Author:** ${report.author_name || report.created_by || 'Unknown'}

**Status:** ${report.status}

**Tickers:** ${(report.tickers || []).join(', ') || 'None'}

**Prediction:** ${report.prediction_action ? `${report.prediction_action} $${report.prediction_ticker}` : 'None'}

**Published at:** ${new Date().toUTCString()}

[View Report](https://app.base44.com/report?id=${report.id})
      `.trim(),
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});