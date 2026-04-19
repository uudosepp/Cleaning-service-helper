// Vercel Serverless Function — /api/keep-alive
// Kutsutakse cron job-iga (vercel.json seadistus)

export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return res.status(500).json({ error: 'Missing env vars' });
  }

  try {
    const response = await fetch(`${url}/rest/v1/tenants?select=id&limit=1`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
    });

    return res.status(200).json({
      status: 'ok',
      db: response.status,
      time: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
