# Refactor Plan — Atomización del monolito `coach-app.jsx`

> **Objetivo:** dividir `app/sistema/coach-app.jsx` (~36.645 líneas) en módulos atómicos sin alterar funcionalidad. Migración a TS, optimización y mejoras de seguridad se posponen a una fase 2.

---

## ⚡ Para retomar la conversación (leer primero)

**Branch:** `refactor/atomize-monolith` (base: `main`).
**Worktree:** `.claude/worktrees/crazy-williams-7b6e7c/`.

**Archivos clave:**
- `REFACTOR_PLAN.md` (este archivo) — roadmap y estado.
- `REFACTOR_NOTES.md` — mejoras detectadas pero diferidas a fase 2.
- `ARCHITECTURE.md` — doc vivo de arquitectura.
- `GLOSARIO_MONOLITO.md` — mapa actual del monolito (legacy, se reemplaza al final).

**Estado actual:**
- ✅ **Fase 0** — Setup completo (Vitest + Playwright + tracking files).
- ✅ **Fase 1.1** — CSS global extraído a `app/sistema/styles/coach-app.css`.
- ✅ **Fase 2.1** — `EJERCICIOS[]` extraído a `app/sistema/data/ejercicios.js`.
- ✅ **Fase 2.2** — `DIAS`, `MOMENTOS`, `CATEGORIAS`, `CAT_COLOR` y factories → `app/sistema/data/constantes.js`.
- ✅ **Fase 2.3** — `INTENSIDADES`, `IRM_VALUES`, `INTENS_COLS`, `DEFAULT_EJS`, `TABLA_DEFAULT` → `app/sistema/data/tablas-default.js`.
- ✅ **Fase 2.4** — `FASES_CICLO` → `app/sistema/data/ciclo.js`; `PERIODOS`/`OBJETIVOS`/`NIVELES`/`ESCUELA_NIVELES` → `app/sistema/data/plantillas-meta.js`.
- ✅ **Fase 2.5** — Logos SVG → `app/sistema/components/common/Logos.jsx`.
- ✅ **Fase 3.1** — `sanitize.js` extraído con 19 tests Vitest.
- ✅ **Fase 3.2** — `storage.js` extraído con 16 tests (incluye `LIFTPLAN_LOCAL_SYNC_EVENT` + `emitLocalSyncEvent` movidos antes de tiempo desde 3.6/3.7 por dependencia con `writeLocalJson`).
- ✅ **Fase 3.3** — `auth-storage.js` extraído con 22 tests. `let _session = loadSession()` queda en coach-app.jsx (mutable, lo migra Fase 4).
- ✅ **Fase 3.5** — `overrides.js` extraído con 16 tests (orden invertido con 3.4 porque mappers depende de overrides).
- ✅ **Fase 3.4** — `mappers.js` extraído con 13 tests.
- ✅ **Fase 3.8** — `calc.js` extraído con 27 tests (saltado 3.6/3.7 porque dependen del cliente Supabase aún en monolito).
- ✅ **Fase 3.9** — `ciclo-menstrual.js` extraído con 25 tests.
- ✅ **Fase 3.10** — `navegacion.js` extraído con 9 smoke tests (handlers DOM-pesados, cobertura completa requeriría Playwright).
- ✅ **Fase 4.1+4.2** — `supabase-client.js` extraído (combina 4.1 y 4.2 porque `_session` es estado mutable compartido). 9 smoke tests. `_session?.access_token` externo reemplazado por `getCurrentSession()`.
- ✅ **Fase 4.3** — `sync.js` (`_visResume`, `_bc`, `markDbSync`, `broadcastDbWrite`) extraído con 4 tests.
- ✅ **Fase 3.6** — `coach-settings.js` extraído con 5 smoke tests.
- ✅ **Fase 3.7** — `backup.js` extraído con 8 tests.
- ✅ **Fase 5.1** — `useHistory` hook extraído con 8 tests.
- ✅ **Fase 5.2** — `usePlantillas` hook extraído (sin tests detallados — requiere mock de sb).
- ✅ **Fase 6** — Todos los 11 componentes hoja extraídos (Modal, ExercisePicker, EjBuscador*, EjCelda, CeldaSembrado, *Row, AtletaCardItem, PlantillaCard, LayoutHelpers).
- ✅ **Fase 7** — 14 componentes medianos extraídos (TurnoCard, IntensityPickerModal, SembradoMensual, SemanaView, ResumenGrupos, DistribucionTurnos, AtletaForm, MesocicloForm, EditMesoModal, EditVolModal, GuardarPlantillaModal, CrearPlantillaModal, DuplicarPlantillaModal, PlantillaPicker).
- ✅ **Fase 8** — 8 páginas extraídas (PageNormativos, PageNormativosAtleta, PageCalculadora, PagePlantillas, PagePlantilla, PageResumen, PagePDF, PageAtletas).
- ✅ **Fase 9** — Las bestias (PlanillaTurno ~3950 líneas, PlanillaBasica, PlanillaPretemporada, PageAtleta, AtletaPanel) extraídas.
- ✅ **Fase 10.3-10.5** — LoginScreen, PanelReferencia, CoachApp extraídos. 10.1/10.2 (Contexts) diferidos a Fase 2 del refactor.
- 🎉 **`coach-app.jsx` reducido a 296 líneas** (orquestador con `App` default export).
- ⏭️ **Próximo:** Fase 11 (cleanup, sin merge a main).

