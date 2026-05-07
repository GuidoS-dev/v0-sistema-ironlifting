# Architecture — Sistema Ironlifting

> Documento vivo. Reemplaza al `GLOSARIO_MONOLITO_LEGACY.md` (que documentaba el monolito de ~36k líneas).

## Estado actual

✅ Atomización completa (Fase 1 del refactor). Ver [REFACTOR_PLAN.md](./REFACTOR_PLAN.md) para el roadmap y commits asociados.

`app/sistema/coach-app.jsx` es ahora un orquestador delgado (~290 líneas) que define el componente `App` (default export). Toda la lógica vive en módulos atómicos por dominio.

## Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Lenguaje:** JavaScript (.jsx) en `app/sistema/`. Migración a TypeScript pendiente para Fase 2.
- **UI:** Radix UI primitives + Tailwind v4 + componentes custom
- **Backend:** Supabase (auth + Postgres). Cliente HTTP custom (`lib/supabase-client.js`) — no usa `@supabase/supabase-js` para queries.
- **Estado:** local component state + localStorage + delta sync con Supabase (LWW per-item).
- **Sync entre tabs:** `BroadcastChannel("liftplan:db-sync")` (`lib/sync.js`).
- **Charts:** Recharts (carga dinámica).
- **Testing:** Vitest + React Testing Library (180 tests sobre helpers y hooks).

## Carpetas top-level

```
app/                  # Next.js App Router pages + API routes
  api/                # Server routes (notify-registration, supabase-proxy)
  sistema/            # Aplicación principal coach (atomizada — ver abajo)
components/           # Componentes compartidos a nivel de proyecto
  cronometro/         # TabataTimer y subcomponentes
  ui/                 # Primitivas shadcn-style
lib/                  # Utilidades a nivel proyecto
design-system/        # Tokens y guías
public/               # Assets
scripts/              # Scripts auxiliares
tests/                # Vitest + Playwright
```

## `app/sistema/` — Estructura final

```
app/sistema/
  coach-app.jsx                 # Entry: <App> con auth/routing (LoginScreen | CoachApp | AtletaPanel)
  page.tsx                      # Next.js page (dynamic import sin SSR)
  styles/
    coach-app.css               # Estilos globales del sistema
  data/                         # Constantes y datos estáticos
    ejercicios.js               # EJERCICIOS[] (~144 ejercicios)
    constantes.js               # DIAS, MOMENTOS, CATEGORIAS, CAT_COLOR + factories (mkId, mkSemanas...)
    tablas-default.js           # INTENSIDADES, IRM_VALUES, INTENS_COLS, TABLA_DEFAULT, DEFAULT_EJS
    ciclo.js                    # FASES_CICLO (con iconos lucide)
    plantillas-meta.js          # PERIODOS, OBJETIVOS, NIVELES, ESCUELA_NIVELES + sus *_LABEL/*_COLOR
  lib/                          # Helpers puros (sin React) + cliente Supabase
    sanitize.js                 # toTitleCase, sanitize* (con tests)
    storage.js                  # localStorage safe + LIFTPLAN_LOCAL_SYNC_EVENT (con tests)
    auth-storage.js             # SESSION_KEY, save/load/clear session+profile, _emitAuth (con tests)
    overrides.js                # collect/restore overrides (mesos + atletas) (con tests)
    mappers.js                  # APP↔DB para atleta/meso/plantilla (con tests)
    coach-settings.js           # loadCoachSetting/saveCoachSetting/resolveSharedCoachId
    backup.js                   # collectBackupData/downloadBackup (con tests)
    calc.js                     # calcKg/calcSeriesRepsKg/getGrupo/calcSembradoSemana... (con tests)
    ciclo-menstrual.js          # parseAppDate/getFaseCiclo/formatFechaSemana... (con tests)
    navegacion.js               # PLANILLA_NAV_SELECTOR + handlers de teclado
    supabase-client.js          # SUPA_*, _session mutable, sb (auth/from/rpc/_handleEmailCallback)
    sync.js                     # _visResume, _bc, markDbSync, broadcastDbWrite
  hooks/
    useHistory.js               # Undo/redo persistido en localStorage (con tests)
    usePlantillas.js            # CRUD plantillas + sync con Supabase
  components/
    common/                     # Reutilizables cross-dominio
      Modal.jsx                 # Modal con focus trap y scroll lock
      ExercisePickerOverlay.jsx # Overlay full-screen para elegir ejercicio
      EjBuscador.jsx            # Buscador con dropdown
      EjBuscadorCompacto.jsx    # Buscador compacto para celdas de sembrado
      LayoutHelpers.jsx         # SectionHeader, CardGrid, NivelSection, AlumnoSectionHeader
      Logos.jsx                 # LogoHorizontal, LogoIL, LogoILSolo
    planilla/
      ComplementarioRow.jsx
      EjercicioRow.jsx
      TurnoCard.jsx
      PlanillaTurno.jsx         # Bestia ~3950 líneas — planilla principal
      PlanillaBasica.jsx        # Bloques %/S/R/Kg + clusters
      PlanillaPretemporada.jsx  # Multi-ejercicio con links (+/c/-)
    sembrado/
      EjCelda.jsx
      CeldaSembrado.jsx
      IntensityPickerModal.jsx
      SembradoMensual.jsx
      SemanaView.jsx
    resumen/
      ResumenGrupos.jsx
      DistribucionTurnos.jsx
      PageResumen.jsx
    pdf/
      PagePDF.jsx               # Vista imprimible con CSS print + sticky headers
    plantillas/
      PlantillaCard.jsx
      PlantillaPicker.jsx
      GuardarPlantillaModal.jsx
      CrearPlantillaModal.jsx
      DuplicarPlantillaModal.jsx
      PagePlantillas.jsx        # Galería
      PagePlantilla.jsx         # Editor
    atletas/
      AtletaCardItem.jsx
      AtletaForm.jsx
      MesocicloForm.jsx
      EditMesoModal.jsx
      EditVolModal.jsx
      PageAtletas.jsx           # Lista
      PageAtleta.jsx            # Ficha + planilla del atleta
    normativos/
      PageNormativos.jsx        # Globales del coach
      PageNormativosAtleta.jsx  # Override por atleta
    calculadora/
      PageCalculadora.jsx       # Tablas IRM editables + test modal
    coach/
      LoginScreen.jsx           # Login/registro/recovery
      PanelReferencia.jsx       # Sidebar read-only cross-tab
      CoachApp.jsx              # App principal del coach (tabs/router interno)
      AtletaPanel.jsx           # Vista del atleta (rol=atleta)
```

