# Glosario del Monolito — coach-app.jsx

> Referencia viva del archivo `app/sistema/coach-app.jsx` (~33.590 líneas).
> Se actualiza con cada investigación/modificación. Los números de línea son aproximados
> y pueden correrse tras ediciones; usar búsqueda por nombre de función/const para ubicar.

---

## 1. Estructura General del Archivo

| Rango (aprox.) | Sección | Descripción |
|---|---|---|
| 1–31 | **Imports** | React, lucide-react icons (Download, Send, FileText, ChevronLeft, etc.) |
| 33–36 | **Supabase Config** | `SUPA_URL`, `SUPA_ANON`, `SUPA_CONFIG_OK`, `SUPA_TIMEOUT_MS` |
| 38–82 | **Sanitización** | `toTitleCase`, `sanitizeStringInput`, `sanitizeInput`, `sanitizeRequestBody` |
| 83–128 | **localStorage Safe** | `_freeLocalStorageSpace`, `safeSetItem` — manejo de QuotaExceededError |
| 129–210 | **Auth Helpers** | Sesión local, perfil, listeners de auth, helpers de error |
| 211–328 | **Auth Proxy** | Lógica de autenticación usando fetch contra Supabase |
| 329–646 | **`sb` — Cliente Supabase** | Objeto con métodos `.from()`, `.auth`, `.signUp`, `.signIn`, etc. Reimplementación del SDK con fetch puro |
| 647–680 | **Sync Setup** | `getSupabase`, `COACH_SETTING_KEYS`, `BroadcastChannel`, `markDbSync`, `broadcastDbWrite` |
| 681–760 | **Backup & LocalStorage** | `getLastDbSync`, `collectBackupData`, `downloadBackup`, `emitLocalSyncEvent`, `readLocalJson`, `writeLocalJson` |
| 761–936 | **Override Management** | Collect/restore de overrides de normativos, mesociclos y porcentajes (localStorage ↔ DB) |
| 937–1079 | **Mapeos App ↔ DB** | `atletaToDb`, `atletaFromDb`, `mesoToDb`, `mesoFromDb`, `plantillaToDb`, `plantillaFromDb` |
| 1080–2098 | **EJERCICIOS[]** | Array de ~160+ ejercicios con `{id, nombre, base, pct_base, categoria}` |
| 2099–2208 | **Constantes de Datos** | `DIAS`, `MOMENTOS`, `CATEGORIAS`, `CAT_COLOR`, factory helpers (`mkId`, `mkTurnos`, `mkSemanas`, etc.) |
| 2209–2453 | **CSS Global** | Template literal `css` con estilos globales de la app (botones, badges, inputs, etc.) |
| 2454–2556 | **Helpers de Cálculo** | `calcKg`, `calcVolumenSemana`, `calcRepsPorGrupo`, `getEjercicioById`, `getSembradoStats`, helpers de swap |
| 2557–3042 | **Componentes UI Base** | `Modal`, `ExercisePickerOverlay` |
| 3043–3237 | **Ciclo Menstrual** | `FASES_CICLO`, `parseAppDate`, `getAgeFromBirthDate`, `getFasePorDia`, `getFasesVentanaCiclo`, etc. |
| 3239–3503 | **AtletaForm** | Formulario de creación/edición de atleta |
| 3504–4030 | **MesocicloForm** | Formulario de creación/edición de mesociclo |
| 4031–4303 | **EjBuscador** | Buscador de ejercicios con input de texto y lista filtrada |
| 4304–4486 | **ComplementarioRow** | Fila de ejercicio complementario (accesorios) en el sembrado |
| 4408–4486 | **EjercicioRow** | Fila de ejercicio principal en el sembrado |
| 4487–5012 | **TurnoCard** | Card de un turno de entrenamiento (vista de edición del sembrado) |
| 5013–5037 | **Sección separadora** | Comentarios de distribución/planilla |
| 5038–5096 | **`calcSeriesRepsKg`** ⭐ | **Función clave** — calcula series, reps/serie y kg para cada intensidad |
| 5097–5112 | **`calcKgEj`** | Kg de un ejercicio a una intensidad (para mostrar en sembrado) |
| 5113–5331 | **Navegación Planilla** | Focus grid, arrow navigation, Tab navigation para la planilla |
| 5332–9277 | **PlanillaTurno** | **Componente gigante** — vista de edición de la planilla de un turno |
| 9278–10600 | **PlanillaBasica** | Planilla para escuela básica (sin intensidades, con bloques simples) |
| 10601–12223 | **PlanillaPretemporada** | Planilla para mesociclos de pretemporada |
| 12224–13194 | **ResumenGrupos** | Resumen visual de reps por grupo muscular por semana |
| 13195–14261 | **DistribucionTurnos** | Distribución de volumen entre turnos de entrenamiento |
| 14262–14354 | **Helpers de Cálculo Compartidos** | `GRUPO_RANGES`, `GRUPOS_KEYS`, `getGrupo`, `calcSembradoSemana`, `calcRepsEjercicio` |
| 14355–14810 | **Tablas de Calculadora** | `INTENSIDADES`, `IRM_VALUES`, `INTENS_COLS`, **`TABLA_DEFAULT`** (lookup tables con ~450 filas) |
| 14811–15250 | **EjBuscadorCompacto + mkEj** | Buscador inline para celdas del sembrado |
| 15251–15426 | **IntensityPickerModal** | Modal para elegir intensidad de un ejercicio |
| 15427–15628 | **EjCelda** | Celda individual de ejercicio en el sembrado mensual |
| 15629–15825 | **CeldaSembrado** | Celda del sembrado con drag & drop |
| 15826–16370 | **SembradoMensual** | **Componente grande** — grilla mensual de sembrado de ejercicios |
| 16371–16610 | **SemanaView** | Vista de una semana completa con turnos |
| 16611–16864 | **AtletaCardItem + AlumnoSectionHeader** | Cards de atletas en la lista |
| 16865–17502 | **PageAtletas** | Página principal — lista de todos los atletas del coach |
| 17503–17602 | **EditMesoModal** | Modal para editar nombre/config de un mesociclo |
| 17603–17954 | **EditVolModal** | Modal para editar volumen total y distribución semanal |
| 17955–20906 | **PageAtleta** ⭐ | **Página del atleta** — vista coach con tabs (sembrado, planilla, resumen, PDF) |
| 20907–22262 | **PageResumen** | Página de resumen del mesociclo — métricas, gráficos, tabla de totales |
| 22263–24697 | **PagePDF** ⭐ | **Vista de plan imprimible** — renderiza la planilla completa formateada para PDF/pantalla |
| 24698–24750 | **Constantes de Plantillas** | `PERIODOS`, `OBJETIVOS`, `NIVELES`, labels y colores |
| 24751–25083 | **Logos SVG** | `LogoHorizontal`, `LogoIL`, `LogoILSolo` — logos inline como componentes SVG |
| 25084–25143 | **useHistory** | Hook de undo/redo con persistencia en localStorage |
| 25144–25345 | **usePlantillas** | Hook para CRUD de plantillas con sync a Supabase |
| 25346–25643 | **GuardarPlantillaModal** | Modal para guardar plantilla desde mesociclo/semana/distribución |
| 25644–25967 | **PlantillaCard** | Card de una plantilla en la galería |
| 25968–26875 | **PagePlantilla** | Página de edición de una plantilla (como mini PageAtleta) |
| 26876–27197 | **CrearPlantillaModal** | Modal para crear plantilla desde cero |
| 27198–27404 | **DuplicarPlantillaModal** | Modal para duplicar plantilla existente |
| 27405–27596 | **SectionHeader + CardGrid + NivelSection** | Componentes de layout para galería de plantillas |
| 27597–28196 | **PagePlantillas** | Página principal de galería de plantillas |
| 28197–28528 | **PageNormativosAtleta** | Página de normativos específicos por atleta |
| 28529–28766 | **PlantillaPicker** | Selector de plantilla para aplicar a mesociclo |
| 28767–29455 | **PageNormativos** | Página global de normativos del coach |
| 29456–30600 | **PageCalculadora** | Calculadora de series/reps con tablas editables |
| 30601–31882 | **PanelReferencia** | Panel lateral de referencia rápida (atleta/plantilla side-by-side) |
| 31883–32291 | **LoginScreen** | Pantalla de login con email/password |
| 32292–33647 | **CoachApp** ⭐ | **Componente principal coach** — state management, routing, sync DB, tabs |
| 33648–33590 | **AtletaPanel** ⭐ | **Vista del atleta** — carga datos desde Supabase, muestra mesos y PagePDF |

