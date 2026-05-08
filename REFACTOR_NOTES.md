# Refactor Notes — Mejoras pendientes para fase 2

> Lista viva de cosas detectadas durante la atomización pero **NO aplicadas** (la fase 1 es solo extracción). Cada nota incluye prioridad y referencia.
>
> Prioridades: 🔴 alta · 🟡 media · 🟢 baja

---

## Cleanup post-extracción (corregido antes del merge)

Durante la pasada de análisis previa al merge se detectaron y corrigieron:

### Bugs críticos (ReferenceError en runtime)
- 16+ archivos con imports faltantes — referencias a símbolos no importados que tirarían `ReferenceError` al ejercitar las paths correspondientes (se confirmó que el build de Next.js NO los detectaba):
  - `mkEj`, `PREVIEW_REPS` se habían perdido durante la extracción y se restauraron en `data/constantes.js` y `data/tablas-default.js`.
  - `IRM_VALUES`, `calcVolumenSemana`, `calcRepsPorGrupo` faltantes en MesocicloForm/SemanaView.
  - `LIFTPLAN_LOCAL_SYNC_EVENT`, `remap*` (4 funciones) faltantes en PageAtleta/PagePlantilla.
  - `LogoIL`, `SUPA_CONFIG_OK` faltantes en PageAtletas.
  - `emitLocalSyncEvent`, `safeSetItem` faltantes en PageCalculadora.
  - `APP_VERSION`, `SUPA_CONFIG_OK`, `TABLA_DEFAULT` faltantes en AtletaPanel.
  - `_bc` faltante en CoachApp.
  - `SUPA_URL`, `SUPA_ANON`, `_fetchWithTimeout`, `_readResponseSafe`, `APP_VERSION` faltantes en LoginScreen.
  - `PageResumen`, `PagePDF` faltantes en PanelReferencia.
  - `CAT_COLOR` faltante en ExercisePickerOverlay.
  - `ESCUELA_NIVEL_LABEL/COLOR` faltantes en LayoutHelpers.
  - `formatDateDisplay`, `formatFechaSemana`, `getFechaSemanaEfectiva` faltantes en PagePDF.
  - `ExercisePickerOverlay` faltante en PlanillaTurno y PlanillaBasica.
  - `getSembradoStats` faltante en TurnoCard.
  - `IRM_VALUES`, `IntensityPickerModal` faltantes en EjCelda.
  - `focusPlanillaField` faltante en CeldaSembrado.
  - `mkEj`, `DEFAULT_EJS` faltantes en SembradoMensual.

### Código duplicado (dead code)
- `AtletaPanel.jsx` tenía un `export default function App()` de ~280 líneas que duplicaba a `coach-app.jsx`. Eliminado.

### CSS inline duplicado
- Había 8 bloques `<style>{:root{--bg:#0a0c10;...}}</style>` inyectados en cada estado de loading/login/atleta de coach-app.jsx y AtletaPanel.jsx, con un typo `--surface3:#22273c` (vs el canónico `#222836` en `coach-app.css`).
- Todos eliminados — el CSS global ya define las mismas variables y clases (.form-group, .form-input, .btn, .btn-gold, .btn-ghost). Beneficio: -8 reevaluaciones de string en cada render + valores consistentes de tokens.

### APP_VERSION centralizado
- Movido a `data/app-version.js` para que LoginScreen y AtletaPanel lo importen sin duplicar el literal.

### Imports no usados eliminados
- `TabataTimer` en CoachApp.jsx (importado pero nunca renderizado).
- 5 helpers de auth (loadSession/clearSession/save/load/clearProfileLocal) y `useCallback` en AtletaPanel.jsx (los usaba el `App()` duplicado que se eliminó).

### Errores TypeScript en tests
- 9 errores en `calc.test.ts` y `storage.test.ts` por casts implícitos a `{}`. Corregidos con anotaciones `: any` localizadas.

## Seguridad

_(pendiente — se completará al revisar cada módulo)_

## Performance / Rendimiento

_(pendiente)_

## Tipos / TS migration

_(pendiente)_

## Deuda técnica / Code smells

_(pendiente)_

## Testing / Cobertura

- 🟡 No hay tests automatizados pre-existentes. Toda la cobertura se construye desde cero durante el refactor.

## UX / UI

- 🟡 **PagePlantillas** — los filtros laterales por Período / Objetivo / Nivel no existen en la galería de plantillas. Hoy `PERIODOS`, `OBJETIVOS` y `NIVELES` se usan solo dentro de los modales de crear/guardar/editar (`coach-app.jsx` ~24725, ~26283). Falta el sidebar de filtros para la lista.
  - Origen: detectado en verificación visual del Paso 2.4.
  - Propuesta: agregar panel de filtros en `PagePlantillas` cuando se extraiga (paso 8.4).
  - Bloqueante para fase 1: no.

---

## Plantilla para nuevas notas

```
- [PRIO] **[área]** — descripción breve.
  - Origen: `archivo:línea` o paso del plan donde se detectó.
  - Propuesta: cómo se podría resolver.
  - Bloqueante para fase 1: sí/no.
```
