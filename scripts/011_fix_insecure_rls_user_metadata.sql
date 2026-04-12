-- ═══════════════════════════════════════════════════════════════
-- FIX: Remove insecure RLS policy that references user_metadata
--
-- Problem: "Coaches can read athlete profiles" used
--   auth.jwt() -> 'user_metadata' ->> 'tipo'
-- which is editable by end users and should never be used
-- in a security context.
--
-- The existing policy "coaches_view_athletes" (from 001) already
-- grants coaches SELECT on profiles by securely checking
-- profiles.tipo = 'coach' via subquery.
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Coaches can read athlete profiles" ON public.profiles;
