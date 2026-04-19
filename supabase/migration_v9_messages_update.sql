-- V9: Messages UPDATE poliitika — saaja saab märkida sõnumeid loetuks
-- Käivita Supabase SQL editoris

CREATE POLICY "messages_update_receiver" ON public.messages
  FOR UPDATE USING (
    tenant_id = public.get_my_tenant_id() AND receiver_id = auth.uid()
  );
