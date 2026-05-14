import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

export default async function handler(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);

  try {
    const currentUser = await base44.auth.me();
    if (!currentUser) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const reportData = await req.json();
    const created = await base44.asServiceRole.entities.Report.create(reportData);

    return Response.json({ report: created }, { status: 200 });
  } catch (err: any) {
    return Response.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
