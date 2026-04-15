# Glosario — coach-app.jsx (~33.590 líneas)

> Se actualiza con cada modificación. Líneas aproximadas; buscar por nombre.

## 1. Mapa del Archivo

| Rango (aprox.) | Sección                                     | Descripción                                                                                                                                                                                                                                                         |
| -------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–31           | **Imports**                                 | React, lucide-react icons (Download, Send, FileText, ChevronLeft, etc.)                                                                                                                                                                                             |
| 33             | **APP_VERSION**                             | Constante `"1.0.9"` — se muestra en pantallas de carga y footer del login                                                                                                                                                                                           |
| 35–38          | **Supabase Config**                         | `SUPA_URL`, `SUPA_ANON`, `SUPA_CONFIG_OK`, `SUPA_TIMEOUT_MS`                                                                                                                                                                                                        |
| 38–82          | **Sanitización**                            | `toTitleCase`, `sanitizeStringInput`, `sanitizeInput`, `sanitizeRequestBody`                                                                                                                                                                                        |
| 83–128         | **localStorage Safe**                       | `_freeLocalStorageSpace`, `safeSetItem` — manejo de QuotaExceededError                                                                                                                                                                                              |
| 129–210        | **Auth Helpers**                            | Sesión local, perfil, listeners de auth, helpers de error                                                                                                                                                                                                           |
| 211–328        | **Auth Proxy**                              | Lógica de autenticación usando fetch contra Supabase                                                                                                                                                                                                                |
| 329–646        | **`sb` — Cliente Supabase**                 | Objeto con métodos `.from()`, `.auth`, `.signUp`, `.signIn`, etc. Reimplementación del SDK con fetch puro                                                                                                                                                           |
| 647–680        | **Sync Setup**                              | `getSupabase`, `COACH_SETTING_KEYS`, `BroadcastChannel`, `markDbSync`, `broadcastDbWrite`                                                                                                                                                                           |
| 681–760        | **Backup & LocalStorage**                   | `getLastDbSync`, `collectBackupData`, `downloadBackup`, `emitLocalSyncEvent`, `readLocalJson`, `writeLocalJson`                                                                                                                                                     |
| 761–936        | **Override Management**                     | Collect/restore de overrides de normativos, mesociclos y porcentajes (localStorage ↔ DB)                                                                                                                                                                            |
| 937–1079       | **Mapeos App ↔ DB**                         | `atletaToDb`, `atletaFromDb`, `mesoToDb`, `mesoFromDb`, `plantillaToDb`, `plantillaFromDb`                                                                                                                                                                          |
| 1080–2098      | **EJERCICIOS[]**                            | Array de ~160+ ejercicios con `{id, nombre, base, pct_base, categoria}`                                                                                                                                                                                             |
| 2099–2208      | **Constantes de Datos**                     | `DIAS`, `MOMENTOS`, `CATEGORIAS`, `CAT_COLOR`, factory helpers (`mkId`, `mkTurnos`, `mkSemanas`, etc.)                                                                                                                                                              |
| 2209–2453      | **CSS Global**                              | Template literal `css` con estilos globales de la app (botones, badges, inputs, etc.)                                                                                                                                                                               |
| 2454–2556      | **Helpers de Cálculo**                      | `calcKg`, `calcVolumenSemana`, `calcRepsPorGrupo`, `getEjercicioById`, `getSembradoStats`, helpers de swap                                                                                                                                                          |
| 2557–3042      | **Componentes UI Base**                     | `Modal`, `ExercisePickerOverlay`                                                                                                                                                                                                                                    |
| 3043–3237      | **Ciclo Menstrual**                         | `FASES_CICLO`, `parseAppDate`, `getAgeFromBirthDate`, `getFasePorDia`, `getFasesVentanaCiclo`, etc.                                                                                                                                                                 |
| 3239–3503      | **AtletaForm**                              | Formulario de creación/edición de atleta                                                                                                                                                                                                                            |
| 3504–4030      | **MesocicloForm**                           | Formulario de creación/edición de mesociclo                                                                                                                                                                                                                         |
| 4031–4303      | **EjBuscador**                              | Buscador de ejercicios con input de texto y lista filtrada                                                                                                                                                                                                          |
| 4304–4486      | **ComplementarioRow**                       | Fila de ejercicio complementario (accesorios) en el sembrado                                                                                                                                                                                                        |
| 4408–4486      | **EjercicioRow**                            | Fila de ejercicio principal en el sembrado                                                                                                                                                                                                                          |
| 4487–5012      | **TurnoCard**                               | Card de un turno de entrenamiento (vista de edición del sembrado)                                                                                                                                                                                                   |
| 5013–5037      | **Sección separadora**                      | Comentarios de distribución/planilla                                                                                                                                                                                                                                |
| 5038–5096      | **`calcSeriesRepsKg`** ⭐                   | **Función clave** — calcula series, reps/serie y kg para cada intensidad                                                                                                                                                                                            |
| 5097–5112      | **`calcKgEj`**                              | Kg de un ejercicio a una intensidad (para mostrar en sembrado)                                                                                                                                                                                                      |
| 5113–5331      | **Navegación Planilla**                     | Focus grid, arrow navigation, Tab navigation para la planilla                                                                                                                                                                                                       |
| 5332–9277      | **PlanillaTurno**                           | **Componente gigante** — vista de edición de la planilla de un turno                                                                                                                                                                                                |
| 9278–10600     | **PlanillaBasica**                          | Planilla para escuela básica (sin intensidades, con bloques simples)                                                                                                                                                                                                |
| 10601–12223    | **PlanillaPretemporada**                    | Planilla para mesociclos de pretemporada                                                                                                                                                                                                                            |
| 12224–13194    | **ResumenGrupos**                           | Resumen visual de reps por grupo muscular por semana                                                                                                                                                                                                                |
| 13195–14261    | **DistribucionTurnos**                      | Distribución de volumen entre turnos de entrenamiento                                                                                                                                                                                                               |
| 14262–14354    | **Helpers de Cálculo Compartidos**          | `GRUPO_RANGES`, `GRUPOS_KEYS`, `getGrupo`, `calcSembradoSemana`, `calcRepsEjercicio`                                                                                                                                                                                |
| 14355–14810    | **Tablas de Calculadora**                   | `INTENSIDADES`, `IRM_VALUES`, `INTENS_COLS`, **`TABLA_DEFAULT`** (lookup tables con ~450 filas)                                                                                                                                                                     |
| 14811–15250    | **EjBuscadorCompacto + mkEj**               | Buscador inline para celdas del sembrado                                                                                                                                                                                                                            |
| 15251–15426    | **IntensityPickerModal**                    | Modal para elegir intensidad de un ejercicio                                                                                                                                                                                                                        |
| 15427–15628    | **EjCelda**                                 | Celda individual de ejercicio en el sembrado mensual                                                                                                                                                                                                                |
| 15629–15825    | **CeldaSembrado**                           | Celda del sembrado con drag & drop                                                                                                                                                                                                                                  |
| 15826–16370    | **SembradoMensual**                         | **Componente grande** — grilla mensual de sembrado de ejercicios                                                                                                                                                                                                    |
| 16371–16610    | **SemanaView**                              | Vista de una semana completa con turnos                                                                                                                                                                                                                             |
| 16611–16864    | **AtletaCardItem + AlumnoSectionHeader**    | Cards de atletas en la lista                                                                                                                                                                                                                                        |
| 16865–17502    | **PageAtletas**                             | Página principal — lista de todos los atletas del coach                                                                                                                                                                                                             |
| 17503–17602    | **EditMesoModal**                           | Modal para editar nombre/config de un mesociclo                                                                                                                                                                                                                     |
| 17603–17954    | **EditVolModal**                            | Modal para editar volumen total y distribución semanal                                                                                                                                                                                                              |
| 17955–20906    | **PageAtleta** ⭐                           | **Página del atleta** — vista coach con tabs (sembrado, planilla, resumen, PDF)                                                                                                                                                                                     |
| 20907–22262    | **PageResumen**                             | Página de resumen del mesociclo — métricas, gráficos, tabla de totales                                                                                                                                                                                              |
| 22263–24697    | **PagePDF** ⭐                              | **Vista de plan imprimible** — renderiza la planilla completa formateada para PDF/pantalla. Incluye CSS mobile bottom nav (~L23519–23623) y state mobile (~L23633–23640)                                                                                            |
| 24698–24750    | **Constantes de Plantillas**                | `PERIODOS`, `OBJETIVOS`, `NIVELES`, labels y colores                                                                                                                                                                                                                |
| 24751–25083    | **Logos SVG**                               | `LogoHorizontal`, `LogoIL`, `LogoILSolo` — logos inline como componentes SVG                                                                                                                                                                                        |
| 25084–25143    | **useHistory**                              | Hook de undo/redo con persistencia en localStorage                                                                                                                                                                                                                  |
| 25144–25345    | **usePlantillas**                           | Hook para CRUD de plantillas con sync a Supabase                                                                                                                                                                                                                    |
| 25346–25643    | **GuardarPlantillaModal**                   | Modal para guardar plantilla desde mesociclo/semana/distribución                                                                                                                                                                                                    |
| 25644–25967    | **PlantillaCard**                           | Card de una plantilla en la galería                                                                                                                                                                                                                                 |
| 25968–26875    | **PagePlantilla**                           | Página de edición de una plantilla (como mini PageAtleta)                                                                                                                                                                                                           |
| 26876–27197    | **CrearPlantillaModal**                     | Modal para crear plantilla desde cero                                                                                                                                                                                                                               |
| 27198–27404    | **DuplicarPlantillaModal**                  | Modal para duplicar plantilla existente                                                                                                                                                                                                                             |
| 27405–27596    | **SectionHeader + CardGrid + NivelSection** | Componentes de layout para galería de plantillas                                                                                                                                                                                                                    |
| 27597–28196    | **PagePlantillas**                          | Página principal de galería de plantillas                                                                                                                                                                                                                           |
| 28197–28528    | **PageNormativosAtleta**                    | Página de normativos específicos por atleta                                                                                                                                                                                                                         |
| 28529–28766    | **PlantillaPicker**                         | Selector de plantilla para aplicar a mesociclo                                                                                                                                                                                                                      |
| 28767–29455    | **PageNormativos**                          | Página global de normativos del coach                                                                                                                                                                                                                               |
| 29456–30600    | **PageCalculadora**                         | Calculadora de series/reps con tablas editables                                                                                                                                                                                                                     |
| 30601–31882    | **PanelReferencia**                         | Panel lateral de referencia rápida (atleta/plantilla side-by-side)                                                                                                                                                                                                  |
| 31883–32291    | **LoginScreen**                             | Pantalla de login con email/password. Footer: `Sistema IronLifting © 2026 · v{APP_VERSION}`                                                                                                                                                                         |
| 32292–33647    | **CoachApp** ⭐                             | **Componente principal coach** — state management, routing, sync DB, tabs. Loading screens (authLoading, profile) muestran `v{APP_VERSION}`                                                                                                                         |
| 33648–34800    | **AtletaPanel** ⭐                          | **Vista del atleta** — carga datos desde Supabase, muestra mesos y PagePDF. State: `atletaNormOvr` (overrides en state directo, no localStorage), `coachNormativos`, `coachTablas`. Computed: `atletaNormativos` (useMemo). Loading screen muestra `v{APP_VERSION}` |

