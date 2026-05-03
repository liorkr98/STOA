import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

async function supabaseInsert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function supabaseUpsert(table, data, onConflict) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(data),
  });
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { type, data } = await req.json();

    let result;

    if (type === 'report') {
      result = await supabaseInsert('reports', {
        ...data,
        author_id: user.id,
        author_email: user.email,
        created_at: new Date().toISOString(),
      });
    } else if (type === 'prediction') {
      result = await supabaseInsert('predictions', {
        ...data,
        user_id: user.id,
        created_at: new Date().toISOString(),
      });
    } else if (type === 'profile') {
      result = await supabaseUpsert('profiles', {
        ...data,
        user_id: user.id,
        email: user.email,
        updated_at: new Date().toISOString(),
      }, 'user_id');
    } else if (type === 'payment') {
      result = await supabaseInsert('payments', {
        ...data,
        user_id: user.id,
        user_email: user.email,
        created_at: new Date().toISOString(),
      });
    } else {
      return Response.json({ error: 'Unknown type' }, { status: 400 });
    }

    return Response.json({ success: true, data: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});