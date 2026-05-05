# Refactor Plan — Atomización del monolito `coach-app.jsx`

> **Objetivo:** dividir `app/sistema/coach-app.jsx` (~36.645 líneas) en módulos atómicos sin alterar funcionalidad. Migración a TS, optimización y mejoras de seguridad se posponen a una fase 2.
>
> **Rama:** `refactor/atomize-monolith` (base: `main`).
> **Regla de oro:** un commit/PR por paso. Nada que combine extracción + cambio de lógica.

---

## Protocolo por paso

1. Crear archivo destino con el código copiado **verbatim**.
2. Reemplazar la sección en `coach-app.jsx` por `import`.
3. Tests automáticos del módulo extraído (helpers puros y hooks: tests reales; componentes: smoke test).
4. `pnpm build` debe pasar sin errores.
5. **Verificación manual** del usuario en `pnpm dev` sobre las áreas afectadas (checklist por paso).
6. Anotar en `REFACTOR_NOTES.md` cualquier mejora detectada pero no aplicada.
7. Commit + push + PR contra `refactor/atomize-monolith`.
8. Marcar el paso como ✅ en este archivo.

Si algo falla en cualquier punto: revertir solo ese paso (`git reset --hard`) y replanificar.

---

## Estructura destino

```
app/sistema/
  coach-app.jsx           # Orquestador final (~500 líneas)
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
    globals.css           # CSS extraído del template literal
  contexts/               # CoachContext, AtletaContext (fase 10)
```

---

## Fases

### Fase 0 — Setup ✅
- [x] Branch `refactor/atomize-monolith` creada desde `main`.
- [x] Vitest + RTL + jsdom instalados y configurados (`vitest.config.ts`, `tests/setup.ts`).
- [x] Playwright instalado y configurado (`playwright.config.ts`, `tests/e2e/`).
- [x] Scripts `test`, `test:watch`, `test:e2e` agregados a `package.json`.
- [x] Smoke test de Vitest pasa.
- [x] `REFACTOR_PLAN.md`, `REFACTOR_NOTES.md`, `ARCHITECTURE.md` creados.
- [ ] `pnpm build` verificado sin regresiones.
- [ ] Commit inicial Fase 0.

### Fase 1 — CSS global
- [ ] **1.1** Extraer template literal `css` (L2220–2900) a `app/sistema/styles/globals.css`.
- [ ] **1.2** Importar `globals.css` desde `coach-app.jsx`.

### Fase 2 — Constantes y datos puros
- [ ] **2.1** `EJERCICIOS[]` (L1148–2098) → `app/sistema/data/ejercicios.js`.
- [ ] **2.2** `DIAS`, `MOMENTOS`, `CATEGORIAS`, `CAT_COLOR`, factories (L2099–2220) → `app/sistema/data/constantes.js`.
- [ ] **2.3** `INTENSIDADES`, `IRM_VALUES`, `INTENS_COLS`, `TABLA_DEFAULT` (L14454–15050) → `app/sistema/data/tablas-default.js`.
- [ ] **2.4** `FASES_CICLO`, `PERIODOS`, `OBJETIVOS`, `NIVELES`, `ESCUELA_NIVELES` → `app/sistema/data/plantillas.js` y `app/sistema/data/ciclo.js`.
- [ ] **2.5** Logos SVG (L24753–24900) → `app/sistema/components/common/Logos.jsx`.

