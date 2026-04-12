-- ═══════════════════════════════════════════════════════════════
-- Allow coaches to read athlete profiles
--
-- Problem: No RLS policy allowed coaches to SELECT athlete
-- profiles, so the "Vincular usuario registrado" dropdown
-- was always empty.
--
-- A direct subquery on profiles from an RLS policy on profiles
-- causes infinite recursion. We use a SECURITY DEFINER function
-- to check the current user's role, bypassing RLS for that check.
-- ═══════════════════════════════════════════════════════════════

-- Helper: check if current user is a coach (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND rol = 'coach'
  );
$$;

-- Policy: coaches can read athlete profiles
CREATE POLICY "coaches_read_athlete_profiles" ON public.profiles
  FOR SELECT
  USING (
    rol = 'atleta'
    AND public.is_coach()
  );
