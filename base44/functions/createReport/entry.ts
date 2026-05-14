import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

export default async function handler(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);

  try {
    // Get the calling user
    const currentUser = await base44.auth.me();
    if (!currentUser) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only analysts and admins can create reports
    const users = await base44.asServiceRole.entities.User.filter({ created_by: currentUser.email });
    const user = users?.[0];
    if (!user || (user.role !== 'analyst' && user.role !== 'admin')) {
      return Response.json({ error: 'Permission denied: only analysts and admins can publish reports' }, { status: 403 });
    }

    // Get the report data from the request body
    const reportData = await req.json();

    // Create the report using service role (bypasses RLS)
    const created = await base44.asServiceRole.entities.Report.create(reportData);

    return Response.json({ report: created }, { status: 200 });
  } catch (err: any) {
    return Response.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