### Fase 3 — Helpers puros sin React
- [ ] **3.1** Sanitización (L38–82) → `app/sistema/lib/sanitize.js` + tests.
- [ ] **3.2** localStorage safe (L83–131) → `app/sistema/lib/storage.js` + tests.
- [ ] **3.3** Auth helpers session/profile (L133–230) → `app/sistema/lib/auth-storage.js` + tests.
- [ ] **3.4** Mapeos APP↔DB (L1025–1148) → `app/sistema/lib/mappers.js` + tests.
- [ ] **3.5** Override management (L810–1025) → `app/sistema/lib/overrides.js` + tests.
- [ ] **3.6** Coach settings DB (L870–925) → `app/sistema/lib/coach-settings.js`.
- [ ] **3.7** Backup & sync (L660–810) → `app/sistema/lib/backup.js`.
- [ ] **3.8** Helpers de cálculo (L2900–3020, L5122–5175, L14353–14460) → `app/sistema/lib/calc.js` + tests.
- [ ] **3.9** Ciclo menstrual (L3200–3345) → `app/sistema/lib/ciclo-menstrual.js` + tests.
- [ ] **3.10** Navegación planilla/sembrado (L5176–5380) → `app/sistema/lib/navegacion.js` + tests.

### Fase 4 — Cliente Supabase + auth
- [ ] **4.1** `_fetchWithTimeout` + refresh + `_getValidSession` (L211–328) → `app/sistema/lib/supabase-fetch.js`.
- [ ] **4.2** Cliente `sb` completo (L329–680) → `app/sistema/lib/supabase-client.js` + tests con mocks.
- [ ] **4.3** `_visResume` y `BroadcastChannel` (L660–710) → `app/sistema/lib/sync.js`.

### Fase 5 — Hooks
- [ ] **5.1** `useHistory` (L25043–25142) → `app/sistema/hooks/useHistory.js` + tests.
- [ ] **5.2** `usePlantillas` (L25150–25400) → `app/sistema/hooks/usePlantillas.js`.

### Fase 6 — Componentes hoja
- [ ] **6.1** `Modal` (L3022) → `app/sistema/components/common/Modal.jsx` + smoke test.
- [ ] **6.2** `ExercisePickerOverlay` (L3086) → `components/common/ExercisePickerOverlay.jsx`.
- [ ] **6.3** `EjBuscador` (L3995–4349) → `components/common/EjBuscador.jsx`.
- [ ] **6.4** `EjBuscadorCompacto` (L15056–15360) → `components/common/EjBuscadorCompacto.jsx`.
- [ ] **6.5** `EjCelda` (L15548–15695) → `components/sembrado/EjCelda.jsx`.
- [ ] **6.6** `CeldaSembrado` (L15698–15838) → `components/sembrado/CeldaSembrado.jsx`.
- [ ] **6.7** `ComplementarioRow` (L4350–4417) → `components/planilla/ComplementarioRow.jsx`.
- [ ] **6.8** `EjercicioRow` (L4418–4535) → `components/planilla/EjercicioRow.jsx`.
- [ ] **6.9** `AtletaCardItem` (L16609–16686) → `components/atletas/AtletaCardItem.jsx`.
- [ ] **6.10** `PlantillaCard` (L25650–26000) → `components/plantillas/PlantillaCard.jsx`.
- [ ] **6.11** Headers/Layout helpers (`SectionHeader`, `CardGrid`, `NivelSection`, `AlumnoSectionHeader`) → `components/common/`.

### Fase 7 — Componentes medianos
- [ ] **7.1** `TurnoCard` (L4536–5120) → `components/planilla/TurnoCard.jsx`.
- [ ] **7.2** `IntensityPickerModal` (L15364–15545) → `components/sembrado/IntensityPickerModal.jsx`.
- [ ] **7.3** `SembradoMensual` (L15839–16470) → `components/sembrado/SembradoMensual.jsx`.
- [ ] **7.4** `SemanaView` (L16471–16608) → `components/sembrado/SemanaView.jsx`.
- [ ] **7.5** `ResumenGrupos` (L12264–13285) → `components/resumen/ResumenGrupos.jsx`.
- [ ] **7.6** `DistribucionTurnos` (L13287–14350) → `components/resumen/DistribucionTurnos.jsx`.
- [ ] **7.7** `AtletaForm` (L3346–3455) → `components/atletas/AtletaForm.jsx`.
- [ ] **7.8** `MesocicloForm` (L3456–3994) → `components/atletas/MesocicloForm.jsx`.
- [ ] **7.9** `EditMesoModal` (L17402–17565) → `components/atletas/EditMesoModal.jsx`.
- [ ] **7.10** `EditVolModal` (L17568–17836) → `components/atletas/EditVolModal.jsx`.
- [ ] **7.11** Plantillas modales (`Guardar`, `Crear`, `Duplicar`) → `components/plantillas/`.
- [ ] **7.12** `PlantillaPicker` (L28396–28800) → `components/plantillas/PlantillaPicker.jsx`.

