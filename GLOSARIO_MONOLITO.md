# Glosario — coach-app.jsx (~35.383 líneas)

> Se actualiza con cada modificación. Líneas aproximadas; buscar por nombre.

---

## 1. Mapa del Archivo

| Rango (aprox.) | Sección                                      | Descripción                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1–31           | **Imports**                                  | React (useState, useEffect, useRef, useCallback, useMemo), lucide-react icons (Download, Send, FileText, MessageCircle, ChevronLeft, ChevronDown, Minus, Plus, Pencil, Trash2, Library, Copy, Files, Clipboard, User, Briefcase, X, Undo2, Redo2, Droplets, Sprout, Zap, CloudMoon, LogOut, Shield, Search)                                                                                                                          |
| 33             | **APP_VERSION**                              | `"1.7.3"` — se muestra en loading screens y footer del login                                                                                                                                                                                                                                                                                                                                                                         |
| 35–38          | **Supabase Config**                          | `SUPA_URL`, `SUPA_ANON`, `SUPA_CONFIG_OK`, `SUPA_TIMEOUT_MS` (10000ms)                                                                                                                                                                                                                                                                                                                                                               |
| 38–82          | **Sanitización**                             | `toTitleCase`, `sanitizeStringInput`, `sanitizeInput` (anti prototype-pollution), `sanitizeRequestBody`                                                                                                                                                                                                                                                                                                                              |
| 83–131         | **localStorage Safe**                        | `_freeLocalStorageSpace` (purga hist* y plt_draft*), `safeSetItem` (retry on QuotaExceededError)                                                                                                                                                                                                                                                                                                                                     |
| 133–230        | **Auth Helpers**                             | `SESSION_KEY="sb_session"`, `PROFILE_KEY_PREFIX="sb_profile_"`, `saveSession/loadSession/clearSession`, `saveProfileLocal/loadProfileLocal/clearProfileLocal`, `_authListeners[]`, `onAuthChange`, `_emitAuth`, `_session` (module-level), `_readResponseSafe`, `_authMessageMap` (diccionario GoTrue→español amigable), `_authErrorMessage` (traduce mensajes Supabase usando mapa + regex fallback inglés), `_runtimeErrorMessage` |
| 211–328        | **Fetch & Auth**                             | `_fetchWithTimeout` (keepalive support, sanitiza body), `_refreshPromise` / `_refreshCooldownUntil` (dedup+cooldown 30s), `_refreshToken`, `_getValidSession` (refresh si <60s restantes)                                                                                                                                                                                                                                            |
| 329–680        | **`sb` — Cliente Supabase**                  | Objeto con `.auth` (signIn/signUp/signOut/resetPassword), `._handleEmailCallback` (PKCE `?token_hash=` → POST `/auth/v1/verify` + implicit `#access_token` fallback; devuelve `_verifyFailed` marker si PKCE falla), `.from(table)` (query builder: select/eq/gt/single/limit/order/exec/then/insert/upsert/update/delete), `.rpc(fnName, params)`. signUp acepta `options.emailRedirectTo` → redirige a `/sistema`.                 |
| 647–660        | **Sync Setup**                               | `getSupabase()`, `COACH_SETTING_KEYS={normativos,tablas}`, `LIFTPLAN_LOCAL_SYNC_EVENT="liftplan:local-sync"`                                                                                                                                                                                                                                                                                                                         |
| 660–700        | **`_visResume`**                             | Visibility-resume throttle global: MIN_GAP=30s, STAGGER=400ms entre callbacks. `_visResume.sub(fn)` → cleanup. Escucha `visibilitychange`                                                                                                                                                                                                                                                                                            |
| 700–710        | **BroadcastChannel**                         | `_bc = new BroadcastChannel("liftplan:db-sync")`. `markDbSync()`, `broadcastDbWrite(type)`                                                                                                                                                                                                                                                                                                                                           |
| 720–810        | **Backup & LocalStorage**                    | `BACKUP_INTERVAL_MS` (5h), `BACKUP_PROMPTED_KEY`, `getLastDbSync()`, `collectLocalData()`, `collectBackupData()` (async, localStorage+Supabase), `downloadBackup()` (async), `emitLocalSyncEvent(key)`, `readLocalJson(key,fb)`, `writeLocalJson(key,val)`, `asPlainObject`, `asArray`                                                                                                                                               |
| 810–870        | **Override Management (Atleta Norm)**        | `collectAtletaNormOverrides(atletaId)`, `restoreAtletaNormOverrides(atletaId, ovr)` (dispara CustomEvent), `buildMesoOverridesPayload(meso, liveOverrides?)`                                                                                                                                                                                                                                                                         |
| 870–925        | **Coach Settings DB**                        | `loadCoachSetting(coachId, key)`, `loadCoachSettingRow(coachId, key)`, `saveCoachSetting(coachId, key, val)`, `resolveSharedCoachId(coachId)` — queries `coach_shared_workspace`                                                                                                                                                                                                                                                     |
| 925–950        | **collectMesoOverrides(mesoId)**             | Lee 10 keys localStorage → objeto plano                                                                                                                                                                                                                                                                                                                                                                                              |
| 950–1000       | **restoreMesoOverrides(mesoId, ovr)**        | Escribe 10 keys de DB → localStorage                                                                                                                                                                                                                                                                                                                                                                                                 |
| 1000–1010      | **collectAtletaPctOverrides(atletaId)**      | Lee 4 keys localStorage (semOvr/semMan/turnoOvr/turnoMan)                                                                                                                                                                                                                                                                                                                                                                            |
| 1010–1025      | **restoreAtletaPctOverrides(atletaId, ovr)** | Escribe 4 keys de DB → localStorage                                                                                                                                                                                                                                                                                                                                                                                                  |
| 1025–1148      | **Mapeos APP ↔ DB**                          | `atletaToDb/atletaFromDb`, `mesoToDb/mesoFromDb` (con `_meta` en overrides), `plantillaToDb/plantillaFromDb`                                                                                                                                                                                                                                                                                                                         |
| 1148–2098      | **EJERCICIOS[]**                             | Array de ~144 ejercicios `{id, nombre, base, pct_base, categoria}`. IDs 1–144. Nota: ID 26 no existe (salto).                                                                                                                                                                                                                                                                                                                        |
| 2099–2220      | **Constantes de Datos**                      | `DIAS[7]`, `MOMENTOS[3]`, `CATEGORIAS[5]`, `CAT_COLOR{}`, factories: `mkId`, `mkTurnos`, `mkSemanas`, `mkBloqueBasica`, `mkEjBasica`, `EMPTY_NAME_SENTINEL=\u200B`, `resolveExerciseName`, `mkTurnosBasica`, `mkSemanasBasica`, `mkEjPretemp`, `mkTurnosPretemp`, `mkSemanasPretemp`                                                                                                                                                 |
| 2220–2900      | **CSS Global**                               | Template literal `css` — variables CSS, layout, forms, buttons, badges, cards, scrollbars, media queries (≤768px tablet, ≤480px mobile)                                                                                                                                                                                                                                                                                              |
| 2900–3020      | **Helpers de Cálculo**                       | `calcKg`, `calcVolumenSemana`, `calcRepsPorGrupo`, `remapSemanaIdx`, `remapSemPctKeyForSwap`, `remapTurnoPctKeyForSwap`, `remapOverrideObjectKeys`, `remapOverrideSetKeys`, `getEjercicioById(id, normativos?)`, `getSembradoStats(turnos, normativos?)`                                                                                                                                                                             |
| 3020–3085      | **Modal**                                    | Componente modal genérico con focus trap, scroll lock, backdrop click                                                                                                                                                                                                                                                                                                                                                                |
| 3086–3200      | **ExercisePickerOverlay**                    | Overlay para seleccionar ejercicio — search, group jumps, keyboard nav                                                                                                                                                                                                                                                                                                                                                               |
| 3200–3345      | **Ciclo Menstrual**                          | `FASES_CICLO` (4 fases con label/color/bg/Icon), `parseAppDate`, `getAgeFromBirthDate`, `getFasePorDia`, `getFasesVentanaCiclo`, `getFaseDominante`, `getFaseCiclo`, `getDetalleFaseCiclo`, `getFechaSemana`, `getFechaSemanaEfectiva`, `formatFechaSemana`, `formatDateDisplay`                                                                                                                                                     |
| 3346–3455      | **AtletaForm**                               | Formulario atleta: nombre/email/telefono/fecha_nacimiento/notas/tipo/genero/ciclo/profile_id                                                                                                                                                                                                                                                                                                                                         |
| 3456–3994      | **MesocicloForm**                            | Formulario de mesociclo con template picker, import opts, distribución de volumen                                                                                                                                                                                                                                                                                                                                                    |
| 3995–4349      | **EjBuscador**                               | Buscador de ejercicios con modal overlay, filtro por ID/nombre, group jumps                                                                                                                                                                                                                                                                                                                                                          |
| 4350–4417      | **ComplementarioRow**                        | Fila de accesorio: EjBuscador + intensidad + tabla + reps + aclaración + kg auto                                                                                                                                                                                                                                                                                                                                                     |
| 4418–4535      | **EjercicioRow**                             | Fila de ejercicio principal: EjBuscador + intensidad + tabla + reps + kg auto                                                                                                                                                                                                                                                                                                                                                        |
| 4536–5120      | **TurnoCard**                                | Card de turno expandible con ANTES/TRABAJO PRINCIPAL/DESPUÉS. Drag order, copy/paste                                                                                                                                                                                                                                                                                                                                                 |
| 5122–5155      | **`calcSeriesRepsKg`** ⭐                    | Calcula series/reps/kg para cada intensidad. Lookups: tirones vs general                                                                                                                                                                                                                                                                                                                                                             |
| 5157–5175      | **`calcKgEj`**                               | Kg de un ejercicio a una intensidad (para sembrado)                                                                                                                                                                                                                                                                                                                                                                                  |
| 5176–5290      | **Navegación Planilla**                      | `PLANILLA_NAV_SELECTOR`, `buildPlanillaFocusGrid`, `focusPlanillaField`, `handlePlanillaArrowNavigation` (arrow keys wrap cíclicamente)                                                                                                                                                                                                                                                                                              |
| 5290–5380      | **Navegación Sembrado**                      | `SEMBRADO_NAV_SELECTOR`, `SEMBRADO_ROLE_ORDER`, `getSembradoTabSequence`, `handleSembradoTabNavigation` (Tab/Shift+Tab)                                                                                                                                                                                                                                                                                                              |
| 5385–9300      | **PlanillaTurno** ⭐                         | Componente gigante — edición de planilla de turnos por semana. Incluye: tabs semana/turno con tooltips hover, ejercicios table con celdas editables, double-click reset, inline name editor, notas, stats totales, bar chart de grupos, sección completa de complementarios (bloques, momentos, copy/paste cross-turno/cross-semana)                                                                                                 |
| 9305–10600     | **PlanillaBasica**                           | Planilla para escuela básica: bloques directos (%/S/R/Kg), sin intensidades, series permite "2+2+2" clusters, REF clickable abre picker                                                                                                                                                                                                                                                                                              |
| 10611–12250    | **PlanillaPretemporada**                     | Planilla pretemporada: multi-exercise IDs con links (+/c/-), turno global navigator, `buildAutoName`, `calcKgPretemp` (usa MENOR pct_base de sub-ejercicios)                                                                                                                                                                                                                                                                         |
| 12264–13285    | **ResumenGrupos**                            | Distribución de reps por grupo por semana. Round-robin redistribute (+/-), tooltips detalle por turno, double-click reset, guardar distribución                                                                                                                                                                                                                                                                                      |
| 13287–14350    | **DistribucionTurnos**                       | Distribución de reps por grupo por turno dentro de semana. Misma lógica round-robin                                                                                                                                                                                                                                                                                                                                                  |
| 14353–14460    | **Helpers de Cálculo Compartidos**           | `GRUPO_RANGES`, `GRUPOS_KEYS[4]`, `getGrupo(ejercicio_id)`, `calcSembradoSemana(sem)`, `calcRepsEjercicio(sem, turnoIdx, meso)` — distribución tentativa con resto a primeros ejercicios                                                                                                                                                                                                                                             |
| 14454–15050    | **Tablas de Calculadora**                    | `INTENSIDADES[8]`, `IRM_VALUES[31]` (65-95), `INTENS_COLS`, `DEFAULT_EJS=3`, `TABLA_DEFAULT` (tabla1/2/3/4/5: 31 filas × 8 cols, lookup_general: 128 entradas, lookup_tirones). `_descriptions{}` para subtítulos editables por tabla                                                                                                                                                                                                |
| 15056–15360    | **EjBuscadorCompacto**                       | Buscador inline compacto para celdas del sembrado. Muestra ID, abre popover                                                                                                                                                                                                                                                                                                                                                          |
| 15364–15545    | **IntensityPickerModal**                     | Modal de selección de intensidad (IRM 50-95%). Keyboard: digits directos, arrow nav, wheel capture                                                                                                                                                                                                                                                                                                                                   |
| 15548–15695    | **EjCelda**                                  | Celda individual de ejercicio: `[#, EjBuscadorCompacto, INT%, TBL(cycle 1/2/3), ✕]`                                                                                                                                                                                                                                                                                                                                                  |
| 15698–15838    | **CeldaSembrado**                            | Celda del sembrado: N ejercicios stacked + move buttons + add button. `normalize()` ordena filled → empty                                                                                                                                                                                                                                                                                                                            |
| 15839–16470    | **SembradoMensual**                          | Grilla mensual: semanas × turnos. Import semana, swap semanas con remap de overrides, add/remove turno                                                                                                                                                                                                                                                                                                                               |
| 16471–16608    | **SemanaView**                               | Vista de semana con TurnoCards, distribución de grupos, reps ajustadas                                                                                                                                                                                                                                                                                                                                                               |
| 16609–16686    | **AtletaCardItem**                           | Card de atleta: avatar, info, mesos, fase ciclo (mujeres), badges activo/modo                                                                                                                                                                                                                                                                                                                                                        |
| 16687–16932    | **AlumnoSectionHeader**                      | Header de sección con count badge y botón "Nuevo"                                                                                                                                                                                                                                                                                                                                                                                    |
| 16933–17400    | **PageAtletas**                              | Lista de atletas con secciones expandibles (MAX_VISIBLE=4), modales CRUD, preview historial de mesos                                                                                                                                                                                                                                                                                                                                 |
| 17402–17565    | **EditMesoModal**                            | Modal edición: nombre/descripción/fecha/modo/IRM                                                                                                                                                                                                                                                                                                                                                                                     |
| 17568–17836    | **EditVolModal**                             | Modal volumen: volumen total + distribución semanal con round-robin ±1%, validación sum=100%                                                                                                                                                                                                                                                                                                                                         |
| 17837–20950    | **PageAtleta** ⭐                            | Página principal del atleta — tabs (planilla/resumen/PDF/normativos/historial), undo/redo (max 15 snaps, 300ms debounce), live data refs, auto-save cleanup, full sembrado modal con filtros (grupo/intensidad/tabla) y zoom                                                                                                                                                                                                         |
| 20978–22300    | **PageResumen**                              | Resumen del mesociclo: métricas, gráficos Recharts (carga dinámica), tablas clickables semana→turno→detalle. `getRepsVal`, `calcMetricas`, `CustomTooltip`, `MetricBox`                                                                                                                                                                                                                                                              |
| 22370–24700    | **PagePDF** ⭐                               | Vista imprimible: CSS dedicado (~1500 líneas), `getRepsVal`, `getCell`, `GC/GB` (grupo colors), `metricas` calculation, `BarChartSVG`, `GrupoBar`, `buildComplementarioRow`, `buildPretemporadaRow`, `buildEjercicioRow`. Mobile: IntersectionObserver para nav, auto-hide nav, indicator pill                                                                                                                                       |
| 24717–24750    | **Constantes de Plantillas**                 | `PERIODOS`, `OBJETIVOS`, `NIVELES`, `ESCUELA_NIVELES`, labels y colores                                                                                                                                                                                                                                                                                                                                                              |
| 24753–24900    | **Logos SVG**                                | `LogoHorizontal(height=44)`, `LogoIL(size=32)`, `LogoILSolo(size=28)` — SVG inline con gradients y filters                                                                                                                                                                                                                                                                                                                           |
| 25043–25142    | **useHistory**                               | Hook genérico undo/redo: `{current, push, undo, redo, canUndo, canRedo, clearHistory}`. Max 15 snapshots. localStorage key: `liftplan_hist_${key}`                                                                                                                                                                                                                                                                                   |
| 25150–25400    | **usePlantillas**                            | Hook CRUD plantillas: delta sync con Supabase (LWW), debounce 4s, `_visResume` listener, draft localStorage, `pendingDeletePlantillaIdsRef`                                                                                                                                                                                                                                                                                          |
| 25400–25650    | **GuardarPlantillaModal**                    | Guardar plantilla desde meso/semana/distribución. Extrae overrides del localStorage                                                                                                                                                                                                                                                                                                                                                  |
| 25650–26000    | **PlantillaCard**                            | Card de plantilla: tags (periodo/objetivo/nivel/escuela), stats, hover states                                                                                                                                                                                                                                                                                                                                                        |
| 26000–26880    | **PagePlantilla**                            | Editor de plantilla (mini PageAtleta): snapshot system, auto-save intervals (3s), Ctrl+Z/Y, draft localStorage                                                                                                                                                                                                                                                                                                                       |
| 26880–27200    | **CrearPlantillaModal**                      | Crear plantilla: tipo selector, template type radio (regular/escuela/pretemporada), weeks/volumen config                                                                                                                                                                                                                                                                                                                             |
| 27200–27400    | **DuplicarPlantillaModal**                   | Duplicar plantilla: search/select, auto-name "Copia de...", deep copy                                                                                                                                                                                                                                                                                                                                                                |
| 27405–27596    | **SectionHeader + CardGrid + NivelSection**  | Layout helpers: collapsible header, grid `repeat(auto-fill, minmax(280px, 1fr))`, nivel agrupado                                                                                                                                                                                                                                                                                                                                     |
| 27597–28200    | **PagePlantillas**                           | Galería de plantillas: 3 secciones (Escuela/Pretemporada/Mis), search, modales CRUD                                                                                                                                                                                                                                                                                                                                                  |
| 28305–28395    | **PageNormativosAtleta**                     | Normativos por atleta: table editable pct_base/base override                                                                                                                                                                                                                                                                                                                                                                         |
| 28396–28800    | **PlantillaPicker**                          | Selector de plantilla con opciones de import: `{irm, volumen, reps, celdas, grupos, complementarios}`                                                                                                                                                                                                                                                                                                                                |
| 28894–29500    | **PageNormativos**                           | Editor global de normativos del coach: CRUD ejercicios, sync DB, `isNormativosValid` validation, `_visResume` listener                                                                                                                                                                                                                                                                                                               |
| 30014–30650    | **PageCalculadora**                          | Calculadora de tablas IRM (tabla1/2/3/4/5) y Series/Reps (lookup_general/lookup_tirones). Cell editing, auto-balance suggestion, test modal 🧪. Descripciones editables por tabla (`_descriptions`) mostradas en sub-tabs y modal testeo                                                                                                                                                                                             |
| 31200–31235    | **PanelTabBoundary**                         | Error boundary para tabs del panel de referencia                                                                                                                                                                                                                                                                                                                                                                                     |
| 31235–31900    | **PanelReferencia**                          | Panel lateral read-only: modo atleta/plantilla, resize drag, storage listeners, cross-tab sync. Fixed mobile (z-index 300)                                                                                                                                                                                                                                                                                                           |
| 31983–32475    | **LoginScreen**                              | Login/Register: email/password, role selector, coach code (RPC `verify_coach_code`), forgot password, notify-registration API                                                                                                                                                                                                                                                                                                        |
| 32476–33700    | **CoachApp** ⭐                              | Componente principal coach: state management (atletas/mesos/tabs), DB sync bidireccional, delta sync (LWW), debounce timers, BroadcastChannel, backup banner, manual save, cleanup                                                                                                                                                                                                                                                   |
| 33900–35383    | **AtletaPanel** ⭐                           | Vista del atleta: carga desde Supabase, restore overrides, coach settings → localStorage, `atletaNormativos` (useMemo merge), dashboard con meso cards, vistas resumen/normativos/PDF. **Cronómetro:** `cronometroExercises`/`cronometroTurnoInfo` states, overlay `<TabataTimer>`. `extractTimerExercises(turno, sem, meso, normativos)` (~L22923) extrae ejercicios con `pushCompRows` helper                                      |

