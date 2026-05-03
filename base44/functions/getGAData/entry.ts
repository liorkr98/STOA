import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("google_analytics");

    const propsRes = await fetch(
      'https://analyticsadmin.googleapis.com/v1beta/properties?filter=parent:accounts/-&pageSize=20',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const propsData = await propsRes.json();
    const properties = propsData.properties || [];

    if (properties.length === 0) {
      return Response.json({ error: 'No GA4 properties found' }, { status: 404 });
    }

    const propertyId = properties[0].name.replace('properties/', '');

    const reportRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateRanges: [{ startDate: '180daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'yearMonth' }],
          metrics: [
            { name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' },
            { name: 'bounceRate' }, { name: 'averageSessionDuration' }, { name: 'newUsers' },
          ],
          orderBys: [{ dimension: { dimensionName: 'yearMonth' } }],
          limit: 6,
        }),
      }
    );
    const reportData = await reportRes.json();

    const totalsRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          metrics: [
            { name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' },
            { name: 'bounceRate' }, { name: 'newUsers' },
          ],
        }),
      }
    );
    const totalsData = await totalsRes.json();

    const pagesRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 10,
        }),
      }
    );
    const pagesData = await pagesRes.json();

    return Response.json({
      propertyId,
      propertyName: properties[0].displayName,
      monthlyTrend: reportData,
      totals: totalsData,
      topPages: pagesData,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});