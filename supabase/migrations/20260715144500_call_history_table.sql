-- =========================================
-- CALL HISTORY
-- =========================================
CREATE TABLE public.calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  caller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL CHECK (call_type IN ('audio', 'video')),
  status TEXT NOT NULL CHECK (status IN ('completed', 'missed', 'declined', 'cancelled', 'failed', 'ringing', 'calling', 'connected')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calls_conversation ON public.calls(conversation_id);
CREATE INDEX idx_calls_caller ON public.calls(caller_id);
CREATE INDEX idx_calls_receiver ON public.calls(receiver_id);

GRANT SELECT, INSERT, UPDATE ON public.calls TO authenticated;
GRANT ALL ON public.calls TO service_role;

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view calls"
  ON public.calls FOR SELECT TO authenticated
  USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Caller can insert calls"
  ON public.calls FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = caller_id
    AND public.is_conversation_participant(conversation_id, auth.uid())
  );

CREATE POLICY "Participants can update calls"
  ON public.calls FOR UPDATE TO authenticated
  USING (
    (auth.uid() = caller_id OR auth.uid() = receiver_id)
    AND public.is_conversation_participant(conversation_id, auth.uid())
  );