---

## 2. Componentes — States, Refs y Effects

### 2.1 Modal (~L3022)

**Props:** `title`, `onClose`, `children`, `maxWidth`, `fitContent`, `compact`, `overlayPadding`, `scrollable`, `maxHeight`, `tightHeader`
**Refs:** `mdTarget`, `modalRef`
**Effects:** Focus trap (Tab navigation), body scroll lock (`overflow:hidden`), cleanup restore focus+scroll
**Events:** `onMouseDown/Up` backdrop click detection

### 2.2 ExercisePickerOverlay (~L3086)

**Props:** `open`, `normativos`, `query`, `setQuery`, `activeIdx`, `setActiveIdx`, `onClose`, `onSelect`, `inputName`
**Refs:** `listRef`, `modalRef`
**Effects:** Tab focus trap on `open`
**Helpers:** `resetAndClose()`, `applySelection()`, `scrollToIndex()`, `jumpToGroup()`
**Keyboard:** ArrowUp/Down, Enter, Escape

### 2.3 AtletaForm (~L3346)

**Props:** `atleta`, `tipoInicial`, `onSave(form)`, `onClose()`, `registeredUsers`
**State:** `form` — `{id, nombre, email, telefono, fecha_nacimiento, notas, tipo, genero, ciclo, profile_id}`
**Helper:** `set(k,v)` — updater parcial

### 2.4 MesocicloForm (~L3456)

**Props:** `atleta`, `meso`, `onSave(form)`, `onClose()`
**State:** `form` (meso completo inc. escuela/pretemporada flags), `showPicker`, `pendingOverrides`, `pendingGrupos`, `pendingPlantilla`, `importOpts`
**Reads:** `liftplan_plantillas` de localStorage
**Helper:** `set(k,v)`, `confirmApply(plt, opts)`

### 2.5 EjBuscador (~L3995)

**Props:** `value`, `onChange(id)`, `normativos`
**State:** `open`, `query`, `activeIdx`
**Refs:** `inputRef`, `listRef`
**Effects:** Body scroll lock

### 2.6 ComplementarioRow (~L4350)

**Props:** `comp`, `idx`, `irm_arr`, `irm_env`, `onChange`, `onDelete`, `normativos`
Grid: 9 columnas `[idx, EjBuscador, intensidad, tabla, reps_asignadas, kg, aclaracion, delete, badge]`

### 2.7 EjercicioRow (~L4418)

**Props:** `ej`, `idx`, `irm_arr`, `irm_env`, `onChange`, `normativos`
Grid: 7 columnas `[idx, EjBuscador, intensidad, tabla, reps_asignadas, kg, badge]`

### 2.8 TurnoCard (~L4536)

**Props:** `turno`, `semana_idx`, `irm_arr`, `irm_env`, `onChange`, `clipboardTurno`, `setClipboardTurno`, `onPaste`, `normativos`
**State:** `open` (init: semana_idx===0 && turno.numero≤2)
**Helpers:** `normalizeEjs`, `moveEjTurno`, `updateEjTurno`, `normalizeComplementarios`, `addComplementario`, `updateComplementario`, `deleteComplementario`, `moveComplementario`
**Secciones:** ANTES (complementarios_before) / TRABAJO PRINCIPAL (ejercicios) / DESPUÉS (complementarios_after)

### 2.9 PlanillaTurno (~L5385) ⭐ GRANDE

**Props:** `scrollIdPrefix`, `semanas`, `irm_arr`, `irm_env`, `meso`, `semPctOverrides`, `semPctManual`, `turnoPctOverrides`, `turnoPctManual`, `onRequestReset`, `onBeforeChange`, `onChangeTurno`, `onChangeTodasSemanas`, `repsEdit`, `setRepsEdit`, `manualEdit`, `setManualEdit`, `cellEdit`, `setCellEdit`, `cellManual`, `setCellManual`, `nameEdit`, `setNameEdit`, `noteEdit`, `setNoteEdit`, `normativos`, `initialSemActiva`, `initialTurnoActivo`, `onNavChange`
**State (18+):**

- `semActiva`, `turnoActivo` — navegación
- `tipSem`, `tipTurno` — tooltips hover
- `compPickerOpen/Query/ActiveIdx` — exercise picker
- `compPasteFeedback` — feedback visual
- `compPasteTurnosSel`, `compPasteSemanasSel` — selección multi-turno/semana paste
- `compTurnosDropdownOpen`, `compSemanasDropdownOpen` — dropdowns
- `compIntraTargetSel`, `compIntraDropdownOpen`, `compIntraFeedback` — intra-turno paste
- `importSemOrigen`, `importSemFeedback` — importar semana
- `recalcFeedback` — feedback recalc
- `nameEditing` — inline name editor

**Refs (13+):**

- `compPasteTimerRef`, `compIntraTimerRef`, `importSemTimerRef`, `recalcTimerRef` — timeouts
- `compPickerListRef`, `compPickerModalRef` — DOM
- `compTurnosDropdownRef`, `compSemanasDropdownRef`, `compIntraDropdownRef` — dropdown DOM
- `spreadsheetNavRef` — navigation container
- `turnoRef`, `turnoContentRef` — turno scroll
- `_lastPushTime` — debounce history push

**Effects (8+):** Modal focus trap, onNavChange sync, importSemOrigen cleanup, compPasteTurnosSel validation, compPasteSemanasSel validation, timer cleanup, document click handlers
**localStorage:** `_k(type) = liftplan_pt_${meso.id}_${type}` — repsEdit/manualEdit/cellEdit/cellManual/nameEdit/noteEdit
**Helpers:** `_beforeChange()` (debounce 300ms), `_beforeChangeForced()`, wrapped setters con persist
**Complementarios section:** `mkBloqueComp`, `normComp`, `calcKgComp`, `_mapComp`, `updateBloqueComp`, `deleteComp`, `toggleMomento`, `moveComp`, `addComp`, `addBloqueCompCol`, `removeBloqueCompCol`, `cellInputComp`
**Keyboard:** `handleSpreadsheetNavKeyDown` (useCallback)
**Tooltip:** Fixed position z-index 200, font Bebas Neue, color badges

### 2.10 PlanillaBasica (~L9305)