### Fase 8 — Páginas
- [ ] **8.1** `PageNormativos` (L28894–29500) → `components/normativos/PageNormativos.jsx`.
- [ ] **8.2** `PageNormativosAtleta` (L28305–28395) → `components/normativos/PageNormativosAtleta.jsx`.
- [ ] **8.3** `PageCalculadora` (L30014–30650) → `components/calculadora/PageCalculadora.jsx`.
- [ ] **8.4** `PagePlantillas` (L27597–28200) → `components/plantillas/PagePlantillas.jsx`.
- [ ] **8.5** `PagePlantilla` (L26000–26880) → `components/plantillas/PagePlantilla.jsx`.
- [ ] **8.6** `PageResumen` (L20978–22300) → `components/resumen/PageResumen.jsx`.
- [ ] **8.7** `PagePDF` (L22370–24700) → `components/pdf/PagePDF.jsx`.
- [ ] **8.8** `PageAtletas` (L16933–17400) → `components/atletas/PageAtletas.jsx`.

### Fase 9 — Las bestias
- [ ] **9.1** `PlanillaTurno` (L5385–9300) — sub-pasos a definir antes de extraer:
  - [ ] 9.1.a Identificar y extraer sub-helpers internos.
  - [ ] 9.1.b Extraer secciones internas como sub-componentes.
  - [ ] 9.1.c Extraer componente principal a `components/planilla/PlanillaTurno.jsx`.
- [ ] **9.2** `PlanillaBasica` (L9305–10600) → `components/planilla/PlanillaBasica.jsx`.
- [ ] **9.3** `PlanillaPretemporada` (L10611–12250) → `components/planilla/PlanillaPretemporada.jsx`.
- [ ] **9.4** `PageAtleta` (L17837–20950) → `components/atletas/PageAtleta.jsx`.
- [ ] **9.5** `AtletaPanel` (L33900–35383) → `components/atletas/AtletaPanel.jsx`.

### Fase 10 — Orquestadores + Contexts
- [ ] **10.1** Diseñar `CoachContext` (atletas, mesos, plantillas, normativos, save handlers).
- [ ] **10.2** Diseñar `AtletaContext` (datos del atleta activo + handlers).
- [ ] **10.3** `LoginScreen` (L31983–32475) → `components/coach/LoginScreen.jsx`.
- [ ] **10.4** `PanelReferencia` (L31235–31900) → `components/coach/PanelReferencia.jsx`.
- [ ] **10.5** `CoachApp` (L32476–33700) → `components/coach/CoachApp.jsx`.

### Fase 11 — Limpieza final
- [ ] **11.1** `coach-app.jsx` queda como entry point delgado (solo imports + `<CoachApp />`).
- [ ] **11.2** Completar `ARCHITECTURE.md`.
- [ ] **11.3** Archivar `GLOSARIO_MONOLITO.md` como `GLOSARIO_MONOLITO_LEGACY.md`.
- [ ] **11.4** E2E completos en Playwright cubriendo flujos críticos.
- [ ] **11.5** Merge `refactor/atomize-monolith` → `main`.

---

## Checklist de regresión manual (por área afectada)

Cuando un paso toque alguna de estas áreas, verificar visualmente en `pnpm dev`:

- **Login/Auth:** login email+pwd, registro, recuperación de password, logout.
- **Atletas:** lista, crear/editar/borrar, fase ciclo (mujeres), preview historial.
- **Mesociclo:** crear desde plantilla, editar nombre/descripción/IRM/volumen, swap semanas.
- **Planilla turno:** editar celdas, copy/paste cross-turno y cross-semana, complementarios.
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