---

## 2. Funciones Clave

| Función                                                                        | Línea  | Qué hace                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- | ------ |
| `calcSeriesRepsKg(tablas, ej, ejData, irm_arr, irm_env, modo, reps_asignadas)` | 5038   | Calcula series/reps/kg para cada intensidad. Usa tablas T1/T2/T3 + lookups. Si repsInter=0 → null. Si >8 → 1×repsInter. Si no → lookup.                                                                                                                |
| `getRepsVal(ej, semIdx, tIdx)`                                                 | ~22364 | (Dentro de PagePDF) Reps de un ejercicio. Prioridad: 1) override manual localStorage, 2) ej.reps_asignadas, 3) cálculo tentativa automático. El cálculo auto usa `getGrupo()` → si retorna `null`, devuelve 0 reps.                                    |
| `buildEjercicioRow(ej, semIdx, tIdx)`                                          | 22753  | Arma fila PDF: busca `ejData` en `normativos` prop → getRepsVal → calcSeriesRepsKg → filtra cols sin datos (`.filter(c => c.s                                                                                                                          |     | c.r)`) |
| `buildComplementarioRow(comp, semIdx, tIdx)`                                   | 22623  | Arma fila de complementario: usa `.bloques[]` en vez de `INTENSIDADES`. No depende de `getGrupo`.                                                                                                                                                      |
| `getEjercicioById(id, normativos?)`                                            | 2521   | Busca ejercicio por ID. Cadena: 1) `normativos` param, 2) localStorage `liftplan_normativos`, 3) `EJERCICIOS[]` hardcodeado. **Crítico:** muchos helpers la llaman sin param → depende de localStorage.                                                |
| `getGrupo(ejercicio_id)`                                                       | 14276  | Ejercicio → grupo (Arranque/Envion/Tirones/Piernas). Llama `getEjercicioById()` SIN normativos → depende de localStorage. Si no encuentra (ej. ID custom >144 sin localStorage) → fallback por `GRUPO_RANGES` → si ID fuera de rangos, retorna `null`. |
| `calcSembradoSemana(sem)`                                                      | 14289  | Cuenta ejercicios por grupo por turno. Retorna `{porGrupo, totalSem}`. Usa `getGrupo()`, por lo que depende de localStorage.                                                                                                                           |
| `restoreMesoOverrides(mesoId, overrides)`                                      | 887    | Escribe overrides de DB → localStorage (10 keys por meso)                                                                                                                                                                                              |
| `restoreAtletaPctOverrides(atletaId, overrides)`                               | 926    | Escribe overrides de porcentaje del atleta desde DB → localStorage (4 keys: semOvr, semMan, turnoOvr, turnoMan)                                                                                                                                        |
| `restoreAtletaNormOverrides(atletaId, overrides)`                              | 775    | Escribe overrides de normativos del atleta desde DB → localStorage (`liftplan_normativos_atleta_${atletaId}`). Dispara CustomEvent `liftplan:normativos-overrides-updated`.                                                                            |
| `buildMesoOverridesPayload(meso)`                                              | 788    | Empaqueta overrides de localStorage → objeto para guardar en DB                                                                                                                                                                                        |
| `writeLocalJson(key, value)`                                                   | ~700   | Wrapper de `localStorage.setItem` con `JSON.stringify`. Usado por AtletaPanel para persistir coachNormativos/coachTablas.                                                                                                                              |