**Props:** `semanas`, `onChange`, `numBloques=3`, `onBeforeChange`, `irm_arr=100`, `irm_env=200`, `normativos`
**State:** `semActiva`, `turnoActivo`, `ejPickerOpen/Query/ActiveIdx`
**Refs:** `spreadsheetNavRef`
**Helpers:** `calcKgBasica`, `updateSemanas`, `updateBloque`, `setEjercicioId`, `setNombreCustom`, `addEjercicio`, `removeEjercicio`, `addTurno`, `removeTurno`, `addSemana`, `removeSemana`, `addBloqueCol`, `removeBloqueCol`, `moveEj`, `copiarTurnoATodasSemanas`, `cellInput`
**Series parsing:** acepta `"2+2+2"` clusters → split("+").reduce

### 2.11 PlanillaPretemporada (~L10611)

**Props:** `semanas`, `onChange`, `numBloques=3`, `onBeforeChange`, `irm_arr=100`, `irm_env=200`, `normativos`
**State:** `turnoGlobalActivo`, `jumpTurno`
**Refs:** `pendingTurnoIdRef`
**Helpers:** `calcKgPretemp(ejercicio_ids, pct)` (usa MENOR pct_base), `updateSemanas`, `updateBloque`, `setSubEjId`, `addSubEj`, `removeSubEj`, `cycleLink` (+/c toggle), `setNombreCustom`, `addEjercicio`, `removeEjercicio`, `removeTurno`, `addTurno`, `addBloqueCol`, `removeBloqueCol`, `moveEj`, `irATurnoGlobal`, `buildAutoName(ejercicio_ids)`
**Data:** `ej.ejercicio_ids = [{eid, link}]` donde link ∈ ["+", "c", "-"]

### 2.12 ResumenGrupos (~L12264)

**Props:** `semanas`, `meso`, `semPctOverrides`, `semPctManual`, `setSemPctOverrides`, `setSemPctManual`, `onRequestReset`, `onGuardarDistribucion`, `onBeforeChange`
**State:** `tooltip`
**Refs:** `_rgLastPush` (debounce 300ms), `rrReduceRef`, `rrIncreaseRef` (round-robin cursors)
**Helpers:** `_rgBefore`, `_rgBeforeForced`, `calcSembradoSemana`, `distributeReduction`, `distributeIncrease`, `getVal`, `isManual`, `setVal`, `applyStepVal`, `resetSingleVal` (double-click), `buildDetalle`

### 2.13 DistribucionTurnos (~L13287)

**Props:** `semanas`, `meso`, `turnoPctOverrides`, `turnoPctManual`, `setTurnoPctOverrides`, `setTurnoPctManual`, `onRequestReset`, `onBeforeChange`, `semPctOverrides`, `semPctManual`
**State:** `semActiva`, `tooltip`, `cellTip`
**Refs:** `containerRef`, `rrReduceRef`, `rrIncreaseRef`, `_dtLastPush` (debounce 300ms)
**Helpers:** `cambiarSemana`, `calcSemana`, `_getSemPct`, `getVal`, `isManual`, `setVal`, `applyStepVal`, `resetSingleVal`, `buildTooltip`

### 2.14 EjBuscadorCompacto (~L15056)

**Props:** `value`, `onChange`, `color`, `title`, `navAttrs`, `normativos`
**State:** `open`, `query`, `activeSearchIdx`
**Refs:** `inputRef`, `triggerRef`, `modalRef`
**Effects:** Tab focus trap
**Keyboard:** ArrowDown/Up, Enter, Escape, Tab trap
**CSS:** `.sembrado-kb-nav`

### 2.15 IntensityPickerModal (~L15364)

**Props:** `value`, `onSelect`, `onClose`
**State:** `activeValue`, `typedBuffer` (digit accumulator, reset 900ms)
**Refs:** `listRef`, `typedBufferResetRef`
**Helpers:** `scrollToIntensity`, `commitSelection`
**Keyboard:** Enter, ArrowDown/Up, digits 0-9, Backspace
**Events:** Wheel capture (preventDefault)

### 2.16 EjCelda (~L15548)

