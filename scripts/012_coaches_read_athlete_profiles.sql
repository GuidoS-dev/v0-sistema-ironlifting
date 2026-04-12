-- ═══════════════════════════════════════════════════════════════
-- Allow coaches to read athlete profiles
--
-- Problem: No RLS policy allowed coaches to SELECT athlete
-- profiles, so the "Vincular usuario registrado" dropdown
-- was always empty.
--
-- This policy lets any authenticated coach (rol = 'coach')
-- read profiles where rol = 'atleta'.
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "coaches_read_athlete_profiles" ON public.profiles
  FOR SELECT
  USING (
    rol = 'atleta'
    AND EXISTS (
      SELECT 1 FROM public.profiles coach
      WHERE coach.id = auth.uid()
      AND coach.rol = 'coach'
    )
  );
