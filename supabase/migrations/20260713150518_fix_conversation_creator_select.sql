CREATE POLICY "Conversation creators can view created conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (created_by = auth.uid());