**Props:** `ej`, `num`, `semIdx`, `turnoIdx`, `ejIdx`, `onChange`, `onRemove`, `canRemove`, `normativos`
**State:** `showIntModal`
**Refs:** `intensityBtnRef`, `restoreIntensityFocusRef`
Grid: `14px 1fr 38px 40px 14px` — [#, EjBuscadorCompacto, INT%, TBL, ✕]
TBL cycle: click → 1→2→3→1, keys 1/2/3 direct set

### 2.17 CeldaSembrado (~L15698)

**Props:** `ejercicios`, `irm_arr`, `irm_env`, `semIdx`, `turnoIdx`, `onChange`, `normativos`
**Refs:** `cellRef`, `pendingFocusEjIdxRef`
**Helpers:** `normalize(arr)`, `addEj`, `removeEj`, `updateEj`, `moveEj`
Focus: `requestAnimationFrame` + `focusPlanillaField()`

### 2.18 SembradoMensual (~L15839)

**Props:** `semanas`, `irm_arr`, `irm_env`, `onChangeSemana`, `onChangeTodasSemanas`, `onSwapSemanas`, `meso`, `normativos`
**State:** `importFrom`, `importTo`, `importFeedback`
**Refs:** `importTimerRef`, `sembradoNavRef`, `emptySlotCache`
**Helpers:** `getEjs` (pad to DEFAULT_EJS), `updateEjs` (dedup IDs), `updateDiaSemana`, `addTurno`, `removeTurno`, `importarSemanaSembrado`, `intercambiarSemanas`, `handleSembradoKeyDown`

### 2.19 SemanaView (~L16471)

**Props:** `semana`, `irm_arr`, `irm_env`, `meso`, `onChange`
**State:** `clipboardTurno`
**Helpers:** `updateTurno`, `updateGrupo` (mantiene sum=100)

### 2.20 AtletaCardItem (~L16609)

**Props:** `a`, `mesociclos`, `coachId`, `onSelect`, `onEdit`, `onDelete`
**Computed:** `mesoAtleta` (filtrado+sorted), `mesoActivo`, `edad`, fase ciclo (mujeres)

### 2.21 PageAtletas (~L16933)

**Props:** `atletas`, `setAtletas`, `mesociclos`, `setMesociclos`, `onSelect`, `coachId`
**State:** `showForm`, `tipoInicial`, `editAtleta`, `previewAtleta`, `expandedAtletas`, `expandedAsesorias`, `registeredUsers`, `confirmDeleteAtleta`, `confirmDeletePreviewMeso`
**Constantes:** `MAX_VISIBLE=4`
**DB:** `sb.from("profiles").select("id,nombre,email").eq("rol","atleta")` → registeredUsers
**Helpers:** `saveAtleta`, `deleteAtleta`, `previewSetActivo`, `previewDuplicarMeso`, `renderCard`

### 2.22 EditMesoModal (~L17402)

**Props:** `meso`, `onSave`, `onClose`
**State:** `form` — {nombre, descripcion, fecha_inicio, modo, irm_arranque, irm_envion}

### 2.23 EditVolModal (~L17568)

**Props:** `meso`, `onSave`, `onClose`
**State:** `volTotal`, `semanas` (deep copy)
**Refs:** `rrReduceRef`, `rrIncreaseRef`
**Helpers:** `toIntPct`, `distributeReduction`, `distributeIncrease`, `updatePct`, `stepPct`
**Validación:** totalPct === 100

### 2.24 PageAtleta (~L17837) ⭐ MUY GRANDE

**Props:** `atleta`, `mesociclos`, `setMesociclos`, `onBack`, `addPlantilla`, `onLiveMesoData`, `onAtletaOverridesChange`, `openRequest`

**State (22+):**

- UI: `showMeso`, `showEditMeso`, `showGuardarPlantilla`, `showEditVol`, `mesoSelId`, `vistaActual` ("meso"/"resumen"/"pdf"/"normativos"/"historial"), `showFullSembrado`, `confirmReset`, `confirmDeleteMeso`
- Filtros: `filtroGrupos[]`, `filtroIntensidades[]`, `filtroTablas[]`, `fullTableZoom` (0.35-2.5)
- Normativos: `atletaNormOverrides`, `globalNormativos`
- Pct overrides: `semPctOverrides`, `semPctManual` (Set), `turnoPctOverrides`, `turnoPctManual` (Set)
- Cell edits: `repsEdit`, `manualEdit` (Set), `cellEdit`, `cellManual` (Set), `nameEdit`, `noteEdit`
- History: `histState` — {canUndo, canRedo}

**Refs (8+):**

- `latestMesoRef` — cleanup save
- `planillaNavRef` — scroll state per meso {semActiva, turnoActivo}
- `fullTableViewportRef`, `fullTableRef` — full view zoom
- `histStackRef`, `histIdxRef`, `prevMesoIdRef` — history stack
- `liveDataRef` — always-current state for onLiveMesoData

**Effects (10+):**

- openRequest handler (on `openRequest.tick`)
- History load (on `mesoVisto.id`)
- Keyboard shortcuts (Ctrl+Z/Y) → window "keydown"
- Filter cleanup (on `showFullSembrado`)
- Live data debounce (100ms) → `onLiveMesoData`
- Cleanup save on unmount → persiste latest meso
- CustomEvent listener `liftplan:normativos-overrides-updated`

**localStorage keys:**

- Init: `liftplan_normativos_atleta_${atleta.id}`, `liftplan_normativos`
- Per meso: `liftplan_pt_${mesoId}_*` (6 keys), `liftplan_pct_${mesoId}_*` (4 keys)
- History: `liftplan_hist_meso_${mesoId}`

**Computed:** `mesoAtleta`, `mesoActivoReal`, `mesoVisto`, `semanasConDatosBase`, `turnosConDatosBase`, `gruposUsados`, `intensidadesUsadas`, `tablasUsadas`, `atletaNormativos` (merged)
**Snapshot:** `{semanas, volumen_total, irm_arranque, irm_envion, semPctOverrides, turnoPctOverrides, semPctManual, turnoPctManual, repsEdit, manualEdit, cellEdit, cellManual, nameEdit, noteEdit}`
**Helpers:** `captureSnapshot`, `pushSnap` (300ms debounce, max 15), `applySnapshot`, `undoHist/redoHist`, `updateMeso`, `updateSemana`, `updateSemanaH` (history-aware), `pasaFiltrosSembrado`, `handleSwapSemanasOverrides`

### 2.25 PageResumen (~L20978)

**Props:** `meso`, `atleta`, `irm_arr`, `irm_env`, `normativos`
**State:** `semActiva`, `turnoActivo`, `RC` (Recharts library)
**Effects:** Dynamic `import("recharts")` with fallback `window.Recharts`
**Reads localStorage:** `liftplan_normativos`, `liftplan_tablas`, `liftplan_pt_${meso.id}_*` (4 keys)
**Helpers:** `getRepsVal`, `calcMetricas(pairs)` → {volReps, volKg, pesoMedio, coefInt, intMedia, grupoData}
**Charts:** BarChart, LineChart (Recharts), CustomTooltip, MetricBox
**Navigation:** Mesociclo → click semana → click turno (drill-down)

### 2.26 PagePDF (~L22370) ⭐ GRANDE

**Props:** `meso`, `atleta`, `irm_arr`, `irm_env`, `normativos`, `tablas`, `hideActions`
**Refs:** `previewRef`, `mobNavTimerRef`
**State (10):** `sharing`, `shareStatus`, `downloading`, `isMob`, `mobNavActive`, `mobNavTurnos`, `mobActiveTurno`, `mobNavHidden`, `pdfActiveSem` (selected week index, default 0), `expandedTurnos` (Set of turnoKeys `${semIdx}-${tIdx}`)
**Effects (5):**

1. Resize listener (mobile detect)
2. Auto-hide nav timer (1s idle, solo hideActions)
3. IntersectionObserver semana visibility → `mobNavActive`
4. IntersectionObserver turno visibility → `mobActiveTurno`
5. useLayoutEffect: mide sem-header height para sticky position

**Reads localStorage:** `liftplan_normativos`, `liftplan_tablas`, `liftplan_pt_${meso.id}_*` (6 keys)
**Helpers:** `getRepsVal`, `getCell`, `GC/GB` (grupo colors/bgs), `metricas` (by semana), `BarChartSVG`, `GrupoBar`, `buildComplementarioRow`, `buildPretemporadaRow`, `buildEjercicioRow`, `toggleTurno(key)`, `toggleAllTurnos(semIdx, turnos)`
**Handlers:** `handleShareWhatsApp` (compose URL), `handleDownload` (HTML blob con inline CSS+JS, expande todo temporalmente para captura)
**CSS:** ~1700 líneas de CSS dedicado (pdfStyle template literal)

**Collapsible Turnos (v1.3.0):**

- Turno headers son clickeables, toggle expand/collapse de la tabla de ejercicios
- Estado `expandedTurnos` (Set) controla qué turnos están abiertos
- Chevron `<ChevronDown>` rota con CSS transition al expandir
- `.pdf-turno-content` wrapper con `max-height:0/9999px` transition
- Botón "Expandir/Colapsar todos" en la barra de tabs
- En print: todo se expande automáticamente via `@media print`
- En download: se expande todo, se captura HTML, se restaura estado

**Week Tabs (v1.3.0):**

- `.pdf-sem-tabs-wrap` con tabs de semana, sticky en mobile
- `pdfActiveSem` controla qué semana se muestra
- Todas las semanas se renderizan pero inactivas tienen `display:none`
- Mobile nav pills sincronizan con `pdfActiveSem`
- Turno buttons del mobile nav ahora toggle expand del turno
- Download HTML incluye JS para collapsible + week switching

**Limpieza UI (v1.3.1):**

- Removida etiqueta de fase del ciclo menstrual (Lútea, Folicular, etc.) del listado de atletas. Solo se conserva en la vista de semanas del mesociclo.

### 2.27 useHistory (~L25043)

**Signature:** `useHistory(key, initial, maxLen=15)`
**Returns:** `{current, push, undo, redo, canUndo, canRedo, clearHistory}`
**localStorage:** `liftplan_hist_${key}`

### 2.28 usePlantillas (~L25150)

**Signature:** `usePlantillas(coachId)`
**Returns:** `{plantillas, add, update, remove, flushSync}`
**State:** `plantillas` (init from localStorage)
**Refs:** `plantillaSyncTimersRef` (Map), `pendingDeletePlantillaIdsRef` (Set)
**Effects:** Delta sync con Supabase (LWW), `_visResume` listener, throttle 5s entre pulls
**localStorage:** `liftplan_plantillas`, `liftplan_plt_draft_${id}`
**Helpers:** `queuePlantillaSync(item, delay=4000)`

### 2.29 GuardarPlantillaModal (~L25400)

**Props:** `tipo` ("meso"|"semana"|"distribucion"), `dataMeso`, `dataSemana`, `dataDistribucion`, `onSave`, `onClose`
**State:** `form` — {nombre, descripcion, periodo, objetivo, nivel, modo, ...}
**Lógica:** Extrae overrides de localStorage, reestructura semanas según tipo

### 2.30 PlantillaCard (~L25650)

**Props:** `plt`, `onUse`, `onOpen`, `onEdit`, `onDelete`, `onDuplicate`, `compact=false`
**State:** `hov` (hover button tracking)

### 2.31 PagePlantilla (~L26000) ⭐

**Props:** `plt`, `onUpdate`, `onClose`
**State:** `vistaActual`, `confirmReset`, pct overrides (4), cell edits (6)
**Refs:** `latestFormRef`, `pHistRef`, `pIdxRef`
**localStorage:** `liftplan_hist_plt_${plt.id}`, `liftplan_pt_${plt.id}_*`, `liftplan_plt_draft_${plt.id}`
**Auto-save:** interval 3s, visibilitychange, cleanup unmount
**Keyboard:** Ctrl+Z (undo), Ctrl+Y/Ctrl+Shift+Z (redo)

### 2.32 CrearPlantillaModal (~L26880)

**Props:** `onSave`, `onClose`
**State:** form con tipo/nombre/escuela/pretemporada/nivel/periodo/objetivo/weeks/volumen

### 2.33 DuplicarPlantillaModal (~L27200)

**Props:** `plantillas`, `base`, `onSave`, `onClose`
**State:** `selectedId`, `nombre`, `descripcion`, `busq`, `nameTouched`
**Auto-name:** "Copia de ${selected.nombre}" (si !nameTouched)

### 2.34 PagePlantillas (~L27597)

**Props:** `plantillas`, `onAdd`, `onUpdate`, `onDelete`, `onOpen`
**State:** `busqueda`, `editando`, `confirmDelete`, `duplicando`, `showCrear`, `showNueva`, `showImportar`, `colapsadoEscuela/Main/Pretemp/Mias`
**Secciones:** Escuela Inicial (por nivel) / Pretemporada / Mis Plantillas

### 2.35 PageNormativosAtleta (~L28305)

**Props:** `atleta`, `globalNormativos`, `atletaNormativos`, `atletaNormOverrides`, `saveAtletaOverrides`, `getEjAtleta`
**State:** `filtro`, `catFiltro`, `editId`, `editForm`, `error`

### 2.36 PlantillaPicker (~L28396)

**Props:** `plantillas`, `tipo="meso"`, `onSelect(template, opts)`, `onClose`
**State:** `filtro`, `selected`, `opts` — {irm, volumen, reps, celdas, grupos, complementarios}

### 2.37 PageNormativos (~L28894)

**Props:** `coachId`, `isActive`
**State:** `ejercicios`, `filtro`, `catFiltro`, `editId`, `editForm`, `showAdd`, `newEj`, `confirmDel`, `error`
**Refs:** `isSyncingRef`
**Effects:** Sync from DB on mount, `_visResume` listener
**localStorage:** `liftplan_normativos`
**DB:** `loadCoachSettingRow/saveCoachSetting` via `COACH_SETTING_KEYS.normativos`
**Validation:** `isNormativosValid(value)` — Array con length >= EJERCICIOS.length, IDs únicos

### 2.38 PageCalculadora (~L30014)

**Props:** `coachId`
**State:** `tablas` (incluye `_descriptions`), `seccion` ("irm"|"sr"), `tabIRM`, `tabSR`, `editCell`, `suggestion`, `testIRM`, `testReps`
**Helpers internos:** `DEFAULT_DESCRIPTIONS` — valores por defecto vacíos para tabla1-5
**Effects:** Sync from DB on coachId change, `_visResume` listener
**normalizeTablas:** Merges remote/local con `TABLA_DEFAULT` + preserva `_descriptions` (merge con `DEFAULT_DESCRIPTIONS`)
**localStorage:** `liftplan_tablas`
**DB:** `loadCoachSetting/saveCoachSetting` via `COACH_SETTING_KEYS.tablas`
**Helpers:** `normalizeTablas`, `updateCell`, `updateLookup`, `resetTabla`, `rowSum`, `calcIRMresultante`, `computeBalance`, `applySuggestion`

### 2.39 PanelReferencia (~L31235)

**Props:** `atletas`, `mesociclos`, `plantillas`, `liveMesoData={}`, `onClose`, `onWidthChange`, `isMobile`
**State:** `modo` ("atleta"|"plantilla"), `atletaId`, `mesoId`, `pltId`, `semIdx`, `turnoIdx`, `vista` ("planilla"|"resumen"|"pdf"), `vistaKey`, `isMobileState`, `localRevision`
**Refs:** `resizing`, `panelWidth` (420px default)
**Effects:** Resize handler, storage listeners (3)
**Events listeners:**

- `window "storage"` — cross-tab sync
- `window LIFTPLAN_LOCAL_SYNC_EVENT` — internal sync
- `window "liftplan:normativos-overrides-updated"` — normativos change
  **localStorage reads:** `liftplan_normativos`, `liftplan_normativos_atleta_${atletaId}`, `liftplan_pt_${mid}_*`, `liftplan_pct_${mid}_*`
  **CSS:** z-index 300 (mobile overlay), resizable via 6px handle

### 2.40 LoginScreen (~L31983)

**Props:** `onAuth(session)`
**State:** `mode` ("login"|"register"), `email`, `password`, `nombre`, `rol` ("atleta"|"coach"), `codigoCoach`, `error`, `loading`, `msg`, `logs`
**Handlers:** `handleLogin`, `handleRegister`, `handleForgot`
**DB:** `sb.auth.signInWithPassword`, `sb.auth.signUp`, `sb.rpc("verify_coach_code")`, `sb.auth.resetPasswordForEmail`
**API:** POST `/api/notify-registration`

### 2.41 CoachApp (~L32476) ⭐ PRINCIPAL

**Props:** `session`, `profile`, `onLogout`
**State (15+):**

- `tab` — current tab (string)
- `refPanel` — reference panel visibility
- `refPanelWidth` (420)
- `liveMesoData` — `{[atletaId]: liveData}`
- `atletas` — init from localStorage `liftplan_atletas`
- `mesociclos` — init from localStorage `liftplan_mesociclos`
- `atletasTabs[]` — open athlete tabs (persiste en `liftplan_atletas_tabs`)
- `atletaOpenRequest{}` — request to open athlete tab
- `plantillasTabs[]` — open template tabs (persiste en `liftplan_plantillas_tabs`)
- `coachId` — resolved via `resolveSharedCoachId`
- `isManualSaving` — manual save button state
- `showBackupBanner` — 5h warning

**Refs (10+):**

- `mesoOverrideSyncTimersRef` (Map) — debounce per meso (800ms)
- `atletaOverrideSyncTimersRef` (Map) — debounce per athlete (800ms)
- `atletaSyncTimerRef` — athlete list sync (2s)
- `mesoSyncTimerRef` — meso list sync (2s)
- `prevAtletasRef`, `prevMesociclosRef` — LWW comparison
- `pendingDeleteAtletaIdsRef` (Set), `pendingDeleteMesoIdsRef` (Set)
- `lastPullAtletasRef`, `lastSyncTsAtletasRef` — delta sync throttle (5s)
- `lastPullMesosRef`, `lastSyncTsMesosRef`
- `prevLiveMesoDataRef`

**Effects:**

- Resolve coachId
- Initial load from DB + restore overrides
- Live meso override sync (on liveMesoData change)
- Timer cleanup on unmount
- Backspace handling for number inputs
- BroadcastChannel listener
- `_visResume` listener → trigger pulls

**Hooks custom:** `usePlantillas(coachId)`
**Helpers:** `abrirAtleta`, `cerrarAtleta`, `abrirPlantilla`, `cerrarPlantilla`, `forceSaveAllToDb`, `queueMesoOverrideSync` (800ms), `queueAtletaOverrideSync` (800ms)
**DB sync:** Delta sync LWW, debounce 2s para listas, 800ms para overrides
**BroadcastChannel:** Listen `_bc "message"`, emit `broadcastDbWrite`

### 2.42 AtletaPanel (~L33900) ⭐

**Props:** `session`, `profile`, `onLogout`
**State:** `loading`, `atletaInfo`, `mesociclos`, `selectedMeso`, `coachNormativos`, `coachTablas`, `atletaView` ("resumen"|"normativos"|null), `normSearch`, `atletaNormOvr`
**Refs:** `mesoScrollRef`, `mesoIdRef`
**Memos:** `atletaNormativos` = useMemo([coachNormativos, atletaNormOvr])
**DB queries:**

- `sb.from("atletas").eq("profile_id", session.user.id)` → atletaInfo
- `sb.from("mesociclos").eq("app_atleta_id", atleta.app_id).order("updated_at", desc)` → mesociclos
- `sb.from("coach_settings").eq("coach_id", atleta.coach_id)` → normativos + tablas

**localStorage writes:** `liftplan_normativos`, `liftplan_tablas`, `liftplan_pt_${mid}_*`, `liftplan_pct_${mid}_*`, `liftplan_normativos_atleta_${atletaId}`
**Helpers:** `getCurrentWeek(meso)`, `calcAge(dateStr)`, `getEjercicioNombre(ejId)`

### 2.43 App (~L35100, export default)

**State:** `session`, `profile`, `authLoading`
**Effects:** Auth init → `sb._handleEmailCallback()` → `sb.auth.getSession()` → `sb.auth.onAuthStateChange()` → `loadProfile`
**Fallback:** 8s watchdog → offline mode con cached session/profile
**Routing:** authLoading → spinner, !session → LoginScreen, rol≠coach → AtletaPanel, rol=coach → CoachApp

---

## 3. Funciones Clave

| Función                                                                        | Línea                                  | Qué hace                                                                                                                                    |
| ------------------------------------------------------------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `calcSeriesRepsKg(tablas, ej, ejData, irm_arr, irm_env, modo, reps_asignadas)` | 5122                                   | Calcula series/reps/kg para cada intensidad. Usa tablas T1/T2/T3 + lookups. Si repsInter=0→null. Si >8→1×repsInter. Si no→lookup            |
| `getRepsVal(ej, semIdx, tIdx)`                                                 | ~22442 (PagePDF), ~20980 (PageResumen) | Reps de ejercicio. Prioridad: 1) override manual, 2) ej.reps_asignadas, 3) auto-calc tentativa                                              |
| `buildEjercicioRow(ej, semIdx, tIdx)`                                          | ~22952                                 | Arma fila PDF: normativos.find → getRepsVal → calcSeriesRepsKg → filtra cols sin datos                                                      |
| `buildComplementarioRow(comp, semIdx, tIdx)`                                   | ~22785                                 | Arma fila complementario: usa bloques[], `resolveExerciseName()`, flag `isCompBloques`                                                      |
| `buildPretemporadaRow(ej)`                                                     | ~22851                                 | Arma fila pretemporada: usa `ej.ejercicio_ids[]`, `calcKgPretempPdf(pct)`                                                                   |
| `getEjercicioById(id, normativos?)`                                            | ~2981                                  | Busca ejercicio. Cadena: 1) normativos param, 2) localStorage `liftplan_normativos`, 3) EJERCICIOS[]. **Crítico: sin param → localStorage** |
| `getGrupo(ejercicio_id)`                                                       | 14364                                  | Ejercicio→grupo. Prioriza `categoria` field, fallback `GRUPO_RANGES`. Si no encuentra→`null`                                                |
| `calcSembradoSemana(sem)`                                                      | 14377                                  | Cuenta ejs por grupo por turno → `{porGrupo, totalSem}`. Usa `getGrupo()`                                                                   |
| `calcRepsEjercicio(sem, turnoIdx, meso)`                                       | 14399                                  | Distribución tentativa de reps: `vol_total × pct_sem × pct_grupo × pct_turno / n_ejs`. Resto al primer ej                                   |
| `calcKg(ej, irm_arr, irm_env)`                                                 | ~2910                                  | `IRM × pct_base / 100`                                                                                                                      |
| `calcVolumenSemana(volTotal, pct)`                                             | ~2918                                  | `volTotal × pct / 100`                                                                                                                      |
| `calcRepsPorGrupo(reps, pctGrupos)`                                            | ~2922                                  | Maps reps % per category group                                                                                                              |
| `getSembradoStats(turnos, normativos?)`                                        | ~2992                                  | Counts/percentages de ejercicios por categoría                                                                                              |
| `calcKgPretemp(ejercicio_ids, pct)`                                            | ~10642                                 | Kg usando MENOR pct_base entre sub-ejercicios                                                                                               |
| `calcKgBasica(ej, normativos)`                                                 | ~9333                                  | Kg para escuela básica                                                                                                                      |
| `restoreMesoOverrides(mesoId, overrides)`                                      | ~950                                   | DB → localStorage (10 keys por meso)                                                                                                        |
| `restoreAtletaPctOverrides(atletaId, overrides)`                               | ~1010                                  | DB → localStorage (4 keys)                                                                                                                  |
| `restoreAtletaNormOverrides(atletaId, overrides)`                              | ~810                                   | DB → localStorage + dispara CustomEvent                                                                                                     |
| `buildMesoOverridesPayload(meso, liveOverrides?)`                              | ~810                                   | localStorage → objeto para DB. Incluye `_meta`                                                                                              |
| `collectMesoOverrides(mesoId)`                                                 | ~925                                   | Lee 10 keys localStorage → objeto plano                                                                                                     |
| `collectAtletaPctOverrides(atletaId)`                                          | ~1000                                  | Lee 4 keys localStorage                                                                                                                     |
| `collectAtletaNormOverrides(atletaId)`                                         | ~810                                   | Lee 1 key localStorage                                                                                                                      |
| `resolveSharedCoachId(coachId)`                                                | ~900                                   | Consulta `coach_shared_workspace` → workspace owner                                                                                         |
| `writeLocalJson(key, value)`                                                   | ~810                                   | `localStorage.setItem` + `emitLocalSyncEvent`                                                                                               |
| `readLocalJson(key, fallback)`                                                 | ~805                                   | `localStorage.getItem` + `JSON.parse`                                                                                                       |
| `collectBackupData()`                                                          | ~755                                   | localStorage + 5 tablas Supabase → backup v2                                                                                                |
| `downloadBackup()`                                                             | ~779                                   | `collectBackupData` → JSON blob → download link                                                                                             |
| `distributeReduction(baseVals, keys, amount, rrKey)`                           | ~12325                                 | Round-robin decrement %                                                                                                                     |
| `distributeIncrease(baseVals, keys, amount, rrKey)`                            | ~12351                                 | Round-robin increment %                                                                                                                     |
| `buildPlanillaFocusGrid()`                                                     | ~5176                                  | 2D grid de elementos focuseables para arrow key nav                                                                                         |
| `handlePlanillaArrowNavigation()`                                              | ~5233                                  | Arrow keys wrap cíclicamente en grid                                                                                                        |
| `handleSembradoTabNavigation()`                                                | ~5355                                  | Tab/Shift+Tab handler para sembrado                                                                                                         |

