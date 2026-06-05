import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all drafts that have a scheduled_at in the past
    const now = new Date().toISOString();
    const drafts = await base44.asServiceRole.entities.Report.filter({ status: "draft" });

    const due = (drafts || []).filter(r =>
      r.scheduled_at && r.scheduled_at <= now
    );

    if (due.length === 0) {
      return Response.json({ published: 0 });
    }

    let count = 0;
    for (const report of due) {
      await base44.asServiceRole.entities.Report.update(report.id, {
        status: "published",
        published_at: now,
        scheduled_at: null,
      });
      count++;
    }

    return Response.json({ published: count });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});