## 3. Constantes

| Constante            | Línea | Contenido                                                                                                                                                                                                            |
| -------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TABLA_DEFAULT`      | 14360 | Tablas de calculadora: tabla1/2/3 + lookup_tirones + lookup_general                                                                                                                                                  |
| `INTENSIDADES`       | 14355 | `[50, 60, 70, 75, 80, 85, 90, 95]`                                                                                                                                                                                   |
| `EJERCICIOS[]`       | 1081  | ~144 ejercicios hardcodeados `{id, nombre, base, pct_base, categoria}`. IDs 1–144. Coach puede agregar custom con IDs > 144 via normativos → se guardan en `coach_settings` y `liftplan_normativos` de localStorage. |
| `GRUPO_RANGES`       | 14265 | Rangos legacy ID→grupo                                                                                                                                                                                               |
| `APP_VERSION`        | 33    | `"1.0.9"` — versión de la app, se muestra en loading y login                                                                                                                                                         |
| `COACH_SETTING_KEYS` | 651   | `{NORMATIVOS, TABLAS}`                                                                                                                                                                                               |

## 4. Overrides (localStorage ↔ DB)

10 keys por mesociclo en localStorage. Se sincronizan con columna `overrides` (JSONB) en tabla `mesociclos`.

- `restoreMesoOverrides()` — DB → localStorage
- `buildMesoOverridesPayload()` — localStorage → DB

| Key pattern                        | Contenido                                |
| ---------------------------------- | ---------------------------------------- |
| `liftplan_pt_${mesoId}_repsEdit`   | Reps manuales `{semIdx-tIdx-ejId: reps}` |
| `liftplan_pt_${mesoId}_manualEdit` | Flags de reps editadas                   |
| `liftplan_pt_${mesoId}_cellEdit`   | Ediciones de celdas individuales         |
| `liftplan_pt_${mesoId}_cellManual` | Flags de celdas editadas                 |
| `liftplan_pt_${mesoId}_nameEdit`   | Nombres personalizados                   |
| `liftplan_pt_${mesoId}_noteEdit`   | Notas por celda                          |
| `liftplan_pct_${mesoId}_sem*`      | Override % semanal + flags               |
| `liftplan_pct_${mesoId}_turno*`    | Override % turno + flags                 |

### Overrides por Atleta

Almacenados en columna `pct_overrides` y `normativos_overrides` de tabla `atletas`.

| Key pattern                              | Contenido                                             |
| ---------------------------------------- | ----------------------------------------------------- |
| `liftplan_pct_${atletaId}_semOvr`        | Override % semanal por atleta                         |
| `liftplan_pct_${atletaId}_semMan`        | Flags de semanas editadas por atleta                  |
| `liftplan_pct_${atletaId}_turnoOvr`      | Override % turno por atleta                           |
| `liftplan_pct_${atletaId}_turnoMan`      | Flags de turnos editados por atleta                   |
| `liftplan_normativos_atleta_${atletaId}` | Overrides de normativos: `{ejId: {pct_base?, base?}}` |

### localStorage Global (requerido por helpers)

⚠️ **CRÍTICO**: Varios helpers (`getEjercicioById`, `getGrupo`, `calcSembradoSemana`) leen estas keys sin recibir normativos como parámetro. Si no están pobladas, ejercicios custom (ID > 144) no se encuentran.

| Key                   | Contenido                                               | Quién lo escribe                                      |
| --------------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| `liftplan_normativos` | Array completo de ejercicios del coach (incluye custom) | CoachApp sync + AtletaPanel (desde DB coach_settings) |
| `liftplan_tablas`     | Tablas de calculadora del coach                         | CoachApp sync + AtletaPanel (desde DB coach_settings) |

## 5. Flujo Atleta

AtletaPanel → carga mesos de DB → `restoreMesoOverrides()` → `restoreAtletaPctOverrides()` → `restoreAtletaNormOverrides()` → guarda `coachNormativos` + `coachTablas` en localStorage (para `getEjercicioById`/`getGrupo`) → computa `atletaNormativos` (useMemo: merge coachNormativos + atletaNormOvr state) → renderiza PagePDF con `atletaNormativos`.

### Cadena de rendering de ejercicio (PagePDF)

```
buildEjercicioRow(ej, semIdx, tIdx)
  ├─ normativos.find(e => e.id === ej.ejercicio_id) → ejData
  │   └─ Si no encuentra → return null (ejercicio no se renderiza)
  ├─ getRepsVal(ej, semIdx, tIdx) → repsVal
  │   ├─ 1) manualEditSaved.has(k) → repsEditSaved[k] (override manual)
  │   ├─ 2) ej.reps_asignadas > 0 → ej.reps_asignadas
  │   └─ 3) Auto-calc:
  │       ├─ getGrupo(ej.ejercicio_id) → grupo
  │       │   └─ getEjercicioById(id) SIN param → busca en localStorage
  │       │       └─ Si localStorage vacío y ID > 144 → null → 0 reps
  │       ├─ calcSembradoSemana(sem) → {porGrupo, totalSem}
  │       └─ Distribuye reps por grupo y turno
  ├─ calcSeriesRepsKg(tablas, ej, ejData, irm_arr, irm_env, modo, repsVal)
  │   ├─ kgBase = ejData.pct_base × IRM_atleta / 100
  │   ├─ Por cada intensidad: repsInter = tablaRow[intens] × repsVal / 100
  │   │   ├─ Si repsInter === 0 → {series: null, reps_serie: null}
  │   │   ├─ Si repsInter > 8 → {1 × repsInter}
  │   │   └─ lookup_tirones o lookup_general → {series, reps_serie}
  │   └─ kg = kgBase × intens / 100 (redondeado a 0.5)
  └─ .filter(c => c.s || c.r) → cols visibles
      └─ Si 0 reps → todos repsInter=0 → todas cols filtradas
          └─ Desktop: muestra "–" | Mobile: CSS oculta (display:none)