**Commits hasta ahora:**
- `680a506` chore(refactor): Phase 0 — testing setup + tracking files
- `d10fb88` refactor(sistema): extract global CSS [Phase 1.1]

**Entorno:**
- `.env.local` (gitignored) tiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` reales.
- Dev server: `pnpm dev` → http://localhost:3000/sistema
- Tests: `pnpm test` (Vitest) y `pnpm test:e2e` (Playwright; primero `pnpm test:e2e:install`).
- Build: `pnpm build` (debe pasar después de cada paso).

**Modo de trabajo durante el refactor:**
- Solo **chequeos visuales** (sin crear/editar/borrar) en pasos de bajo riesgo (Fase 1-3) — los cambios sincronizan a Supabase prod.
- Para Fase 8+ (handlers, hooks, las bestias), considerar Supabase de dev separado.
- Solo el usuario hace cambios en la DB. El asistente no debe ejecutar acciones que escriban a Supabase sin pedir.

---

## Reglas inmutables del refactor

1. **Fase 1 = solo extracción.** Nada de mejorar, optimizar, tipar o renombrar. Cualquier mejora detectada va a `REFACTOR_NOTES.md`.
2. **Un commit/PR por paso.** Atómicos, reversibles.
3. **Verbatim.** El código extraído se copia tal cual. Si hay que tocar algo (un import, un re-export), se anota.
4. **Build pasa antes de cada commit.**
5. **El usuario aprueba cada paso visualmente** antes de avanzar al siguiente.
6. Idioma del usuario: español. Código, identificadores y mensajes de commit: inglés.

---

## Protocolo por paso

1. Crear archivo destino con el código copiado **verbatim**.
2. Reemplazar la sección en `coach-app.jsx` por `import`.
3. Tests automáticos del módulo extraído (helpers puros y hooks: tests reales; componentes grandes: smoke test).
4. `pnpm build` debe pasar sin errores.
5. **Verificación manual** del usuario en `pnpm dev` sobre las áreas afectadas (checklist por paso, ver abajo).
6. Anotar en `REFACTOR_NOTES.md` cualquier mejora detectada pero no aplicada.
7. Commit + push + PR contra `refactor/atomize-monolith`.
8. Marcar el paso como ✅ en este archivo.

Si algo falla en cualquier punto: revertir solo ese paso (`git reset --hard HEAD~1` o `git revert`) y replanificar.

---

## Estructura destino

```
app/sistema/
  coach-app.jsx           # Orquestador final (~500 líneas al terminar)
  lib/                    # Helpers puros (sin React)
  data/                   # Constantes y datos estáticos
  hooks/                  # Hooks reutilizables
  components/
    common/               # Modal, ExercisePickerOverlay, EjBuscador*
    planilla/             # PlanillaTurno, PlanillaBasica, PlanillaPretemporada
    sembrado/             # SembradoMensual, CeldaSembrado, EjCelda
    resumen/              # PageResumen, ResumenGrupos, DistribucionTurnos
    pdf/                  # PagePDF
    plantillas/           # PagePlantillas, PagePlantilla, modales
    atletas/              # PageAtletas, PageAtleta, AtletaPanel, modales
    normativos/           # PageNormativos, PageNormativosAtleta
    calculadora/          # PageCalculadora
    coach/                # CoachApp, LoginScreen, PanelReferencia
  styles/
    coach-app.css         # ✅ Extraído en Fase 1.1
  contexts/               # CoachContext, AtletaContext (Fase 10)