---

## 4. Constantes

| Constante                   | Línea  | Contenido                                                                                                                                           |
| --------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_VERSION`               | 33     | `"1.7.3"`                                                                                                                                           |
| `SUPA_TIMEOUT_MS`           | 38     | `10000` (10s)                                                                                                                                       |
| `SESSION_KEY`               | 133    | `"sb_session"`                                                                                                                                      |
| `PROFILE_KEY_PREFIX`        | 134    | `"sb_profile_"`                                                                                                                                     |
| `COACH_SETTING_KEYS`        | 651    | `{normativos: "normativos_globales", tablas: "tablas_calculadora"}`                                                                                 |
| `LIFTPLAN_LOCAL_SYNC_EVENT` | 648    | `"liftplan:local-sync"`                                                                                                                             |
| `BACKUP_INTERVAL_MS`        | ~720   | `5 * 60 * 60 * 1000` (5 horas)                                                                                                                      |
| `BACKUP_PROMPTED_KEY`       | ~721   | `"liftplan_backup_prompted_at"`                                                                                                                     |
| `EJERCICIOS[]`              | 1148   | ~144 ejercicios `{id, nombre, base, pct_base, categoria}`. IDs 1-144 (26 no existe)                                                                 |
| `DIAS[]`                    | ~2132  | 7 días: Lunes...Domingo                                                                                                                             |
| `MOMENTOS[]`                | ~2140  | ["Mañana", "Tarde", "Noche"]                                                                                                                        |
| `CATEGORIAS[]`              | ~2141  | ["Arranque", "Envion", "Tirones", "Piernas", "Complementarios"]                                                                                     |
| `CAT_COLOR{}`               | ~2145  | Categoría → hex color                                                                                                                               |
| `EMPTY_NAME_SENTINEL`       | ~2181  | `"\u200B"` (zero-width space)                                                                                                                       |
| `FASES_CICLO{}`             | ~3201  | 4 fases menstruales: menstruacion/folicular/ovulacion/lutea. Cada una: `{label, color, bg, Icon}`                                                   |
| `GRUPO_RANGES`              | 14353  | Legacy ID→grupo: Arranque[1-19], Envion[20-48], Tirones[49-68], Piernas[69-78]                                                                      |
| `GRUPOS_KEYS[]`             | 14361  | ["Arranque", "Envion", "Tirones", "Piernas"]                                                                                                        |
| `INTENSIDADES[]`            | 14454  | [50, 60, 70, 75, 80, 85, 90, 95]                                                                                                                    |
| `IRM_VALUES[]`              | 14455  | [65..95] — 31 valores para picker                                                                                                                   |
| `INTENS_COLS[]`             | 14458  | Same as INTENSIDADES                                                                                                                                |
| `DEFAULT_EJS`               | 14461  | 3 — ejercicios por celda sembrado                                                                                                                   |
| `TABLA_DEFAULT{}`           | ~14460 | tabla1/2/3/4/5 (31 filas × 8 cols), lookup_general (128 entries), lookup_tirones. `_descriptions` almacenado en objeto tablas (no en TABLA_DEFAULT) |
| `PLANILLA_NAV_SELECTOR`     | ~5194  | CSS selector para elementos focuseables en planilla                                                                                                 |
| `SEMBRADO_NAV_SELECTOR`     | ~5290  | `"[data-sembrado-nav=\"true\"]"`                                                                                                                    |
| `SEMBRADO_ROLE_ORDER`       | ~5295  | Prioridad de roles para tab order                                                                                                                   |
| `PERIODOS[]`                | 24717  | ["pretemporada", "competitivo", "transicion", "general"]                                                                                            |
| `OBJETIVOS[]`               | 24718  | ["fuerza", "tecnica", "volumen", "pico", "mixto"]                                                                                                   |
| `NIVELES[]`                 | 24719  | ["principiante", "intermedio", "elite"]                                                                                                             |
| `ESCUELA_NIVELES[]`         | 24730  | ["1", "2", "3", "4", "5"]                                                                                                                           |
| `PERIODO_LABEL/COLOR`       | 24717+ | Labels y colores por período                                                                                                                        |
| `OBJETIVO_LABEL/COLOR`      | 24718+ | Labels y colores por objetivo                                                                                                                       |
| `NIVEL_LABEL`               | 24719+ | Labels por nivel                                                                                                                                    |
| `ESCUELA_NIVEL_LABEL/COLOR` | 24730+ | Labels y colores por nivel escuela                                                                                                                  |
| `MAX_VISIBLE`               | 16947  | 4 — cards visibles antes de expandir en PageAtletas                                                                                                 |

---

## 5. Overrides (localStorage ↔ DB)

### 5.1 Overrides por Mesociclo (10 keys)

Almacenados en columna `overrides` (JSONB) de tabla `mesociclos`.

| Key pattern                        | Contenido                                       |
| ---------------------------------- | ----------------------------------------------- |
| `liftplan_pt_${mesoId}_repsEdit`   | Reps manuales `{semIdx-tIdx-ejId: reps}`        |
| `liftplan_pt_${mesoId}_manualEdit` | Array de keys editadas manualmente              |
| `liftplan_pt_${mesoId}_cellEdit`   | Ediciones de celdas `{key: {series,reps,kg}}`   |
| `liftplan_pt_${mesoId}_cellManual` | Array de keys de celdas editadas                |
| `liftplan_pt_${mesoId}_nameEdit`   | Nombres personalizados `{ejKey: nombre}`        |
| `liftplan_pt_${mesoId}_noteEdit`   | Notas por celda `{key: texto}`                  |
| `liftplan_pct_${mesoId}_semOvr`    | Override % semanal por grupo `{g-sIdx: pct}`    |
| `liftplan_pct_${mesoId}_semMan`    | Array de keys semanal editadas                  |
| `liftplan_pct_${mesoId}_turnoOvr`  | Override % turno por grupo `{g-sIdx-tIdx: pct}` |
| `liftplan_pct_${mesoId}_turnoMan`  | Array de keys turno editadas                    |

- `collectMesoOverrides(mesoId)` — localStorage → objeto
- `restoreMesoOverrides(mesoId, overrides)` — objeto → localStorage
- `buildMesoOverridesPayload(meso, liveOverrides?)` — localStorage/live → DB payload (incluye `_meta`)

### 5.2 Overrides por Atleta

Almacenados en columnas `pct_overrides` y `normativos_overrides` de tabla `atletas`.

| Key pattern                              | Contenido                                         |
| ---------------------------------------- | ------------------------------------------------- |
| `liftplan_pct_${atletaId}_semOvr`        | Override % semanal por atleta                     |
| `liftplan_pct_${atletaId}_semMan`        | Flags de semanas editadas                         |
| `liftplan_pct_${atletaId}_turnoOvr`      | Override % turno por atleta                       |
| `liftplan_pct_${atletaId}_turnoMan`      | Flags de turnos editados                          |
| `liftplan_normativos_atleta_${atletaId}` | Override normativos: `{ejId: {pct_base?, base?}}` |

- `collectAtletaPctOverrides(atletaId)` / `restoreAtletaPctOverrides(atletaId, ovr)`
- `collectAtletaNormOverrides(atletaId)` / `restoreAtletaNormOverrides(atletaId, ovr)` (+ CustomEvent)

### 5.3 localStorage Global (requerido por helpers)

⚠️ **CRÍTICO**: Varios helpers (`getEjercicioById`, `getGrupo`, `calcSembradoSemana`) leen estas keys sin recibir normativos como parámetro.

| Key                           | Contenido                              | Quién lo escribe                                                  |
| ----------------------------- | -------------------------------------- | ----------------------------------------------------------------- |
| `liftplan_normativos`         | Array completo de ejercicios del coach | CoachApp sync + AtletaPanel + PageNormativos                      |
| `liftplan_tablas`             | Tablas de calculadora del coach        | CoachApp sync + AtletaPanel + PageCalculadora                     |
| `liftplan_atletas`            | Lista de atletas del coach             | CoachApp sync                                                     |
| `liftplan_mesociclos`         | Lista de mesociclos                    | CoachApp sync                                                     |
| `liftplan_plantillas`         | Plantillas del coach                   | usePlantillas hook                                                |
| `liftplan_last_db_sync`       | Timestamp último sync                  | `markDbSync()`                                                    |
| `liftplan_backup_prompted_at` | Timestamp último backup                | `downloadBackup()`                                                |
| `liftplan_atletas_tabs`       | Tabs abiertos de atletas               | CoachApp (cleared on new browser session via sessionStorage flag) |
| `liftplan_plantillas_tabs`    | Tabs abiertos de plantillas            | CoachApp (cleared on new browser session via sessionStorage flag) |
| `sb_session`                  | Sesión de auth                         | Auth helpers                                                      |
| `sb_profile_${userId}`        | Perfil cacheado                        | Auth helpers                                                      |

### 5.4 localStorage por Plantilla

| Key                            | Contenido                                |
| ------------------------------ | ---------------------------------------- |
| `liftplan_plt_draft_${pltId}`  | Draft de plantilla (sync pendiente)      |
| `liftplan_hist_plt_${pltId}`   | History stack undo/redo de plantilla     |
| `liftplan_hist_meso_${mesoId}` | History stack undo/redo de meso          |
| `liftplan_hist_${key}`         | History stack genérico (useHistory hook) |

---

## 6. Flujo Atleta

### 6.1 Carga AtletaPanel

```
AtletaPanel mount
  ├─ sb.from("atletas").eq("profile_id", userId) → atletaInfo
  ├─ sb.from("mesociclos").eq("app_atleta_id", atletaInfo.app_id) → mesociclos
  ├─ sb.from("coach_settings").eq("coach_id", atletaInfo.coach_id) → settings
  │   ├─ normativos_globales → coachNormativos + writeLocalJson("liftplan_normativos")
  │   └─ tablas_calculadora → coachTablas + writeLocalJson("liftplan_tablas")
  ├─ Para cada meso: restoreMesoOverrides(meso.app_id, meso.overrides)
  ├─ restoreAtletaPctOverrides(atletaInfo.app_id, atletaInfo.pct_overrides)
  ├─ restoreAtletaNormOverrides(atletaInfo.app_id, atletaInfo.normativos_overrides)
  └─ atletaNormativos = useMemo(merge coachNormativos + atletaNormOvr)