```

### CSS Mobile que oculta celdas vacías (~L23404)

```css
.pdf-table td[data-label]:has(.cell-empty) {
  display: none;
}
```

Excepto para pretemporada: `.pdf-table tr.pretemporada-row td[data-label]:has(.cell-empty) { display: flex; }`

---

## 6. Bugs

| Estado       | Bug                                                                                                                                                                                                                                                                  | Fix                                                                                                                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ v1.0.1    | Atleta no ve reps/kg — faltaba `restoreMesoOverrides()` en AtletaPanel                                                                                                                                                                                               | Agregado en useEffect de carga                                                                                                                                                           |
| ✅ v1.0.6    | Ejercicios con normativos overrides no renderizan en móvil (solo etiqueta) — AtletaPanel pasaba `coachNormativos` en vez de `atletaNormativos` a PagePDF                                                                                                             | Se agregó: `restoreAtletaNormOverrides()`, `restoreAtletaPctOverrides()`, `atletaNormOvr` en state, `useMemo` para `atletaNormativos`                                                    |
| ✅ v1.0.7    | Ejercicios custom (ID > 144) sin overrides no renderizan en mobile — `getGrupo()` → `getEjercicioById()` busca en localStorage `liftplan_normativos` que en AtletaPanel nunca se escribía. Auto-calc de reps fallaba → 0 reps → cols vacías → ocultas por CSS mobile | AtletaPanel ahora escribe `coachNormativos` y `coachTablas` a localStorage con `writeLocalJson()` al cargar coach_settings del DB                                                        |
| ⚠️ Pendiente | PanelReferencia hardcodea `TABLA_DEFAULT` (L30897) en vez de usar las tablas del coach                                                                                                                                                                               | —                                                                                                                                                                                        |
| ✅           | Franja superior transparente en algunos móviles iOS (safe-area notch/Dynamic Island)                                                                                                                                                                                 | `body::before` fijo con `background:var(--bg)` y `height:env(safe-area-inset-top)` (L2221)                                                                                               |
| ✅ v1.0.8    | Bottom nav PDF demasiado pegada al home indicator en iPhone                                                                                                                                                                                                          | `padding-bottom: calc(env(safe-area-inset-bottom) + 36px)` en `.pdf-mobile-nav` (L23537). Subida de 24px → 36px.                                                                         |
| ✅ v1.0.9    | UX mobile atleta: navbar siempre visible ocupa espacio                                                                                                                                                                                                               | Auto-hide `.pdf-mobile-nav` tras 2s sin scroll (solo `hideActions`/atleta). State `mobNavHidden` + clase `.mob-nav-hidden` con `transform:translateY(100%)`. Timer ref `mobNavTimerRef`. |

---

## 7. Z-Index & Capas

| Elemento                              | z-index | Tipo   |
| ------------------------------------- | ------- | ------ |
| `body::before` (safe-area top cover)  | 9999    | fixed  |
| `.modal-overlay`                      | 200     | fixed  |
| `.nav` (header coach)                 | 100     | sticky |
| `.pdf-mobile-nav` (bottom nav atleta) | 100     | fixed  |
| Sticky turnos internos                | 50 / 2  | sticky |

## 8. Safe-Area Insets

| Ubicación                  | Línea | Uso                                                               |
| -------------------------- | ----- | ----------------------------------------------------------------- |
| `body` padding (global)    | 2220  | `padding-*: env(safe-area-inset-*)` en los 4 lados                |
| `body::before` (top cover) | 2221  | `height: env(safe-area-inset-top)` — cubre notch con color sólido |
| `.pdf-mobile-nav`          | 23537 | `padding-bottom: calc(env(safe-area-inset-bottom) + 36px)`        |
| Modal PDF body             | 23743 | `padding-top: calc(safe-area-inset-top + 52px)`                   |
| PDF header sticky          | 23744 | `top: calc(safe-area-inset-top + 52px)`                           |

## 9. Mobile Nav AtletaPanel (`.pdf-mobile-nav`)

- **Breakpoint:** ≤768px (oculto en desktop)
- **Estilo:** glassmorphism — `rgba(13,17,23,.92)` + `backdrop-filter: blur(16px)`
- **2 filas:** Session tabs (S1, S2…) + Turno tabs (T1, T2…)
- **State:** `isMob`, `mobNavActive`, `mobNavTurnos`, `mobActiveTurno`, `mobNavHidden` (~L23700)
- **Ref:** `mobNavTimerRef` — timer de 2s para auto-hide
- **Auto-hide (v1.0.9):** solo con `hideActions` (vista atleta). Scroll listener muestra nav → 2s sin scroll → `mobNavHidden=true` → clase `.mob-nav-hidden` (`transform:translateY(100%)` + `opacity:0` + `pointer-events:none`). Transición CSS `.35s ease`.
- **Content padding:** `#pdf-preview { padding-bottom: 80px }` para compensar nav fija