```

---

## Roadmap por fases

### Fase 0 — Setup ✅ (completada — `680a506`)
- [x] Branch `refactor/atomize-monolith` desde `main`.
- [x] Vitest + RTL + jsdom + Playwright instalados y configurados.
- [x] Scripts `test`, `test:watch`, `test:e2e` en `package.json`.
- [x] Smoke test pasa.
- [x] `REFACTOR_PLAN.md`, `REFACTOR_NOTES.md`, `ARCHITECTURE.md` creados.
- [x] `pnpm build` verificado.

### Fase 1 — CSS global ✅ (completada — `d10fb88`)
- [x] **1.1** Extraer template literal `css` (~262 líneas) a `app/sistema/styles/coach-app.css`. Import al tope del módulo. `<style>{css}</style>` removido.

### Fase 2 — Constantes y datos puros
- [x] **2.1** `EJERCICIOS[]` (≈144 ejercicios) → `app/sistema/data/ejercicios.js`.
- [x] **2.2** `DIAS`, `MOMENTOS`, `CATEGORIAS`, `CAT_COLOR`, factories (`mkId`, `mkTurnos`, `mkSemanas`, `mkBloqueBasica`, `mkEjBasica`, `EMPTY_NAME_SENTINEL`, `resolveExerciseName`, `mkTurnosBasica`, `mkSemanasBasica`, `mkEjPretemp`, `mkTurnosPretemp`, `mkSemanasPretemp`) → `app/sistema/data/constantes.js`.
- [x] **2.3** `INTENSIDADES`, `IRM_VALUES`, `INTENS_COLS`, `DEFAULT_EJS`, `TABLA_DEFAULT` → `app/sistema/data/tablas-default.js`.
- [x] **2.4** `FASES_CICLO` → `app/sistema/data/ciclo.js`. `PERIODOS`, `OBJETIVOS`, `NIVELES`, `ESCUELA_NIVELES` → `app/sistema/data/plantillas-meta.js`.
- [x] **2.5** Logos SVG (`LogoHorizontal`, `LogoIL`, `LogoILSolo`) → `app/sistema/components/common/Logos.jsx`.

### Fase 3 — Helpers puros sin React (con tests Vitest)
- [x] **3.1** Sanitización (`toTitleCase`, `sanitizeStringInput`, `sanitizeInput`, `sanitizeRequestBody`) → `app/sistema/lib/sanitize.js` + tests.
- [x] **3.2** localStorage safe (`_freeLocalStorageSpace`, `safeSetItem`, `readLocalJson`, `writeLocalJson`, `asPlainObject`, `asArray`, `emitLocalSyncEvent`, `LIFTPLAN_LOCAL_SYNC_EVENT`) → `app/sistema/lib/storage.js` + tests.
- [x] **3.3** Auth helpers (`SESSION_KEY`, `PROFILE_KEY_PREFIX`, save/load/clear session+profile, `_authListeners`, `onAuthChange`, `_emitAuth`, `_authMessageMap`, `_authErrorMessage`, `_runtimeErrorMessage`) → `app/sistema/lib/auth-storage.js` + tests.
- [x] **3.4** Mapeos APP↔DB (`atletaToDb`, `atletaFromDb`, `mesoToDb`, `mesoFromDb`, `plantillaToDb`, `plantillaFromDb`) → `app/sistema/lib/mappers.js` + tests.
- [x] **3.5** Override management (`collectAtletaNormOverrides`, `restoreAtletaNormOverrides`, `buildMesoOverridesPayload`, `collectMesoOverrides`, `restoreMesoOverrides`, `collectAtletaPctOverrides`, `restoreAtletaPctOverrides`) → `app/sistema/lib/overrides.js` + tests.
- [x] **3.6** Coach settings DB (`loadCoachSetting`, `loadCoachSettingRow`, `saveCoachSetting`, `resolveSharedCoachId`, `COACH_SETTING_KEYS`) → `app/sistema/lib/coach-settings.js`. *(`LIFTPLAN_LOCAL_SYNC_EVENT` ya extraído en 3.2.)*
- [x] **3.7** Backup & sync (`BACKUP_INTERVAL_MS`, `BACKUP_PROMPTED_KEY`, `getLastDbSync`, `collectLocalData`, `collectBackupData`, `downloadBackup`) → `app/sistema/lib/backup.js`. *(`emitLocalSyncEvent` ya extraído en 3.2.)*
- [x] **3.8** Helpers de cálculo (`calcKg`, `calcVolumenSemana`, `calcRepsPorGrupo`, `remapSemanaIdx`, `remapSemPctKeyForSwap`, `remapTurnoPctKeyForSwap`, `remapOverrideObjectKeys`, `remapOverrideSetKeys`, `getEjercicioById`, `getSembradoStats`, `calcSeriesRepsKg`, `calcKgEj`, `GRUPO_RANGES`, `GRUPOS_KEYS`, `getGrupo`, `calcSembradoSemana`, `calcRepsEjercicio`) → `app/sistema/lib/calc.js` + tests.
- [x] **3.9** Ciclo menstrual (`parseAppDate`, `getAgeFromBirthDate`, `getFasePorDia`, `getFasesVentanaCiclo`, `getFaseDominante`, `getFaseCiclo`, `getDetalleFaseCiclo`, `getFechaSemana`, `getFechaSemanaEfectiva`, `formatFechaSemana`, `formatDateDisplay`) → `app/sistema/lib/ciclo-menstrual.js` + tests.
- [x] **3.10** Navegación (`PLANILLA_NAV_SELECTOR`, `buildPlanillaFocusGrid`, `focusPlanillaField`, `handlePlanillaArrowNavigation`, `SEMBRADO_NAV_SELECTOR`, `SEMBRADO_ROLE_ORDER`, `getSembradoTabSequence`, `handleSembradoTabNavigation`) → `app/sistema/lib/navegacion.js` + tests.

### Fase 4 — Cliente Supabase + auth
- [x] **4.1+4.2** Cliente Supabase completo (config, `_session`, `_fetchWithTimeout`, `_refreshToken`, `_getValidSession`, `sb` con `auth`/`_handleEmailCallback`/`from`/`rpc`) → `app/sistema/lib/supabase-client.js` + smoke tests. *(combinados porque `_session` es estado mutable compartido)*.
- [x] **4.3** `_visResume` (visibility-resume throttle), `BroadcastChannel _bc`, `markDbSync`, `broadcastDbWrite` → `app/sistema/lib/sync.js`.

### Fase 5 — Hooks
- [x] **5.1** `useHistory` → `app/sistema/hooks/useHistory.js` + tests.
- [x] **5.2** `usePlantillas` → `app/sistema/hooks/usePlantillas.js`.

### Fase 6 — Componentes hoja
- [x] **6.1** `Modal` → `app/sistema/components/common/Modal.jsx`.
- [x] **6.2** `ExercisePickerOverlay` → `components/common/ExercisePickerOverlay.jsx`.
- [x] **6.3** `EjBuscador` → `components/common/EjBuscador.jsx`.
- [x] **6.4** `EjBuscadorCompacto` → `components/common/EjBuscadorCompacto.jsx`.
- [x] **6.5** `EjCelda` → `components/sembrado/EjCelda.jsx`.
- [x] **6.6** `CeldaSembrado` → `components/sembrado/CeldaSembrado.jsx`.
- [x] **6.7** `ComplementarioRow` → `components/planilla/ComplementarioRow.jsx`.
- [x] **6.8** `EjercicioRow` → `components/planilla/EjercicioRow.jsx`.
- [x] **6.9** `AtletaCardItem` → `components/atletas/AtletaCardItem.jsx`.
- [x] **6.10** `PlantillaCard` → `components/plantillas/PlantillaCard.jsx`. *(Movió también `PERIODO_LABEL`, `OBJETIVO_LABEL`, `NIVEL_LABEL`, `*_COLOR`, `ESCUELA_NIVEL_LABEL`, `ESCUELA_NIVEL_COLOR` a `data/plantillas-meta.js` por dependencia.)*
- [x] **6.11** Layout helpers (`SectionHeader`, `CardGrid`, `NivelSection`, `AlumnoSectionHeader`) → `components/common/LayoutHelpers.jsx`.

### Fase 7 — Componentes medianos
- [x] **7.1** `TurnoCard` → `components/planilla/TurnoCard.jsx`.
- [x] **7.2** `IntensityPickerModal` → `components/sembrado/IntensityPickerModal.jsx`.
- [x] **7.3** `SembradoMensual` → `components/sembrado/SembradoMensual.jsx`.
- [x] **7.4** `SemanaView` → `components/sembrado/SemanaView.jsx`.
- [x] **7.5** `ResumenGrupos` → `components/resumen/ResumenGrupos.jsx`.
- [x] **7.6** `DistribucionTurnos` → `components/resumen/DistribucionTurnos.jsx`.
- [x] **7.7** `AtletaForm` → `components/atletas/AtletaForm.jsx`.
- [x] **7.8** `MesocicloForm` → `components/atletas/MesocicloForm.jsx`.
- [x] **7.9** `EditMesoModal` → `components/atletas/EditMesoModal.jsx`.
- [x] **7.10** `EditVolModal` → `components/atletas/EditVolModal.jsx`.
- [x] **7.11** `GuardarPlantillaModal`, `CrearPlantillaModal`, `DuplicarPlantillaModal` → `components/plantillas/`.
- [x] **7.12** `PlantillaPicker` → `components/plantillas/PlantillaPicker.jsx`.

### Fase 8 — Páginas
- [x] **8.1** `PageNormativos` → `components/normativos/PageNormativos.jsx`.
- [x] **8.2** `PageNormativosAtleta` → `components/normativos/PageNormativosAtleta.jsx`.
- [x] **8.3** `PageCalculadora` → `components/calculadora/PageCalculadora.jsx`.
- [x] **8.4** `PagePlantillas` → `components/plantillas/PagePlantillas.jsx`.
- [x] **8.5** `PagePlantilla` → `components/plantillas/PagePlantilla.jsx`.
- [x] **8.6** `PageResumen` → `components/resumen/PageResumen.jsx`.
- [x] **8.7** `PagePDF` → `components/pdf/PagePDF.jsx`.
- [x] **8.8** `PageAtletas` → `components/atletas/PageAtletas.jsx`.

### Fase 9 — Las bestias
- [x] **9.1** `PlanillaTurno` (~4000 líneas):
  - [ ] 9.1.a Identificar y extraer sub-helpers internos.
  - [ ] 9.1.b Extraer secciones internas como sub-componentes hijos.
  - [ ] 9.1.c Extraer componente principal a `components/planilla/PlanillaTurno.jsx`.
- [x] **9.2** `PlanillaBasica` → `components/planilla/PlanillaBasica.jsx`.
- [x] **9.3** `PlanillaPretemporada` → `components/planilla/PlanillaPretemporada.jsx`.
- [x] **9.4** `PageAtleta` → `components/atletas/PageAtleta.jsx`.
- [x] **9.5** `AtletaPanel` → `components/atletas/AtletaPanel.jsx`.

### Fase 10 — Orquestadores + Contexts
- [ ] **10.1** Diseñar `CoachContext` *(diferido a Fase 2 — es diseño nuevo, no extracción).*
- [ ] **10.2** Diseñar `AtletaContext` *(diferido a Fase 2 — es diseño nuevo, no extracción).*
- [x] **10.- [ ] **10.3** `LoginScreen` → `components/coach/LoginScreen.jsx`.
- [x] **10.- [ ] **10.4** `PanelReferencia` → `components/coach/PanelReferencia.jsx`.
- [x] **10.- [ ] **10.5** `CoachApp` → `components/coach/CoachApp.jsx`.

### Fase 11 — Limpieza final
- [ ] **11.1** `coach-app.jsx` queda como entry point delgado (solo imports + `<CoachApp />`).
- [ ] **11.2** Completar `ARCHITECTURE.md`.
- [ ] **11.3** Archivar `GLOSARIO_MONOLITO.md` como `GLOSARIO_MONOLITO_LEGACY.md`.
- [ ] **11.4** E2E completos en Playwright cubriendo flujos críticos.
- [ ] **11.5** Merge `refactor/atomize-monolith` → `main`.

---

## Checklist de regresión por dominio

Cuando un paso toque alguna de estas áreas, verificar visualmente en `pnpm dev`:

- **Login/Auth:** login email+pwd, logout, recuperación de password.
- **Atletas:** lista, secciones expandibles, fase ciclo (mujeres), preview historial.
- **Mesociclo:** crear desde plantilla, editar nombre/descripción/IRM/volumen, swap semanas.
- **Planilla turno:** edición de celdas, copy/paste cross-turno y cross-semana, complementarios.
- **Planilla básica:** bloques %/S/R/Kg, clusters "2+2+2", REF picker.
- **Planilla pretemp:** sub-ejercicios con links (+/c/-), turno global navigator.
- **Sembrado:** add/remove turno, swap semanas, intensity picker, distribución de grupos.
- **Resumen:** métricas, gráficos Recharts, drill semana→turno→detalle.
- **PDF:** vista imprimible, mobile nav, todas las filas (principales/complementarios/pretemp).
- **Plantillas:** galería, crear, duplicar, editar, guardar desde meso.
- **Normativos:** global del coach y por atleta, validación, sync DB.
- **Calculadora:** edición de tabla1-5, lookup_general/tirones, test modal 🧪.
- **Cronómetro:** TabataTimer overlay, anotaciones de bloques.
- **Backup:** descarga JSON, banner de recordatorio.
- **Sync:** BroadcastChannel cross-tab, visibility resume.

---

## Próximo paso concreto — Paso 2.1

**Extraer `EJERCICIOS[]` (≈144 ejercicios, L1234–~2098 del monolito) → `app/sistema/data/ejercicios.js`.**

1. Crear `app/sistema/data/ejercicios.js` que `export const EJERCICIOS = [...]`.
2. Borrar el array literal de `coach-app.jsx`.
3. Agregar `import { EJERCICIOS } from "./data/ejercicios";` cerca de los otros imports.
4. `pnpm build` debe pasar.
5. Verificación visual:
   - Página atleta → planilla turno → buscador de ejercicios muestra los 144 con categorías y porcentajes correctos.
   - Tab Normativos del coach: lista global completa.
   - Tab Normativos del atleta: misma lista.
6. Commit: `refactor(sistema): extract EJERCICIOS array to data/ejercicios.js [Phase 2.1]`.