```

### 6.2 Cadena de rendering de ejercicio (PagePDF)

```
buildEjercicioRow(ej, semIdx, tIdx)
  ├─ normativos.find(e => e.id === ej.ejercicio_id) → ejData
  │   └─ Si no encuentra → return null
  ├─ getRepsVal(ej, semIdx, tIdx) → repsVal
  │   ├─ 1) manualEditSaved.has(k) → repsEditSaved[k]
  │   ├─ 2) ej.reps_asignadas > 0 → ej.reps_asignadas
  │   └─ 3) Auto-calc:
  │       ├─ getGrupo(ej.ejercicio_id) → grupo
  │       │   └─ getEjercicioById(id) SIN param → localStorage
  │       ├─ calcSembradoSemana(sem) → {porGrupo, totalSem}
  │       └─ Distribuye reps por grupo y turno
  ├─ calcSeriesRepsKg(tablas, ej, ejData, irm_arr, irm_env, modo, repsVal)
  │   ├─ kgBase = ejData.pct_base × IRM / 100
  │   ├─ Por cada intensidad: repsInter = tablaRow[intens] × repsVal / 100
  │   │   ├─ repsInter === 0 → {series: null, reps_serie: null}
  │   │   ├─ repsInter > 8 → {1 × repsInter}
  │   │   └─ lookup (tirones o general) → {series, reps_serie}
  │   └─ kg = kgBase × intens / 100 (redondeado a 0.5)
  └─ .filter(c => c.s || c.r) → cols visibles
```

### 6.3 CSS Mobile que oculta celdas vacías

```css
.pdf-table td[data-label]:has(.cell-empty) {
  display: none;
}
```

Excepto pretemporada: `.pdf-table tr.pretemporada-row td[data-label]:has(.cell-empty) { display: flex; }`

---

## 7. Sync & Debounce Patterns

| Operación                         | Debounce                   | Trigger                                   |
| --------------------------------- | -------------------------- | ----------------------------------------- |
| Meso override sync (CoachApp)     | 800ms per meso             | liveMesoData change                       |
| Atleta override sync (CoachApp)   | 800ms per athlete          | onAtletaOverridesChange                   |
| Atleta list sync (CoachApp)       | 2s                         | setAtletas                                |
| Meso list sync (CoachApp)         | 2s                         | setMesociclos                             |
| Plantilla sync (usePlantillas)    | 4s per plantilla           | update()                                  |
| Plantilla add sync                | 1s                         | add()                                     |
| History snapshot push             | 300ms                      | onBeforeChange (PlanillaTurno/PageAtleta) |
| Delta pull throttle               | 5s min gap                 | \_visResume / BroadcastChannel            |
| Visibility resume throttle        | 30s min gap, 400ms stagger | \_visResume                               |
| Token refresh cooldown            | 30s after failure          | \_refreshToken                            |
| PagePlantilla auto-save           | 3s interval                | setInterval                               |
| PanelReferencia liveData debounce | 100ms                      | liveDataRef change                        |

### Conflict Resolution: Last-Write-Wins (LWW)

- Compara `_updated_at` timestamps con **`dbTs > localTs`** (estricto). Empate gana **local**.
  - Motivo (fix v1.4.2): un pull inmediatamente posterior al propio push tiene `dbTs == localTs`; si DB ganara el empate, `restoreMesoOverrides` pisaría los 10 keys de localStorage y cualquier edición de override hecha entre el push y el pull se perdería (síntoma: celdas del sembrado "se vuelven a como estaban").
  - Aplicado en `pullAtletas` (~L33757) y `pullMesociclos` (~L33852).
- Delta sync: `updated_at > lastSyncTs`
- Skips items pending delete (`pendingDelete*Ref`)

### Flush de timers al ocultar/cerrar pestaña (`syncOverrides`)

`visibilitychange(hidden)` y `beforeunload` llaman a `syncOverrides(useKeepalive)` (~L34043-L34110), que ahora vacía:

1. Timers lentos (`atletaSyncTimerRef`, `mesoSyncTimerRef`) — ya existía.
2. **Timers de overrides** (`mesoOverrideSyncTimersRef`, `atletaOverrideSyncTimersRef`, 800ms) — fix v1.4.2. Antes se perdía la escritura si el usuario cambiaba de pestaña dentro de esos 800ms (especialmente en mobile).
3. `flushPlantillaSync()` — ya existía.

**IMPORTANTE (fix v1.6.2):** `onHide` debe cancelar los timers (`clearTimeout`) pero **NO setear los refs a null** antes de llamar a `syncOverrides`, porque `syncOverrides` chequea `atletaSyncTimerRef.current !== null` para saber si hay cambios pendientes. Si se setea a null antes, el push no ocurre y se pierden cambios (incluido `profile_id` de vinculación). `onBeforeUnload` ya funcionaba bien porque no seteaba refs a null. El fix mueve el `= null` a DESPUÉS de `syncOverrides()`.

---

## 8. Custom Events & BroadcastChannel

| Event                                   | Tipo             | Dispatched By                                                  | Listened By                        |
| --------------------------------------- | ---------------- | -------------------------------------------------------------- | ---------------------------------- |
| `liftplan:normativos-overrides-updated` | CustomEvent      | `restoreAtletaNormOverrides`, `PageAtleta.saveAtletaOverrides` | PageAtleta, PanelReferencia        |
| `liftplan:local-sync`                   | CustomEvent      | `writeLocalJson` (via `emitLocalSyncEvent`)                    | PanelReferencia                    |
| `liftplan:db-sync`                      | BroadcastChannel | `broadcastDbWrite` (after upsert/delete)                       | CoachApp (triggers pull)           |
| `visibilitychange`                      | DOM              | Browser                                                        | `_visResume` (throttled callbacks) |
| `storage`                               | DOM              | Browser (cross-tab)                                            | PanelReferencia                    |

---

## 9. Keyboard Shortcuts

| Shortcut                  | Contexto                                               | Acción                                      |
| ------------------------- | ------------------------------------------------------ | ------------------------------------------- |
| `Ctrl+Z` / `Cmd+Z`        | PageAtleta, PagePlantilla                              | Undo                                        |
| `Ctrl+Y` / `Ctrl+Shift+Z` | PageAtleta, PagePlantilla                              | Redo                                        |
| `Arrow keys`              | PlanillaTurno grid                                     | Navigate cells (wrap cíclico)               |
| `Tab` / `Shift+Tab`       | Sembrado                                               | Navigate elements by (sem, turno, ej, role) |
| `Enter`                   | ExercisePicker, IntensityPicker                        | Select/Confirm                              |
| `Escape`                  | ExercisePicker, IntensityPicker                        | Close                                       |
| `ArrowUp/Down`            | ExercisePicker, IntensityPicker                        | Navigate list                               |
| `1/2/3` keys              | EjCelda TBL button                                     | Set tabla directly                          |
| `0-9` digits              | IntensityPickerModal                                   | Direct entry (e.g. "7"→70%)                 |
| `Backspace`               | IntensityPickerModal                                   | Remove last digit                           |
| `Enter`                   | PlanillaPretemporada jumpTurno                         | Jump to turno                               |
| `Enter/Escape`            | PlanillaTurno name editor                              | Confirm/Cancel inline edit                  |
| `Double-click`            | PlanillaTurno cells, ResumenGrupos, DistribucionTurnos | Reset manual override                       |

---

## 10. CSS Variables (Theme)

```css
--bg: #0a0c10 --surface: #12151c --surface2: #1a1e27 --surface3: #222732
  --text: #e8eaf0 --muted: #6b7280 --gold: #e8c547 --blue: #64b4e8
  --green: #47e8a0 --red: #e85047 --border: #2a303c;
```

**Fonts:** `'Bebas Neue'` (headers, números), `'DM Sans'` (texto)

---

## 11. Estructura de Datos: Escuela vs Normal vs Pretemporada

### Escuela Mesociclo

- **Flags**: `escuela: true`, `escuela_nivel: "1"-"5"`, `num_bloques_basica: 3`
- **NO tiene**: `volumen_total`, `sem.pct_volumen`, `sem.reps_ajustadas`, `ej.intensidad`
- **Ejercicio**: `{ejercicio_id, bloques: [{pct, series, reps, kg, nota}]}`
- **Kg calc**: `IRM × pct_base / 100 × bloque.pct / 100` (en `calcKgBasica`)
- **Tabs visibles**: Planilla (PlanillaBasica), Resumen (PageResumen), PDF, Normativos
- **Resumen/PDF métricas**: itera `ej.bloques` — volReps=Σ(series×reps), volKg=Σ(series×reps×kg)
- **PDF rows**: `buildEscuelaRow` → `isCompBloques:true, isEscuelaRow:true` (muestra % col)
- **Saved via**: `base.semanas = dataMeso.semanas` (as-is, no transform)

### Normal Mesociclo (con Sembrado)

- **Flags**: `escuela: false`, `pretemporada: false`
- **Tiene**: `volumen_total`, `sem.pct_volumen`, `sem.reps_ajustadas`, `ej.intensidad` (65-95)
- **Ejercicio**: `{ejercicio_id, intensidad, tabla}` — sin bloques
- **Kg calc**: `calcSeriesRepsKg` → lookup tablas → INTENSIDADES
- **Resumen/PDF métricas**: `getRepsVal` + `calcSeriesRepsKg` + `INTENSIDADES.forEach`
- **PDF rows**: `buildEjercicioRow` → intensidades columns

### Pretemporada

- **Flags**: `pretemporada: true`
- **Ejercicio**: `{ejercicio_ids: [{eid, link}], bloques: [...]}` — multi-exercise
- **Kg calc**: MENOR pct_base entre sub-ejercicios (`calcKgPretemp`)
- **Resumen**: Tab oculto (no existe)
- **PDF rows**: `buildPretemporadaRow` → `isCompBloques:true, isPretemporadaRow:true`

---

## 11. CSS Classes Catálogo

### Layout

`.app`, `.main`, `.nav`, `.nav-tab`, `.nav-tab.active`, `.page-title`, `.page-sub`, `.flex-between`, `.text-sm`, `.text-muted`, `.text-gold`, `.divider`

### Grid

`.grid2`, `.grid3`, `.grid4`

### Cards

`.card`, `.card-title`, `.card-mb16`

### Forms

`.form-group`, `.form-label`, `.form-input`, `.form-select`, `.form-row`, `.no-spin`

### Buttons

`.btn`, `.btn-gold`, `.btn-ghost`, `.btn-icon`, `.btn-danger`, `.btn-sm`, `.btn-xs`

### Badges

`.badge`, `.badge-gold`, `.badge-blue`, `.badge-green`, `.badge-red`

### Atletas

`.atleta-card`, `.atleta-avatar`, `.atleta-info`, `.atleta-name`, `.atleta-meta`

### Semanas

`.semana-header`, `.semana-tab`, `.semana-tab.active`

### Volumen/Grupos

`.vol-grid`, `.vol-item`, `.vol-label`, `.vol-val`, `.grupos-grid`, `.grupo-item`, `.grupo-label`, `.grupo-pct`, `.prog-bar`, `.prog-fill`

### Turnos

`.turno-card`, `.turno-header`, `.turno-num`, `.turno-dia`, `.turno-chevron`, `.turno-body`

### Ejercicios

`.ej-row`, `.comp-row`, `.ej-select`, `.ej-input`, `.ej-kg`, `.ej-cat`, `.ej-num`

### Modal

`.modal-overlay` (z-index 200), `.modal`, `.modal-title`, `.modal-footer`

### Planilla

`.planilla-tabla`, `.norm-table`, `.scroll-x`

### PDF

`.pdf-page`, `.pdf-cover`, `.pdf-cover-name`, `.pdf-cover-meso`, `.pdf-cover-sub`, `.pdf-cover-right`, `.pdf-irm-box`, `.pdf-irm-item`, `.pdf-irm-val`, `.pdf-irm-lbl`, `.pdf-accent-bar`
`.pdf-sem-header`, `.pdf-sem-info`, `.pdf-sem-title`, `.pdf-sem-details`, `.pdf-sem-metrics`, `.pdf-sem-metric`
`.pdf-turno-header`, `.pdf-turno-num`, `.pdf-turno-dia`
`.pdf-table`, `.pdf-table .ej-nombre`, `.pdf-table .cell-data`, `.pdf-table .cell-series`, `.pdf-table .cell-reps`, `.pdf-table .cell-kg`, `.pdf-table .cell-note`, `.pdf-table .cell-empty`
`.pdf-resumen-page`, `.pdf-resumen-title`, `.pdf-resumen-grid`, `.pdf-kpi`, `.pdf-kpi-val`, `.pdf-kpi-lbl`, `.pdf-sem-table`, `.pdf-footer`

### Mobile Nav

`.pdf-mobile-nav` (z-index 100), `.pdf-mobile-nav.mob-nav-hidden`, `.pdf-mobile-nav-row`, `.pdf-mobile-nav-pill`, `.pdf-mobile-nav-turnos`, `.pdf-mobile-nav-turno`, `.mob-nav-indicator` (z-index 99)

### Sembrado

`.sembrado-kb-nav`

---

## 12. Z-Index & Capas

| Elemento                                | z-index | Tipo   |
| --------------------------------------- | ------- | ------ |
| `body::before` (safe-area top cover)    | 9999    | fixed  |
| PanelReferencia (mobile overlay)        | 300     | fixed  |
| `.modal-overlay`                        | 200     | fixed  |
| Tooltips (PlanillaTurno, ResumenGrupos) | 200     | fixed  |
| `.nav` (header coach)                   | 100     | sticky |
| `.pdf-mobile-nav` (bottom nav atleta)   | 100     | fixed  |
| `.mob-nav-indicator` (pill flotante)    | 99      | fixed  |
| Sticky tab header (PageAtleta)          | 90      | sticky |
| Sticky turnos internos                  | 50 / 2  | sticky |

---

## 13. Safe-Area Insets

| Ubicación                  | Línea | Uso                                                               |
| -------------------------- | ----- | ----------------------------------------------------------------- |
| `body` padding (global)    | 2220  | `padding-*: env(safe-area-inset-*)` en los 4 lados                |
| `body::before` (top cover) | 2221  | `height: env(safe-area-inset-top)` — cubre notch con color sólido |
| `.pdf-mobile-nav`          | 23605 | `padding-bottom: calc(env(safe-area-inset-bottom) + 36px)`        |
| Modal PDF body             | 23743 | `padding-top: calc(safe-area-inset-top + 52px)`                   |
| PDF header sticky          | 23744 | `top: calc(safe-area-inset-top + 52px)`                           |

---

## 14. Mobile Nav AtletaPanel (`.pdf-mobile-nav`)

- **Breakpoint:** ≤768px (oculto en desktop)
- **Estilo:** glassmorphism — `rgba(13,17,23,.92)` + `backdrop-filter: blur(16px)`
- **2 filas:** Session tabs (S1, S2…) + Turno tabs (T1, T2…)
- **State:** `isMob`, `mobNavActive`, `mobNavTurnos`, `mobActiveTurno`, `mobNavHidden`
- **Ref:** `mobNavTimerRef` — timer de 1s para auto-hide
- **Auto-hide:** solo con `hideActions` (vista atleta). Scroll listener muestra nav → 1s sin scroll → `mobNavHidden=true` → clase `.mob-nav-hidden` (`transform:translateY(100%)` + `opacity:0` + `pointer-events:none`). Transición CSS `.35s ease`.
- **Indicator:** `.mob-nav-indicator` — pill flotante `bottom:12px right:12px`. Muestra semana+turno activo. Click revela nav.
- **Content padding:** `#pdf-preview { padding-bottom: 80px }` para compensar nav fija
- **IntersectionObserver:** Detecta qué semana/turno está en viewport → actualiza `mobNavActive` / `mobActiveTurno`
- **Pretemporada labels:** `turnoOffsets` calcula rango `T${tFirst}-${tLast}` por semana

