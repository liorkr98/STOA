import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const allReports = await base44.asServiceRole.entities.Report.list('-created_date', 100);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentReports = allReports.filter(r => new Date(r.created_date) >= oneWeekAgo);

    const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const adminEmail = adminUsers?.[0]?.email;
    if (!adminEmail) return Response.json({ ok: true, skipped: 'no admin email' });

    const published = recentReports.filter(r => r.status === 'published');
    const drafts = recentReports.filter(r => r.status === 'draft');

    const reportRows = recentReports.map(r => `
      <tr>
        <td>${r.title || 'Untitled'}</td>
        <td>${r.author_name || r.created_by || '—'}</td>
        <td>${r.status === 'published' ? '✅ Published' : '📝 Draft'}</td>
        <td>${(r.tickers || []).join(', ') || '—'}</td>
        <td>${new Date(r.created_date).toLocaleDateString()}</td>
      </tr>
    `).join('');

    const body = `
## 📊 Weekly Report Summary — Stakify

Week ending ${new Date().toDateString()}

- **Total Reports:** ${recentReports.length}
- **Published:** ${published.length}
- **Drafts:** ${drafts.length}

${recentReports.length > 0 ? `| Title | Author | Status | Tickers | Date |\n|---|---|---|---|---|\n${recentReports.map(r => `| ${r.title || 'Untitled'} | ${r.author_name || '—'} | ${r.status} | ${(r.tickers || []).join(', ') || '—'} | ${new Date(r.created_date).toLocaleDateString()} |`).join('\n')}` : 'No new reports this week.'}

[Open Stakify](https://app.base44.com/)
    `.trim();

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: adminEmail,
      subject: `📊 Weekly Summary: ${recentReports.length} new report(s) this week`,
      body,
    });

    return Response.json({ ok: true, reportCount: recentReports.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});