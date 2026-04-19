import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { getAdminClient } from "./db.ts";
import { verifyAuth } from "./middleware/auth.ts";

const app = new Hono().basePath('/server');

app.use("*", logger(console.log));

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);

// Health check
app.get("/api/health", (c) => c.json({ status: "ok" }));

// ============================================================
// PUBLIC: Register organisation + admin user
// ============================================================
app.post("/api/auth/register-org", async (c) => {
  try {
    const { orgName, fullName, email, password } = await c.req.json();

    if (!orgName || !fullName || !email || !password) {
      return c.json({ error: "Kõik väljad on kohustuslikud" }, 400);
    }

    const admin = getAdminClient();

    // 1. Create tenant
    const { data: tenant, error: tenantError } = await admin
      .from("tenants")
      .insert({ name: orgName })
      .select()
      .single();

    if (tenantError) {
      console.error("Tenant creation error:", tenantError);
      return c.json({ error: tenantError.message }, 500);
    }

    // 2. Create auth user with admin role
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        tenant_id: tenant.id,
        full_name: fullName,
        role: "admin",
      },
    });

    if (authError) {
      // Cleanup tenant
      await admin.from("tenants").delete().eq("id", tenant.id);
      console.error("Auth user creation error:", authError);
      return c.json({ error: authError.message }, 500);
    }

    return c.json({
      tenantId: tenant.id,
      userId: authData.user.id,
      message: "Organisatsioon loodud!",
    });
  } catch (error) {
    console.error("Register org error:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// ============================================================
// ADMIN ONLY: Create employee (cleaner) account
// ============================================================
app.post("/api/auth/create-employee", async (c) => {
  const user = await verifyAuth(c.req.header("Authorization"));
  if (!user) return c.json({ error: "Pole autoriseeritud" }, 401);
  if (user.role !== "admin") return c.json({ error: "Ainult admin" }, 403);

  try {
    const { fullName, email, phone } = await c.req.json();

    if (!fullName || !email) {
      return c.json({ error: "Nimi ja email on kohustuslikud" }, 400);
    }

    // Generate random password
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const admin = getAdminClient();

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        tenant_id: user.tenant_id,
        full_name: fullName,
        phone: phone || null,
        role: "cleaner",
      },
    });

    if (authError) {
      console.error("Create employee error:", authError);
      return c.json({ error: authError.message }, 500);
    }

    return c.json({
      userId: authData.user.id,
      password,
    });
  } catch (error) {
    console.error("Create employee error:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// ============================================================
// ADMIN ONLY: Delete employee
// ============================================================
app.post("/api/auth/delete-employee", async (c) => {
  const user = await verifyAuth(c.req.header("Authorization"));
  if (!user) return c.json({ error: "Pole autoriseeritud" }, 401);
  if (user.role !== "admin") return c.json({ error: "Ainult admin" }, 403);

  try {
    const { userId } = await c.req.json();
    if (!userId) return c.json({ error: "userId on kohustuslik" }, 400);

    const admin = getAdminClient();

    // Verify employee belongs to same tenant
    const { data: profile } = await admin
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .single();

    if (!profile || profile.tenant_id !== user.tenant_id) {
      return c.json({ error: "Töötajat ei leitud" }, 404);
    }

    // Delete auth user (cascades to profile via FK)
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      console.error("Delete employee error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Delete employee error:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// ============================================================
// ADMIN ONLY: Reset employee password
// ============================================================
app.post("/api/auth/reset-password", async (c) => {
  const user = await verifyAuth(c.req.header("Authorization"));
  if (!user) return c.json({ error: "Pole autoriseeritud" }, 401);
  if (user.role !== "admin") return c.json({ error: "Ainult admin" }, 403);

  try {
    const { userId } = await c.req.json();
    if (!userId) return c.json({ error: "userId on kohustuslik" }, 400);

    const admin = getAdminClient();

    // Verify employee belongs to same tenant
    const { data: profile } = await admin
      .from("profiles")
      .select("tenant_id, full_name")
      .eq("id", userId)
      .single();

    if (!profile || profile.tenant_id !== user.tenant_id) {
      return c.json({ error: "Töötajat ei leitud" }, 404);
    }

    // Generate new password
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const { error } = await admin.auth.admin.updateUserById(userId, { password });
    if (error) {
      console.error("Reset password error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ password, name: profile.full_name });
  } catch (error) {
    console.error("Reset password error:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// ============================================================
// EMAIL NOTIFICATIONS (kutsutud andmebaasi triggerist)
// ============================================================
app.post("/api/notify/email", async (c) => {
  try {
    const { to_email, to_name, tenant_name, title, body, type } = await c.req.json();

    if (!to_email || !title) {
      return c.json({ error: "Missing fields" }, 400);
    }

    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");

    // Kui Resend API key pole seadistatud, logi ja jäta vahele
    if (!RESEND_KEY) {
      console.log(`[Email] No RESEND_API_KEY — skipping email to ${to_email}: ${title}`);
      return c.json({ skipped: true, reason: "No RESEND_API_KEY" });
    }

    // Emoji tüübi järgi
    const emoji: Record<string, string> = {
      task_assigned: '📋',
      task_confirmed: '✅',
      task_declined: '❌',
      task_completed: '🎉',
      task_cancelled: '🚫',
      message: '💬',
      system: 'ℹ️',
    };

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="420" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #e4e4e7;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <tr><td style="padding:32px 32px 8px;text-align:center;">
          <div style="width:48px;height:48px;background-color:#f0f0ff;border-radius:50%;display:inline-block;line-height:48px;font-size:20px;">${emoji[type] || '📋'}</div>
        </td></tr>
        <tr><td style="padding:12px 32px 20px;text-align:center;">
          <h1 style="margin:0 0 8px;font-size:18px;font-weight:600;color:#18181b;">${title}</h1>
          ${body ? `<p style="margin:0;font-size:14px;color:#71717a;line-height:1.6;">${body}</p>` : ''}
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #f4f4f5;text-align:center;">
          <p style="margin:0;font-size:11px;color:#d4d4d8;">${tenant_name || 'Cleaning Service Helper'}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_KEY}`,
      },
      body: JSON.stringify({
        from: Deno.env.get("EMAIL_FROM") || "Cleaning Service Helper <noreply@resend.dev>",
        to: [to_email],
        subject: `${emoji[type] || ''} ${title}`.trim(),
        html,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error(`[Email] Resend error: ${error}`);
      return c.json({ error }, 500);
    }

    console.log(`[Email] Sent to ${to_email}: ${title}`);
    return c.json({ sent: true });
  } catch (error) {
    console.error(`[Email] Error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// ============================================================
// UNREAD MESSAGES DIGEST — kutsu cron-iga 1x päevas
// Saadab emaili kasutajatele kellel on lugemata vestluse sõnumeid
// ============================================================
app.post("/api/notify/digest", async (c) => {
  try {
    const admin = getAdminClient();

    // Leia kasutajad kellel on lugemata sõnumeid ja email_notifications=true
    const { data: unreadUsers } = await admin.rpc('get_unread_message_users');

    // Kui pole RPC-d, tee otse query
    const { data: messages } = await admin
      .from('messages')
      .select('receiver_id, sender_id, content, created_at')
      .is('read_at', null)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (!messages || messages.length === 0) {
      return c.json({ sent: 0 });
    }

    // Grupeeri saajate kaupa
    const byReceiver: Record<string, { sender_ids: Set<string>; count: number }> = {};
    for (const msg of messages) {
      if (!byReceiver[msg.receiver_id]) {
        byReceiver[msg.receiver_id] = { sender_ids: new Set(), count: 0 };
      }
      byReceiver[msg.receiver_id].sender_ids.add(msg.sender_id);
      byReceiver[msg.receiver_id].count++;
    }

    let sent = 0;
    for (const [receiverId, info] of Object.entries(byReceiver)) {
      // Kontrolli email eelistust
      const { data: profile } = await admin
        .from('profiles')
        .select('email, full_name, email_notifications')
        .eq('id', receiverId)
        .single();

      if (!profile?.email_notifications) continue;

      // Leia saatjate nimed
      const senderNames: string[] = [];
      for (const sid of info.sender_ids) {
        const { data: sender } = await admin.from('profiles').select('full_name').eq('id', sid).single();
        if (sender) senderNames.push(sender.full_name);
      }

      // Loo teavitus
      await admin.from('notifications').insert({
        tenant_id: (await admin.from('profiles').select('tenant_id').eq('id', receiverId).single()).data?.tenant_id,
        user_id: receiverId,
        type: 'message',
        title: `${info.count} lugemata sõnumit`,
        body: `Sulle kirjutas: ${senderNames.join(', ')}`,
      });

      sent++;
    }

    return c.json({ sent });
  } catch (error) {
    console.error(`[Digest] Error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

Deno.serve(app.fetch);