---

## 15. Data Attributes HTML

| Attribute                                    | Usado en               | Propósito                                      |
| -------------------------------------------- | ---------------------- | ---------------------------------------------- |
| `data-grid-nav-ignore="true"`                | PlanillaTurno          | Skip en grid navigation                        |
| `data-sembrado-nav="true"`                   | EjCelda, CeldaSembrado | Include en sembrado tab sequence               |
| `data-role`                                  | EjCelda                | Rol: ejercicio, intensidad, tabla, remove, add |
| `data-semIdx`, `data-turnoIdx`, `data-ejIdx` | Sembrado elements      | Position indices                               |
| `data-picker-index`                          | ExercisePicker         | Position en lista de resultados                |
| `data-firstgroup`                            | ExercisePicker         | Primer ejercicio de una categoría              |
| `data-label`                                 | PDF table cells        | Label para pseudo-element mobile               |

---

## 16. Supabase Queries Summary

| Tabla                          | Operación                           | Dónde                                            |
| ------------------------------ | ----------------------------------- | ------------------------------------------------ |
| `atletas`                      | SELECT/UPSERT/DELETE                | CoachApp sync, PageAtletas, AtletaPanel          |
| `mesociclos`                   | SELECT/UPSERT/DELETE                | CoachApp sync, AtletaPanel                       |
| `plantillas`                   | SELECT/UPSERT/DELETE                | usePlantillas hook                               |
| `coach_settings`               | SELECT/UPSERT                       | PageNormativos, PageCalculadora, AtletaPanel     |
| `profiles`                     | SELECT                              | PageAtletas (registeredUsers), App (loadProfile) |
| `coach_shared_workspace`       | SELECT                              | resolveSharedCoachId                             |
| Auth endpoints                 | signIn/signUp/signOut/reset/refresh | LoginScreen, sb.auth                             |
| RPC `verify_coach_code`        | POST                                | LoginScreen (registro coach)                     |
| API `/api/notify-registration` | POST                                | LoginScreen (notifica admin)                     |

---

## 17. Bugs

