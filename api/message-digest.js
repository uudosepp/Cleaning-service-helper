// Vercel Serverless Function — /api/message-digest
// Cron: kord päevas kell 18:00 — saadab lugemata vestluste kokkuvõtte

export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return res.status(500).json({ error: 'Missing env vars' });
  }

  try {
    const response = await fetch(`${url}/functions/v1/server/api/notify/digest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