---

## 2. Funciones Clave (Detalle)

### `calcSeriesRepsKg(tablas, ej, ejData, irm_arr, irm_env, modo, reps_asignadas)` — L5038
**Propósito**: Calcula para CADA intensidad (50,60,70,75,80,85,90,95) los valores de series, reps/serie y kg.

**Pipeline**:
1. Determina `isTiron` (si categoría = "Tirones")
2. Calcula `kgBase = IRM_atleta × pct_base / 100`
3. Busca la fila de tabla (T1/T2/T3) que corresponde a `ej.intensidad`
4. Para cada intensidad:
   - `kg = kgBase × intens% / 100` (redondeado a 0.5kg)
   - `repsInter = tablaRow[intens] × reps_asignadas / 100`
   - Si `repsInter === 0` → `{series: null, reps_serie: null, kg}`
   - Si `repsInter > 8` → `{series: 1, reps_serie: repsInter, kg}`
   - Si no → lookup en `lookup_tirones` o `lookup_general` por `(intens, modo, repsInter)`

**Retorna**: Array de 8 objetos `{intens, series, reps_serie, kg}`, uno por cada columna de intensidad.

**⚠️ Si retorna null o series=null para una intensidad, `buildEjercicioRow` la filtra y no se muestra.**

### `getRepsVal(ej, semIdx, tIdx)` — Dentro de PagePDF, L22364
**Propósito**: Determina las reps asignadas a un ejercicio en una semana/turno específico.