| Estado       | Bug                                                                                                                                                                                                                                                                                                                                                                                                                   | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ v1.0.1    | Atleta no ve reps/kg — faltaba `restoreMesoOverrides()` en AtletaPanel                                                                                                                                                                                                                                                                                                                                                | Agregado en useEffect de carga                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ✅ v1.0.6    | Ejercicios con normativos overrides no renderizan en móvil                                                                                                                                                                                                                                                                                                                                                            | `restoreAtletaNormOverrides`, `atletaNormOvr` state, `useMemo` merge                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ✅ v1.0.7    | Ejercicios custom (ID > 144) sin overrides no renderizan en mobile                                                                                                                                                                                                                                                                                                                                                    | AtletaPanel escribe coachNormativos+coachTablas a localStorage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ⚠️ Pendiente | PanelReferencia hardcodea `TABLA_DEFAULT` (L30897) en vez de usar tablas del coach                                                                                                                                                                                                                                                                                                                                    | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ✅           | Franja superior transparente en iOS (safe-area notch/Dynamic Island)                                                                                                                                                                                                                                                                                                                                                  | `body::before` fijo con `background:var(--bg)` y `height:env(safe-area-inset-top)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ✅ v1.0.8    | Bottom nav PDF pegada al home indicator en iPhone                                                                                                                                                                                                                                                                                                                                                                     | `padding-bottom: calc(env(safe-area-inset-bottom) + 36px)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ✅ v1.0.9    | UX mobile atleta: navbar siempre visible ocupa espacio                                                                                                                                                                                                                                                                                                                                                                | Auto-hide tras 1s sin scroll, solo hideActions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ✅ v1.0.11   | Atleta pierde contexto de semana/turno cuando nav se oculta                                                                                                                                                                                                                                                                                                                                                           | `.mob-nav-indicator` pill flotante                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ✅ v1.3.2    | Escuela: Resumen muestra todo en 0 — `calcMetricas` usaba intensidades/sembrado                                                                                                                                                                                                                                                                                                                                       | Branch `_isEscuela` en PageResumen.calcMetricas: itera `ej.bloques` directamente                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ✅ v1.3.2    | Escuela: PDF muestra ejercicios vacíos y resumen con pct_volumen undefined                                                                                                                                                                                                                                                                                                                                            | `isEscuelaPdf` branch en metricas + `buildEscuelaRow` + sem header + tabla resumen                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ✅ v1.3.2    | Escuela: PDF timer `extractTimerExercises` usaba `buildEjercicioRow` (intensidades)                                                                                                                                                                                                                                                                                                                                   | Usa `buildEscuelaRow` para Escuela, despacha bloques correctamente                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ✅ v1.3.11   | UI: glassmorphism en `.pdf-mobile-nav` y `.mob-nav-indicator`                                                                                                                                                                                                                                                                                                                                                         | Reemplazado por fondo sólido `#0d1117`, sin backdrop-filter                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ✅ v1.3.11   | UI: IRM Summary Card números 28px + "kg" inline                                                                                                                                                                                                                                                                                                                                                                       | Reducido a 24px, "kg" separado con gap, tipografía DM Sans para unidad                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ✅ v1.3.11   | UI: card Resumen con borde azul prominente (competía visualmente con mesos)                                                                                                                                                                                                                                                                                                                                           | Cambiado a `border: 1px solid var(--border)` (secundario)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ✅ v1.3.11   | A11y: botones card sin `:focus-visible`                                                                                                                                                                                                                                                                                                                                                                               | Clases `.atleta-card-btn` / `.atleta-nav-btn` con ring doble                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ✅ v1.3.11   | A11y: `.pdf-footer` color `#aaa` sobre blanco (contrast 2.3:1)                                                                                                                                                                                                                                                                                                                                                        | Cambiado a `#767676` (contrast 4.6:1, pasa AA)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ✅ v1.3.11   | A11y: sin `prefers-reduced-motion` global guard                                                                                                                                                                                                                                                                                                                                                                       | Agregado en CSS global: reduce animation/transition a 0.01ms                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ✅ v1.4.0    | Feature: Calculadora soporta 5 tablas IRM (antes 3)                                                                                                                                                                                                                                                                                                                                                                   | tabla4/tabla5 en TABLA_DEFAULT, select dropdown, mobile toggle, keyboard 1-5, sub-tabs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ✅ v1.4.0    | Feature: Descripciones editables por tabla IRM                                                                                                                                                                                                                                                                                                                                                                        | `_descriptions{}` en objeto tablas, input editable bajo sub-tabs, se muestra en sub-tab label y modal testeo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ✅ v1.4.3    | Security: 3 inputs sin atributo `name` (browser warning autofill)                                                                                                                                                                                                                                                                                                                                                     | Agregados `name="fecha_override"` (~L18058), `name="irm_description"` (~L31062), `name="norm_search"` (~L35346)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ✅ v1.4.3    | Security: CSP enforcing + headers (COOP, CORP, X-DNS-Prefetch-Control)                                                                                                                                                                                                                                                                                                                                                | middleware.ts: Content-Security-Policy con directives estrictas, poweredByHeader off, reactStrictMode                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ✅ v1.4.3    | Security: notify-registration input validation + HTML escape                                                                                                                                                                                                                                                                                                                                                          | Regex email, tipo whitelist, max length, `escapeHtml()` en template HTML                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ✅ v1.4.3    | Security: supabase-proxy hardening                                                                                                                                                                                                                                                                                                                                                                                    | 512KB body limit, path traversal guard (bloquea `..` y `//`), sin detail en 504                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ✅ v1.4.4    | Cronómetro: al adelantar ejercicios con >> rápido, series se contaban mal (stale closure)                                                                                                                                                                                                                                                                                                                             | `SKIP_FORWARD`/`NEXT_EXERCISE`/`PREV_EXERCISE` ahora reciben `exerciseRounds[]` array; reducer computa `totalRounds` desde su propio estado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ✅ v1.4.4    | Cronómetro: overlay fijo sin `safe-area-inset-top` — contenido detrás del notch en iOS                                                                                                                                                                                                                                                                                                                                | Agregado `paddingTop: env(safe-area-inset-top, 0px)` al div overlay en AtletaPanel                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ✅ v1.4.5    | Cronómetro: pretemporada no extraía ejercicios — `extractTimerExercises` solo tenía branches para regular/escuela                                                                                                                                                                                                                                                                                                     | Agregado branch `isPretemp` que usa `buildPretemporadaRow` + filtra por `ejercicio_ids` (mismo patrón que `semTurnos`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ✅ v1.5.0    | Cronómetro multi-intensidad: no había descanso entre intensidades del mismo ejercicio, no mostraba preview del peso siguiente, ejercicios tratados como entradas independientes                                                                                                                                                                                                                                       | Nueva fase `intensityRest` (auto-rest entre intensidades, auto-avanza al terminar). `extractTimerExercises` ahora agrega metadata de agrupamiento (`baseId`, `baseName`, `intensityLabel`, `intensityIndex`, `totalIntensities`) cuando `row.cols.length > 1` en los 4 paths (pushCompRows, pretemporada, escuela, regular). Wheel carousel en `TabataExerciseInfo` muestra prev/current/next durante timer activo con banner "CARGÁ LA BARRA" durante `intensityRest`. Lista idle agrupa por `baseId` con header dorado. `TabataControls`/`TabataDisplay` actualizados para reconocer `intensityRest` como fase activa                                                                                                                                                               |
| ✅ v1.5.1    | Cronómetro: al completar ejercicio no se veía cuál era el siguiente hasta tocar "Siguiente", sin tiempo para preparar barra                                                                                                                                                                                                                                                                                           | Tarjeta preview "SIGUIENTE" con nombre, series×reps y kg visible durante `exerciseComplete` en `TabataTimer.tsx`. Card con borde gold + glow, flechas y label dorado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ✅ v1.5.2    | Cronómetro: preview card mostraba demasiada info (ID completo + nombre largo)                                                                                                                                                                                                                                                                                                                                         | Simplificado preview: solo ID numérico, nombre, y kg. Removido series×reps del preview para mantenerlo compact                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ✅ v1.5.3    | Cronómetro: botón "lista de ejercicios" ocupaba mucho espacio con texto, modal no agrupaba intensidades                                                                                                                                                                                                                                                                                                               | Botón list reducido a icon-only (`List` de lucide). Modal de ejercicios durante timer activo agrupa por `baseId` con header dorado, mismo patrón visual que lista idle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ✅ v1.5.4    | Cronómetro idle: lista de ejercicios era secundaria (abajo, maxHeight 280px), config dominaba la pantalla                                                                                                                                                                                                                                                                                                             | Lista de ejercicios ahora es contenido principal en idle (flex:1, scroll completo). Config panel compacto debajo. Ejercicios visibles de inmediato sin scroll. `TabataExerciseInfo` solo visible cuando timer está activo. Layout idle: ExerciseList → ConfigPanel → Controls                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ✅ v1.5.5    | Cronómetro: si el atleta deshabilitaba un ejercicio por error, no había forma clara de saberlo ni restaurarlo fácil                                                                                                                                                                                                                                                                                                   | Banner naranja arriba del PLAY: "N ejercicio(s) oculto(s)" con icono `EyeOff`. Debajo del PLAY: lista compacta de ejercicios ocultos (tap para restaurar individualmente) + botón "Restaurar todos". Nuevos helpers: `disabledExercises` memo, `restoreAll` callback                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ✅ v1.5.6    | Cronómetro idle: faltaban títulos explicativos de sección y el botón de sonido quedaba muy pegado al banner de ocultos                                                                                                                                                                                                                                                                                                | Títulos de sección: "Selecciona los ejercicios a quitar" (reemplaza "Ejercicios del turno") y "Configurar timers" (encima del panel de config). Mayor margin-top en banner de ocultos (12px) para separarlo del Sound toggle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ✅ v1.5.7    | Cronómetro: labels "Tiempo de trabajo" / "Tiempo de descanso" no centrados; sección "Ejercicios ocultos" muy pegada al botón PLAY                                                                                                                                                                                                                                                                                     | `textAlign: center` en `ConfigRow` label (TabataConfig.tsx). `margin-top: 16px` en el wrapper de la lista de ejercicios ocultos debajo del PLAY                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ✅ v1.6.0    | Feature: Cronómetro Tabata multi-bloque (standalone) — el timer standalone solo tenía un único set de work/rest/rounds, sin forma de encadenar distintas fases de entrenamiento                                                                                                                                                                                                                                       | Nuevo sistema de bloques: `TabataBlock` interface (`id/name/workTime/restTime/rounds`), nueva fase `blockRest` entre bloques, `TabataBlockConfig.tsx` (editor visual con stepper, reorder, duplicate, remove, max 10 bloques). `useTabataTimer` reescrito con block-mode: `blockConfig()` helper, `NEXT_BLOCK`/`PREV_BLOCK` actions, transiciones automáticas blockRest→countdown→nextBlock. `TabataDisplay` muestra indicador "BLOQUE N/M" + nombre del bloque. `TabataTimer` condiciona config panel: block editor cuando standalone, config panel original con ejercicios. Progress bar calcula across all blocks. Controls block-aware (prev/next block). Sonido blockRest = restStart. Config se persiste en localStorage incluyendo array de bloques. Modo ejercicio NO cambia. |
| ✅ v1.6.1    | Cronómetro multi-bloque mostraba abajo del editor de bloques los rows viejos "Tiempo de trabajo" y "Tiempo de descanso" (redundantes, ahora viven dentro de cada bloque)                                                                                                                                                                                                                                              | Nueva prop `showWorkRest?: boolean` (default true) en `TabataConfigPanel`. En `TabataTimer.tsx` block-mode se pasa `showWorkRest={false}` y `showRounds={false}` → solo queda visible el toggle de sonido debajo del editor de bloques                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ✅ v1.6.2    | Atletas se desvinculan solos del coach (profile_id se pierde de la DB). Causa: `onHide` seteaba `atletaSyncTimerRef.current = null` ANTES de llamar a `syncOverrides()`, entonces `syncOverrides` veía null y no hacía push. Si el coach vinculaba un atleta y cambiaba de tab/bloqueaba el celular antes del debounce de 2s, el push a DB no ocurría → próxima carga traía DB sin profile_id → atleta "desvinculado" | Fix: `onHide` ahora hace `clearTimeout()` sin setear refs a null → llama `syncOverrides()` → DESPUÉS setea refs a null. Mismo patrón que ya usaba `onBeforeUnload`
| ✅ v1.6.3    | Atleta Home: MesoCard mostraba badges (Competitivo/No competitivo, Activo) e IRM values (ARR/ENV kg) que son info de referencia del coach, confusa para el atleta | Simplificado MesoCard en AtletaPanel: eliminados badges de modo, badge "Activo" e IRM inline. Solo queda nombre del mesociclo + cantidad de semanas como descripción                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

---

## 18. Dependencias Implícitas

Funciones que leen localStorage **sin recibir** el dato como parámetro:

| Función                                    | Lee de localStorage      | Consecuencia si falta                                        |
| ------------------------------------------ | ------------------------ | ------------------------------------------------------------ |
| `getEjercicioById(id)` (sin 2do param)     | `liftplan_normativos`    | Ejercicios custom ID>144 no se encuentran → return undefined |
| `getGrupo(ejercicio_id)`                   | (via getEjercicioById)   | Retorna null → auto-calc reps falla → 0 reps                 |
| `calcSembradoSemana(sem)`                  | (via getGrupo)           | Conteo de grupos incorrecto                                  |
| `calcRepsEjercicio(sem, tIdx, meso)`       | (via calcSembradoSemana) | Distribución de reps incorrecta                              |
| `getSembradoStats(turnos)` (sin 2do param) | `liftplan_normativos`    | Stats incompletos para custom                                |

---

## 19. Factory Helpers

| Factory               | Línea | Retorna                               |
| --------------------- | ----- | ------------------------------------- |
| `mkId()`              | ~2151 | Random string ID                      |
| `mkTurnos()`          | ~2152 | 9 turnos × 3 ejercicios vacíos        |
| `mkSemanas()`         | ~2161 | 4 semanas con mkTurnos()              |
| `mkBloqueBasica()`    | ~2171 | `{pct, series, reps, kg, nota}` vacío |
| `mkEjBasica(n=3)`     | ~2175 | Ejercicio con n bloques               |
| `mkTurnosBasica(n=3)` | ~2185 | 3 turnos × 6 ejercicios para escuela  |
| `mkSemanasBasica()`   | ~2192 | Semanas para Escuela Inicial          |
| `mkEjPretemp(n=3)`    | ~2201 | Ejercicio con `ejercicio_ids[]` array |
| `mkTurnosPretemp()`   | ~2208 | Turnos para pretemporada              |
| `mkSemanasPretemp()`  | ~2215 | Semanas para pretemporada             |
| `mkBloqueComp()`      | ~8340 | Bloque complementario vacío           |

---

## 20. Cronómetro Tabata (Módulo Externo)

Componentes en `components/cronometro/`. NO están en el monolito — son TypeScript separado, importados dinámicamente.

### Archivos

| Archivo                         | Descripción                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `types.ts`                      | Interfaces: `TabataConfig` (+ `blocks: TabataBlock[]`), `TabataBlock` (`id/name/workTime/restTime/rounds`), `TabataExercise` (+ `baseId`, `baseName`, `intensityLabel`, `intensityIndex`, `totalIntensities`), `TimerPhase` (+ `intensityRest`, `blockRest`), `TimerState` (+ `currentBlockIndex`), `TimerAction` (+`NEXT_BLOCK`/`PREV_BLOCK`; TICK/SKIP_PHASE incluyen `blocks?`/`blockCount?`)                                                                                                                                                                                                                                                                                                                                                                   |
| `constants.ts`                  | `DEFAULT_CONFIG` (work:120, rest:90, rounds:8, countdown:5, blocks:[1 default block]), `createBlock()` factory (auto-increment ID), `STORAGE_KEY`, `TUTORIAL_SEEN_KEY`, `PHASE_COLORS` (8 fases incl. intensityRest: gold-dark, blockRest: cyan), `PHASE_LABELS` (blockRest: "SIGUIENTE BLOQUE"), `CAT_COLORS` (5 categorías), `MIN_TIME/MAX_TIME/MIN_ROUNDS/MAX_ROUNDS/TIME_STEP`                                                                                                                                                                                                                                                                                                                                                                                 |
| `hooks/useTabataTimer.ts`       | `useReducer` state machine: idle→countdown→work→rest→(repeat)→exerciseComplete/blockRest→finished. **Block mode** (standalone sin exercises): `blockConfig()` helper lee work/rest del bloque actual, `isBlockMode()` detecta standalone con blocks. Transiciones: work último round → `blockRest` si hay más bloques → countdown → next block work. `blocksRef`/`getBlockConfig()` en hook. Callbacks: start, pause, resume, reset, nextExercise, skipForward, prevExercise, **nextBlock**, **prevBlock**, skipPhase, restartPhase. `totalPhaseTime`: blockRest → countdownTime                                                                                                                                                                                   |
| `hooks/useWakeLock.ts`          | Screen Wake Lock API — mantiene pantalla encendida durante timer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `hooks/useTabataSound.ts`       | Web Audio API oscillator: `workStart()`, `restStart()`, `finished()`, `countdownTick()`, `countdownLast()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `TabataBlockConfig.tsx`         | **NEW** Editor visual de bloques (~400 líneas). Props: `blocks`, `onChange`. Sub-componentes: `InlineStepper` (+/- con hold), `BlockCard` (nombre editable, work/rest/rounds steppers, duplicate/remove/reorder, time estimate). MAX_BLOCKS=10. Botón "Agregar bloque". Muestra tiempo total estimado de todos los bloques. Inline styles con CSS vars                                                                                                                                                                                                                                                                                                                                                                                                             |
| `TabataDisplay.tsx`             | SVG circular progress ring (r=120, stroke=8). Props nuevas: `currentBlockIndex?`, `totalBlocks?`, `blockName?`. Indicador "BLOQUE N/M" + nombre del bloque encima del phase label. `blockRest` incluida en progress ring. Fase label Bebas Neue, tiempo centro, round info. Durante `blockRest` muestra "Preparate para el siguiente bloque"                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `TabataControls.tsx`            | Botones por fase. Running: ⏮⏯⏭↺ + "LISTO". **Confirmación doble toque** (`useConfirmAction` hook, 2s timeout, glow dorado) en ⏮/⏭/↺/LISTO. Play/Pause sin confirm                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `TabataConfig.tsx`              | ConfigRow con +/- para work/rest/rounds. Toggle sonido. Props: `showRounds?` (oculta rondas), `showWorkRest?` (oculta tiempo trabajo/descanso — usado en block-mode para evitar duplicar config que ya vive por bloque)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `TabataExerciseInfo.tsx`        | **Wheel carousel** para multi-intensidad: `IntensityMiniCard` (done/upcoming variants), `IntensitySteps` (pill dots). Dos modos: grouped (prev/current/next cards con gold glow durante intensityRest + banner "CARGÁ LA BARRA" con peso siguiente) y single (card original). Props: `prevGroupExercise`, `nextGroupExercise`, `groupIndex`, `totalGroups`, `phase`. Counter label usa groupIndex/totalGroups cuando disponible                                                                                                                                                                                                                                                                                                                                    |
| `TabataTimer.tsx` (orquestador) | Props: `exercises?`, `turnoInfo?`, `onBack`. States: config, disabledIds (Set), showListModal, showTutorial, showExitModal, dontShowAgain. **Block mode**: `isBlockMode` flag (standalone + blocks), destructura `currentBlockIndex` del timer, condiciona config panel: `TabataBlockConfig` (standalone) vs `TabataConfigPanel` (exercises). `overallProgress` calcula across all blocks (totalRoundsAll). Controls: `canPrev`/`canNext` block-aware, `onPrev` → `prevBlock` en block mode. Display: pasa `currentBlockIndex`/`totalBlocks`/`blockName`. Sound: `blockRest` dispara `restStart()` + `countdownTick()`. `groupInfo` useMemo, `exerciseGroups` useMemo. **Exercise toggle** on/off. **List modal** bottom-sheet. **Tutorial modal**. **Exit modal** |

### Integración con coach-app.jsx

- `extractTimerExercises(semIdx, tIdx)` (~L23130): extrae ejercicios del turno para el cronómetro
  - `pushCompRows(comps, prefix)`: usa `buildComplementarioRow` para extraer nombre/kg/reps/series de cada columna. **Multi-intensidad:** si `row.cols.length > 1`, agrega `baseId`, `baseName`, `intensityLabel`, `intensityIndex`, `totalIntensities`
  - Tres branches: `isPretemp` → `buildPretemporadaRow`, `isEscuelaPdf` → `buildEscuelaRow`, else → `buildEjercicioRow`. Los 3 + pushCompRows agregan metadata multi-intensidad cuando `hasMulti`
  - Cada `TabataExercise`: `{id, name, category, kg, reps, series, notes?, baseId?, baseName?, intensityLabel?, intensityIndex?, totalIntensities?}`
- `cronometroExercises` / `cronometroTurnoInfo` states en AtletaPanel (~L34265)
- Botón "ENTRENAR" en turno header de PagePDF pasa `{semana, turno, dia, momento}`
- Overlay renderiza `<TabataTimer>` con props
- Standalone mode: `atletaView==="cronometro"` sin exercises ni turnoInfo

### Paleta Hard-Coded (NO usa CSS vars)

`#0a0c10` bg, `#0d1117` card, `#12151c` surface, `#1e2733` borders, `#0f1520` data rows, `#1a1a2e` badges, `#1a1f2a` buttons, `#d4a832` gold, `#47e8a0` green, `#e8c547` gold accent, `#e87447` orange, `#8a95a8` muted, `#6b7590` secondary muted, `#e8eaf0` text

### localStorage Keys

| Key                                 | Uso                            |
| ----------------------------------- | ------------------------------ |
| `liftplan_cronometro_config`        | Configuración timer (JSON)     |
| `liftplan_cronometro_tutorial_seen` | "1" si tutorial ya fue cerrado |