## Dominios funcionales

| Dominio | Ubicación principal | Estado refactor |
|---------|---------------------|-----------------|
| Auth | `lib/auth-storage.js`, `lib/supabase-client.js`, `components/coach/LoginScreen.jsx` | ✅ Hecho |
| Atletas | `components/atletas/`, `lib/mappers.js`, `lib/overrides.js` | ✅ Hecho |
| Mesociclos | `components/atletas/MesocicloForm.jsx`, `EditMesoModal.jsx`, `EditVolModal.jsx`, `lib/mappers.js` | ✅ Hecho |
| Planilla turno | `components/planilla/PlanillaTurno.jsx` (la bestia) | ✅ Hecho |
| Planilla básica | `components/planilla/PlanillaBasica.jsx` | ✅ Hecho |
| Planilla pretemporada | `components/planilla/PlanillaPretemporada.jsx` | ✅ Hecho |
| Sembrado | `components/sembrado/` | ✅ Hecho |
| Resumen | `components/resumen/` | ✅ Hecho |
| PDF | `components/pdf/PagePDF.jsx` | ✅ Hecho |
| Plantillas | `components/plantillas/`, `hooks/usePlantillas.js` | ✅ Hecho |
| Normativos | `components/normativos/` | ✅ Hecho |
| Calculadora | `components/calculadora/PageCalculadora.jsx` | ✅ Hecho |
| Cronómetro | `components/cronometro/` (root) | ✅ Hecho |
| Panel referencia | `components/coach/PanelReferencia.jsx` | ✅ Hecho |
| Sync/Backup | `lib/sync.js`, `lib/backup.js`, `lib/storage.js` | ✅ Hecho |

## Convenciones (post-refactor)

1. **Helpers puros** (sin React) en `lib/` con tests Vitest.
2. **Datos estáticos** en `data/`.
3. **Componentes** agrupados por dominio en `components/<dominio>/`.
4. **Hooks reutilizables** en `hooks/`.
5. **Imports relativos:** dentro de `app/sistema/` se usan rutas relativas (`../../data/X`, `./Y`). Cross-component imports apuntan al archivo directo.
6. **Estado mutable de módulo:** `lib/supabase-client.js` mantiene `_session` como `let` privado. Se expone por `getCurrentSession()`. Los listeners de auth viven en `lib/auth-storage.js` y se disparan desde el cliente vía `_emitAuth`.
7. **Tests:** los helpers puros y hooks tienen cobertura unitaria. Los componentes JSX dependen de la verificación visual y tests E2E (pendientes para Fase 2 — ver `REFACTOR_NOTES.md`).

## Fase 2 (mejoras diferidas)

Ver `REFACTOR_NOTES.md` para el detalle. Lo principal:
- Migración a TypeScript de los módulos extraídos.
- Diseño de `CoachContext` y `AtletaContext` para reemplazar el prop-drilling actual desde `App` → `CoachApp` → páginas.
- E2E Playwright cubriendo flujos críticos (login, crear mesociclo, editar planilla, sembrado, PDF).
- Mocks reales de Supabase para tests detallados de `supabase-client.js`, `coach-settings.js`, `usePlantillas`.
- Filtros laterales en `PagePlantillas` (Período/Objetivo/Nivel) — ver UX/UI en notas.
- Optimizaciones de performance (memoización de calc helpers, virtualización en grillas grandes).

## Testing

```bash
pnpm test           # Vitest unit tests (180 actualmente)
pnpm test:watch     # Modo watch
pnpm test:e2e       # Playwright (requiere `pnpm test:e2e:install` primero)
pnpm build          # Verifica que la app compila
pnpm dev            # http://localhost:3000/sistema
```
