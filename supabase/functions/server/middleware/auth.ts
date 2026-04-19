import { getAdminClient } from "../db.ts";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  tenant_id: string;
}

export async function verifyAuth(authHeader: string | undefined): Promise<AuthUser | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "");
  const admin = getAdminClient();

  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;

  // Get profile for role and tenant
  const { data: profile } = await admin
    .from("profiles")
    .select("role, tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: user.id,
    email: user.email || "",
    role: profile.role,
    tenant_id: profile.tenant_id,
  };
}