**Pipeline de fallback**:
1. Si hay override manual (manualEditSaved) → usa repsEditSaved
2. Si `ej.reps_asignadas > 0` → usa ese valor directo
3. Si no → cálculo automático ("tentativa"):
   - `calcSembradoSemana(sem)` → distribución de ejercicios por grupo
   - Calcula `repsBloque` según volumen total × pct_volumen × pct por grupo × pct por turno
   - Divide entre cantidad de ejercicios del mismo grupo en ese turno

**⚠️ CRÍTICO: El paso 1 depende de datos en localStorage (repsEdit/manualEdit). Si esos datos no están (ej: en el teléfono del atleta), salta al paso 2 o 3.**

### `buildEjercicioRow(ej, semIdx, tIdx, isComplementario)` — L22753
**Propósito**: Construye una fila de ejercicio para la tabla PDF.

**Pipeline**:
1. Busca `ejData` en normativos por `ej.ejercicio_id`
2. Llama `getRepsVal` para obtener reps
3. Llama `calcSeriesRepsKg` para obtener los cálculos
4. Mapea INTENSIDADES a columnas `{intens, s, r, kg, note}` (aplicando cellEdit overrides)
5. **`.filter((c) => c.s || c.r)`** — elimina columnas donde series Y reps son null/0
6. Retorna `{id, nombre, categoria, cols, isComplementario}`

### `getGrupo(ejercicio_id)` — L14273
**Propósito**: Mapea un ejercicio_id a su grupo muscular (Arranque/Envion/Tirones/Piernas).
- Primero busca en normativos por `categoria`
- Fallback: `GRUPO_RANGES` por rangos de ID legacy

### `calcSembradoSemana(sem)` — L14289
**Propósito**: Cuenta ejercicios por grupo por turno en una semana.
- Retorna `{porGrupo: {Arranque: {total, porTurno: [...]}, ...}, totalSem}`

---

## 3. Constantes Importantes

### `TABLA_DEFAULT` — L14360
Tablas de calculadora por defecto. Contiene:
- `tabla1`, `tabla2`, `tabla3`: Arrays de {irm, "50":val, "60":val, ...} — % de distribución por intensidad
- `lookup_tirones`: Array de {intens, modo, reps, series, reps_serie} — lookup para categoría Tirones
- `lookup_general`: Igual pero para las demás categorías

### `INTENSIDADES` — L14355
`[50, 60, 70, 75, 80, 85, 90, 95]` — las 8 columnas de intensidad (% del IRM)

### `EJERCICIOS[]` — L1081
Array de ~160 ejercicios de halterofilia con `{id, nombre, base:"arranque"|"envion", pct_base, categoria}`

### `GRUPO_RANGES` — L14265
Rangos legacy de ID para clasificar ejercicios: `{Arranque:[1,19], Envion:[20,48], Tirones:[49,68], Piernas:[69,78]}`

