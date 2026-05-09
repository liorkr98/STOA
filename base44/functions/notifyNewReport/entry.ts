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

    // Notify followers of this analyst with compelling copy
    const follows = await base44.asServiceRole.entities.Follow.filter({ analyst_email: report.created_by });
    const analystName = report.author_name || report.created_by?.split('@')[0] || 'An analyst';
    const direction = report.prediction_action ? `${report.prediction_action} $${report.prediction_ticker} —` : '';

    const notifPromises = (follows || []).map(f =>
      base44.asServiceRole.entities.Notification.create({
        user_email: f.follower_email,
        type: 'report',
        title: `📊 ${analystName} just published`,
        body: `${direction} Don't miss it: "${report.title}"`,
        link: `/report?id=${report.id}`,
        read: false,
      })
    );
    await Promise.all(notifPromises);

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});