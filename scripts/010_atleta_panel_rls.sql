-- ═══════════════════════════════════════════════════════════════
-- RLS policies for athlete self-access
-- Allows athletes to see their own data via profile_id link
-- ═══════════════════════════════════════════════════════════════

-- Allow athletes to read their own atleta row via profile_id
CREATE POLICY "atleta_self_read" ON public.atletas
  FOR SELECT
  USING (profile_id = auth.uid());

-- Allow athletes to read mesociclos linked to their atleta record
CREATE POLICY "atleta_meso_read" ON public.mesociclos
  FOR SELECT
  USING (
    app_atleta_id IN (
      SELECT app_id FROM public.atletas WHERE profile_id = auth.uid()
    )
  );

-- Allow coaches to read athlete profiles (for the user selector dropdown)
-- Uses JWT metadata instead of subquery on profiles to avoid recursive RLS evaluation
CREATE POLICY "Coaches can read athlete profiles" ON public.profiles
  FOR SELECT
  USING (
    rol = 'atleta'
    AND (auth.jwt() -> 'user_metadata' ->> 'tipo') = 'coach'
  );