### `COACH_SETTING_KEYS` — L651
Keys usadas en la tabla `coach_settings`: `{NORMATIVOS: "normativos_globales", TABLAS: "tablas_calculadora"}`

---

## 4. Flujo de Datos — Vista del Atleta

```
AtletaPanel (L33648)
  ├─ Carga atleta desde DB (atletas table, por profile_id)
  ├─ Carga mesociclos desde DB (mesociclos table, por app_atleta_id)
  ├─ Restaura overrides en localStorage (restoreMesoOverrides) ← FIX v1.0.1
  ├─ Carga coach_settings (normativos + tablas) desde DB
  └─ Renderiza PagePDF con:
       ├─ meso (del DB)
       ├─ tablas = coachTablas || TABLA_DEFAULT
       ├─ normativos = coachNormativos || EJERCICIOS
       └─ hideActions = true
              │
              PagePDF (L22263)
              ├─ Lee overrides de localStorage (repsEdit, manualEdit, cellEdit, ...)
              ├─ getRepsVal() → determina reps por ejercicio
              ├─ calcSeriesRepsKg() → calcula series/reps/kg
              ├─ buildEjercicioRow() → arma fila (filtra cols vacías)
              └─ Renderiza tabla con CSS responsive (mobile = cards dark)
```

---

## 5. Sistema de Overrides

Los overrides son ediciones manuales que el coach hace sobre los valores calculados automáticamente.
Se guardan en **10 keys de localStorage** por mesociclo:

| Key | Contenido |
|---|---|
| `liftplan_pt_${mesoId}_repsEdit` | `{semIdx-tIdx-ejId: reps}` — reps manuales |
| `liftplan_pt_${mesoId}_manualEdit` | `[semIdx-tIdx-ejId, ...]` — flags de cuáles fueron editadas |
| `liftplan_pt_${mesoId}_cellEdit` | `{semIdx-tIdx-ejId-intens-field: valor}` — ediciones de celdas individuales |
| `liftplan_pt_${mesoId}_cellManual` | `[key, ...]` — flags de celdas editadas |
| `liftplan_pt_${mesoId}_nameEdit` | `{semIdx-tIdx-ejId: nombre}` — nombres personalizados |
| `liftplan_pt_${mesoId}_noteEdit` | `{semIdx-tIdx-ejId-intens-note: texto}` — notas por celda |
| `liftplan_pct_${mesoId}_semOvr` | `{grupoKey-semIdx: pct}` — override % semanal |
| `liftplan_pct_${mesoId}_semMan` | `[key, ...]` — flags de % semanales editados |
| `liftplan_pct_${mesoId}_turnoOvr` | `{grupoKey-semIdx-tIdx: pct}` — override % turno |
| `liftplan_pct_${mesoId}_turnoMan` | `[key, ...]` — flags de % turnos editados |

**Sincronización**: Se empaquetan en `overrides` vía `buildMesoOverridesPayload()` y se guardan en la columna `overrides` (JSONB) de la tabla `mesociclos` en DB.

**Restauración**: `restoreMesoOverrides(mesoId, overrides)` escribe las keys de vuelta en localStorage.

---

## 6. Bugs Conocidos

### ✅ RESUELTO — Atleta no ve reps/kg (v1.0.1)
- **Síntoma**: En algunos teléfonos, los ejercicios solo muestran el nombre pero no series/reps/kg
- **Causa raíz**: `AtletaPanel` no llamaba `restoreMesoOverrides()` al cargar los mesociclos. En el teléfono del atleta, las overrides de reps (ediciones manuales del coach) no existían en localStorage → `getRepsVal` caía al cálculo de tentativa → si `reps_asignadas=0` y la tentativa daba 0 → `calcSeriesRepsKg` retornaba `series:null` → `buildEjercicioRow.filter()` eliminaba la columna → CSS ocultaba las celdas vacías
- **Fix**: Agregar `restoreMesoOverrides()` en el `useEffect` de carga de `AtletaPanel`

### ⚠️ PanelReferencia usa TABLA_DEFAULT hardcoded (L30897)
- **Síntoma**: Si el coach tiene tablas personalizadas en `coach_settings`, el panel de referencia lateral muestra cálculos con tablas por defecto, no las del coach
- **Impacto**: Solo visual en la vista coach, no afecta al atleta
- **Pendiente**: Cambiar `const tablas = TABLA_DEFAULT` por leer de localStorage o props
