
-- ========= Storage RLS: chat-attachments =========
-- Path convention: {conversation_id}/{sender_id}/{uuid}-{filename}
CREATE POLICY "chat-attachments read for conversation participants"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND public.is_conversation_participant(
    ((storage.foldername(name))[1])::uuid,
    auth.uid()
  )
);

CREATE POLICY "chat-attachments insert by sender participant"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND ((storage.foldername(name))[2])::uuid = auth.uid()
  AND public.is_conversation_participant(
    ((storage.foldername(name))[1])::uuid,
    auth.uid()
  )
);

CREATE POLICY "chat-attachments delete own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND ((storage.foldername(name))[2])::uuid = auth.uid()
);

-- ========= Message reactions =========
CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
CREATE INDEX message_reactions_message_id_idx ON public.message_reactions(message_id);

GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions readable to conversation participants"
ON public.message_reactions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_reactions.message_id
    AND public.is_conversation_participant(m.conversation_id, auth.uid())
  )
);
CREATE POLICY "reactions insert own in own conversations"
ON public.message_reactions FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_reactions.message_id
    AND public.is_conversation_participant(m.conversation_id, auth.uid())
  )
);
CREATE POLICY "reactions delete own"
ON public.message_reactions FOR DELETE TO authenticated
USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

-- ========= Starred messages =========
CREATE TABLE public.starred_messages (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, message_id)
);
CREATE INDEX starred_messages_user_idx ON public.starred_messages(user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.starred_messages TO authenticated;
GRANT ALL ON public.starred_messages TO service_role;
ALTER TABLE public.starred_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "starred manage own"
ON public.starred_messages FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ========= Notifications =========
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  preview TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications read own"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "notifications update own"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications delete own"
ON public.notifications FOR DELETE TO authenticated
USING (user_id = auth.uid());
-- Inserts happen via SECURITY DEFINER trigger; no INSERT policy for users.

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: fan-out notification to other conversation participants on new message
CREATE OR REPLACE FUNCTION public.notify_message_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, kind, conversation_id, message_id, actor_id, preview)
  SELECT cp.user_id, 'message', NEW.conversation_id, NEW.id, NEW.sender_id,
         COALESCE(NULLIF(LEFT(NEW.content, 140), ''), NEW.file_name, '[attachment]')
  FROM public.conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id
    AND cp.user_id <> NEW.sender_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_message_participants
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_message_participants();

-- Trigger: notification on new reaction (to the message author, if not self-react)
CREATE OR REPLACE FUNCTION public.notify_reaction_author()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  author UUID;
  conv UUID;
BEGIN
  SELECT sender_id, conversation_id INTO author, conv FROM public.messages WHERE id = NEW.message_id;
  IF author IS NULL OR author = NEW.user_id THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, kind, conversation_id, message_id, actor_id, preview)
  VALUES (author, 'reaction', conv, NEW.message_id, NEW.user_id, NEW.emoji);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_reaction_author
AFTER INSERT ON public.message_reactions
FOR EACH ROW EXECUTE FUNCTION public.notify_reaction_author();
