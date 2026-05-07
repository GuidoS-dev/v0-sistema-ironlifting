import { useState, useEffect, useRef, useCallback } from "react";
import { Briefcase, Copy, Library, LogOut, Send, Shield, User, X } from "lucide-react";
import { TabataTimer } from "../../../../components/cronometro";
import { sb } from "../../lib/supabase-client";
import { _visResume, broadcastDbWrite, markDbSync } from "../../lib/sync";
import { readLocalJson, asPlainObject } from "../../lib/storage";
import { COACH_SETTING_KEYS, saveCoachSetting, resolveSharedCoachId } from "../../lib/coach-settings";
import { atletaToDb, atletaFromDb, mesoToDb, mesoFromDb, plantillaToDb } from "../../lib/mappers";
import { buildMesoOverridesPayload, restoreMesoOverrides, restoreAtletaPctOverrides, restoreAtletaNormOverrides } from "../../lib/overrides";
import { BACKUP_INTERVAL_MS, BACKUP_PROMPTED_KEY, downloadBackup, getLastDbSync } from "../../lib/backup";
import { usePlantillas } from "../../hooks/usePlantillas";
import { LogoHorizontal } from "../common/Logos";
import { PanelReferencia } from "./PanelReferencia";
import { PageAtletas } from "../atletas/PageAtletas";
import { PageAtleta } from "../atletas/PageAtleta";
import { PageNormativos } from "../normativos/PageNormativos";
import { PageCalculadora } from "../calculadora/PageCalculadora";
import { PagePlantillas } from "../plantillas/PagePlantillas";
import { PagePlantilla } from "../plantillas/PagePlantilla";

export function CoachApp({ session, profile, onLogout }) {
  // ── Clear dynamic tabs on new browser session (prevents accumulation) ──
  // sessionStorage survives refreshes but is cleared when the browser closes,
  // so tabs only reset on a truly new session.
  if (
    typeof window !== "undefined" &&
    !sessionStorage.getItem("ironlifting_session")
  ) {
    sessionStorage.setItem("ironlifting_session", "1");
    localStorage.removeItem("liftplan_atletas_tabs");
    localStorage.removeItem("liftplan_plantillas_tabs");
  }

  // tab puede ser: "atletas" | "normativos" | "calculadora" | "atleta:ID"
  const [tab, setTab] = useState("atletas");
  const [refPanel, setRefPanel] = useState(false);
  const [refPanelWidth, setRefPanelWidth] = useState(420);
  const [liveMesoData, setLiveMesoData] = useState({});
  const onLiveMesoDataCb = useCallback(
    (d) => setLiveMesoData((prev) => ({ ...prev, [d.atletaId]: d })),
    [],
  );

  const [atletas, setAtletasRaw] = useState(() =>
    load("liftplan_atletas", [
      {
        id: "demo1",
        nombre: "Joana Palacios",
        email: "joana@halterofilia.com",
        telefono: "5493413666737",
        fecha_nacimiento: "1998-05-12",
        notas: "",
        tipo: "atleta",
      },
    ]),
  );
  const [mesociclos, setMesociclosRaw] = useState(() => {
    const raw = load("liftplan_mesociclos", []);
    // Strip any nulls left by old drag code
    return raw.map((m) =>
      m
        ? {
            ...m,
            semanas: (m.semanas || []).map((s) =>
              s
                ? {
                    ...s,
                    turnos: (s.turnos || []).map((t) =>
                      t
                        ? {
                            ...t,
                            ejercicios: (t.ejercicios || []).filter(Boolean),
                            // Migración: inicializar complementarios si no existen
                            complementarios_before:
                              t.complementarios_before || [],
                            complementarios_after:
                              t.complementarios_after || [],
                          }
                        : t,
                    ),
                  }
                : s,
            ),
          }
        : m,
    );
  });
  const [atletasTabs, setAtletasTabsRaw] = useState(() =>
    load("liftplan_atletas_tabs", []),
  );
  const [atletaOpenRequest, setAtletaOpenRequest] = useState({});
  const [plantillasTabs, setPlantillasTabsRaw] = useState(() =>
    load("liftplan_plantillas_tabs", []),
  );
  const authCoachId = session?.user?.id || null;
  const [coachId, setCoachId] = useState(null);
  useEffect(() => {
    let cancelled = false;
    if (!authCoachId) {
      setCoachId(null);
      return;
    }

    (async () => {
      const resolved = await resolveSharedCoachId(authCoachId);
      if (!cancelled) setCoachId(resolved || authCoachId);
    })();

    return () => {
      cancelled = true;
    };
  }, [authCoachId]);

  const {
    plantillas,
    add: addPlantillaRaw,
    update: updatePlantilla,
    remove: removePlantilla,
    flushSync: flushPlantillaSync,
  } = usePlantillas(coachId);
  const mesoOverrideSyncTimersRef = useRef(new Map());
  const atletaOverrideSyncTimersRef = useRef(new Map());
  const atletaSyncTimerRef = useRef(null);
  const mesoSyncTimerRef = useRef(null);

  // ── Refs para sincronización con DB ────────────────────────────────────────
  const prevAtletasRef = useRef(null); // null = DB aún no inicializada
  const prevMesociclosRef = useRef(null);
  const atletasRef = useRef(atletas);
  const mesociclosRef = useRef(mesociclos);
  // IDs pendientes de borrado en DB (evita que pull restaure items eliminados)
  const pendingDeleteAtletaIdsRef = useRef(new Set());
  const pendingDeleteMesoIdsRef = useRef(new Set());
  useEffect(() => {
    atletasRef.current = atletas;
  }, [atletas]);
  useEffect(() => {
    mesociclosRef.current = mesociclos;
  }, [mesociclos]);

  const queueMesoOverrideSync = useCallback(
    (liveData) => {
      if (!coachId || !liveData?.meso?.id) return;
      const mesoId = liveData.meso.id;
      const pending = mesoOverrideSyncTimersRef.current.get(mesoId);
      if (pending) clearTimeout(pending);

      const timer = setTimeout(async () => {
        mesoOverrideSyncTimersRef.current.delete(mesoId);
        const currentMeso =
          mesociclosRef.current.find((item) => item.id === mesoId) ||
          liveData.meso;
        if (!currentMeso) return;

        const payload = mesoToDb(currentMeso, coachId, {
          overrides: buildMesoOverridesPayload(currentMeso, liveData),
        });
        const { error } = await sb.from("mesociclos").upsert([payload], {
          onConflict: "app_id",
        });
        if (error) console.warn("DB sync mesociclo overrides failed:", error);
      }, 800);

      mesoOverrideSyncTimersRef.current.set(mesoId, timer);
    },
    [coachId],
  );

  const queueAtletaOverrideSync = useCallback(
    (atletaId, overrides) => {
      if (!coachId || !atletaId) return;
      const pending = atletaOverrideSyncTimersRef.current.get(atletaId);
      if (pending) clearTimeout(pending);

      const timer = setTimeout(async () => {
        atletaOverrideSyncTimersRef.current.delete(atletaId);
        const currentAtleta = atletasRef.current.find(
          (item) => item.id === atletaId,
        );
        if (!currentAtleta) return;

        const payload = atletaToDb(currentAtleta, coachId, {
          normativosOverrides: asPlainObject(overrides),
        });
        const { error } = await sb.from("atletas").upsert([payload], {
          onConflict: "app_id",
        });
        if (error) console.warn("DB sync atleta overrides failed:", error);
      }, 800);

      atletaOverrideSyncTimersRef.current.set(atletaId, timer);
    },
    [coachId],
  );

  const prevLiveMesoDataRef = useRef({});
  useEffect(() => {
    // Solo sincronizar mesos que realmente cambiaron, no todos
    const prev = prevLiveMesoDataRef.current;
    Object.entries(liveMesoData).forEach(([key, val]) => {
      if (prev[key] !== val) {
        queueMesoOverrideSync(val);
      }
    });
    prevLiveMesoDataRef.current = liveMesoData;
  }, [liveMesoData, queueMesoOverrideSync]);

  useEffect(() => {
    return () => {
      mesoOverrideSyncTimersRef.current.forEach((timer) => clearTimeout(timer));
      atletaOverrideSyncTimersRef.current.forEach((timer) =>
        clearTimeout(timer),
      );
      mesoOverrideSyncTimersRef.current.clear();
      atletaOverrideSyncTimersRef.current.clear();
    };
  }, []);

  // ── Backspace siempre borra el último dígito en inputs numéricos ───────────
  useEffect(() => {
    function handleNumericBackspace(e) {
      if (e.key !== "Backspace") return;
      const el = e.target;
      if (el.tagName !== "INPUT" || el.type !== "number") return;
      e.preventDefault();
      const cur = el.value;
      if (cur.length === 0) return;
      const next = cur.slice(0, -1);
      // Disparar evento nativo para que React detecte el cambio
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      ).set;
      nativeInputValueSetter.call(el, next);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    document.addEventListener("keydown", handleNumericBackspace);
    return () =>
      document.removeEventListener("keydown", handleNumericBackspace);
  }, []);

  // ── Carga inicial desde Supabase ───────────────────────────────────────────
  useEffect(() => {
    if (!coachId) return;
    (async () => {
      try {
        // Atletas — filtra solo los que tienen app_id (creados por esta app)
        const { data: dbAtletas, error: e1 } = await sb
          .from("atletas")
          .select("*")
          .eq("coach_id", coachId)
          .exec();
        if (!e1 && dbAtletas) {
          const appAtletas = dbAtletas.filter((r) => r.app_id);
          if (appAtletas.length > 0) {
            appAtletas.forEach((r) => {
              restoreAtletaPctOverrides(r.app_id, r.pct_overrides);
              restoreAtletaNormOverrides(r.app_id, r.normativos_overrides);
            });
            const loaded = appAtletas.map(atletaFromDb);
            setAtletasRaw(loaded);
            save("liftplan_atletas", loaded);
            prevAtletasRef.current = loaded;
          } else {
            // DB vacía — migrar localStorage → DB
            const local = load("liftplan_atletas", []);
            if (local.length > 0) {
              await sb.from("atletas").upsert(
                local.map((a) => atletaToDb(a, coachId)),
                { onConflict: "app_id" },
              );
            }
            prevAtletasRef.current = atletasRef.current;
          }
        }

        // Mesociclos — filtra solo los que tienen app_id
        const { data: dbMesos, error: e2 } = await sb
          .from("mesociclos")
          .select("*")
          .eq("coach_id", coachId)
          .exec();
        if (!e2 && dbMesos) {
          const appMesos = dbMesos.filter((r) => r.app_id);
          if (appMesos.length > 0) {
            appMesos.forEach((r) =>
              restoreMesoOverrides(r.app_id, r.overrides),
            );
            const loaded = appMesos.map(mesoFromDb);
            const cleaned = loaded.map((m) =>
              m
                ? {
                    ...m,
                    semanas: (m.semanas || []).map((s) =>
                      s
                        ? {
                            ...s,
                            turnos: (s.turnos || []).map((t) =>
                              t
                                ? {
                                    ...t,
                                    ejercicios: (t.ejercicios || []).filter(
                                      Boolean,
                                    ),
                                  }
                                : t,
                            ),
                          }
                        : s,
                    ),
                  }
                : m,
            );
            setMesociclosRaw(cleaned);
            save("liftplan_mesociclos", cleaned);
            prevMesociclosRef.current = cleaned;
          } else {
            const local = load("liftplan_mesociclos", []);
            if (local.length > 0) {
              const { error: emig } = await sb.from("mesociclos").upsert(
                local.map((m) => mesoToDb(m, coachId)),
                { onConflict: "app_id" },
              );
              if (emig) console.warn("DB migrate mesociclos failed:", emig);
            }
            prevMesociclosRef.current = mesociclosRef.current;
          }
        }
      } catch (e) {
        console.warn("DB load failed, usando localStorage:", e);
      } finally {
        if (prevAtletasRef.current === null)
          prevAtletasRef.current = atletasRef.current;
        if (prevMesociclosRef.current === null)
          prevMesociclosRef.current = mesociclosRef.current;
        // Registrar sync exitoso con DB
        markDbSync();
      }
    })();
  }, [coachId]);

  // ── Pull remoto de atletas (incluye overrides normativos) ─────────────────
  const lastPullAtletasRef = useRef(0);
  const lastPullMesosRef = useRef(0);
  const lastSyncTsAtletasRef = useRef(null); // ISO timestamp for delta sync
  const lastSyncTsMesosRef = useRef(null);
  const PULL_THROTTLE_MS = 5000; // mínimo 5s entre pulls
  useEffect(() => {
    if (!coachId) return;
    let cancelled = false;

    const pullAtletas = async () => {
      const now = Date.now();
      if (now - lastPullAtletasRef.current < PULL_THROTTLE_MS) return;
      lastPullAtletasRef.current = now;
      const q = sb.from("atletas").select("*").eq("coach_id", coachId);
      // Delta sync: solo traer filas modificadas desde último pull exitoso
      if (lastSyncTsAtletasRef.current) {
        q.gt("updated_at", lastSyncTsAtletasRef.current);
      }
      const { data, error } = await q.exec();
      if (cancelled || error || !data) return;

      const appAtletas = data.filter((r) => r.app_id);
      // Registrar timestamp ANTES de mergear (usar max updated_at de esta respuesta)
      if (data.length > 0) {
        const maxTs = data.reduce((max, r) => {
          return r.updated_at && r.updated_at > max ? r.updated_at : max;
        }, lastSyncTsAtletasRef.current || "");
        if (maxTs) lastSyncTsAtletasRef.current = maxTs;
      } else if (!lastSyncTsAtletasRef.current) {
        // Primer pull vacío — marcar como synced
        lastSyncTsAtletasRef.current = new Date().toISOString();
      }
      if (appAtletas.length === 0) return;

      markDbSync();

      const loaded = appAtletas.map(atletaFromDb);
      setAtletasRaw((prev) => {
        const pendingDel = pendingDeleteAtletaIdsRef.current;
        // LWW: solo actualizar items donde DB es más reciente que local
        const merged = loaded
          .filter((dbItem) => !pendingDel.has(dbItem.id)) // skip pending deletes
          .map((dbItem) => {
            const local = prev.find((p) => p.id === dbItem.id);
            if (!local) {
              // Nuevo en DB — restaurar overrides
              const raw = appAtletas.find((r) => r.app_id === dbItem.id);
              if (raw) {
                restoreAtletaPctOverrides(raw.app_id, raw.pct_overrides);
                restoreAtletaNormOverrides(
                  raw.app_id,
                  raw.normativos_overrides,
                );
              }
              return dbItem;
            }
            const dbTs = dbItem._updated_at
              ? new Date(dbItem._updated_at).getTime()
              : 0;
            const localTs = local._updated_at
              ? new Date(local._updated_at).getTime()
              : 0;
            // LWW: empate (dbTs === localTs) gana local — evita que un pull
            // que trae nuestra propia escritura pise overrides editados después
            // del push sin haber bumpeado _updated_at del meso.
            if (dbTs > localTs) {
              // DB gana — restaurar overrides de DB
              const raw = appAtletas.find((r) => r.app_id === dbItem.id);
              if (raw) {
                restoreAtletaPctOverrides(raw.app_id, raw.pct_overrides);
                restoreAtletaNormOverrides(
                  raw.app_id,
                  raw.normativos_overrides,
                );
              }
              return dbItem;
            }
            // Local gana — mantener overrides locales
            return local;
          });
        // agregar items locales que aún no están en DB
        prev.forEach((localItem) => {
          if (
            !pendingDel.has(localItem.id) &&
            !merged.find((m) => m.id === localItem.id)
          )
            merged.push(localItem);
        });
        if (JSON.stringify(prev) === JSON.stringify(merged)) return prev;
        save("liftplan_atletas", merged);
        prevAtletasRef.current = merged;
        return merged;
      });
    };

    pullAtletas();
    const unsub = _visResume.sub(() => pullAtletas());
    const onBc = (e) => {
      if (e.data?.type === "atletas" || e.data?.type === "all") pullAtletas();
    };

    _bc?.addEventListener("message", onBc);
    return () => {
      cancelled = true;
      unsub();
      _bc?.removeEventListener("message", onBc);
    };
  }, [coachId]);

  // ── Pull remoto de mesociclos (LWW) ───────────────────────────────────────
  useEffect(() => {
    if (!coachId) return;
    let cancelled = false;

    const pullMesociclos = async () => {
      const now = Date.now();
      if (now - lastPullMesosRef.current < PULL_THROTTLE_MS) return;
      lastPullMesosRef.current = now;
      const q = sb.from("mesociclos").select("*").eq("coach_id", coachId);
      // Delta sync: solo traer filas modificadas desde último pull exitoso
      if (lastSyncTsMesosRef.current) {
        q.gt("updated_at", lastSyncTsMesosRef.current);
      }
      const { data, error } = await q.exec();
      if (cancelled || error || !data) return;

      const appMesos = data.filter((r) => r.app_id);
      // Registrar timestamp
      if (data.length > 0) {
        const maxTs = data.reduce((max, r) => {
          return r.updated_at && r.updated_at > max ? r.updated_at : max;
        }, lastSyncTsMesosRef.current || "");
        if (maxTs) lastSyncTsMesosRef.current = maxTs;
      } else if (!lastSyncTsMesosRef.current) {
        lastSyncTsMesosRef.current = new Date().toISOString();
      }
      if (appMesos.length === 0) return;

      markDbSync();

      const loaded = appMesos.map(mesoFromDb);
      setMesociclosRaw((prev) => {
        const pendingDel = pendingDeleteMesoIdsRef.current;
        // LWW: solo actualizar items donde DB es más reciente que local
        const merged = loaded
          .filter((dbItem) => !pendingDel.has(dbItem.id)) // skip pending deletes
          .map((dbItem) => {
            const local = prev.find((p) => p.id === dbItem.id);
            if (!local) {
              // Nuevo en DB — restaurar overrides
              const raw = appMesos.find((r) => r.app_id === dbItem.id);
              if (raw) restoreMesoOverrides(raw.app_id, raw.overrides);
              return dbItem;
            }
            const dbTs = dbItem._updated_at
              ? new Date(dbItem._updated_at).getTime()
              : 0;
            const localTs = local._updated_at
              ? new Date(local._updated_at).getTime()
              : 0;
            // LWW: empate gana local — ver nota en pullAtletas.
            if (dbTs > localTs) {
              // DB gana — restaurar overrides de DB
              const raw = appMesos.find((r) => r.app_id === dbItem.id);
              if (raw) restoreMesoOverrides(raw.app_id, raw.overrides);
              return dbItem;
            }
            // Local gana — mantener overrides locales
            return local;
          });
        prev.forEach((localItem) => {
          if (
            !pendingDel.has(localItem.id) &&
            !merged.find((m) => m.id === localItem.id)
          )
            merged.push(localItem);
        });
        if (JSON.stringify(prev) === JSON.stringify(merged)) return prev;
        save("liftplan_mesociclos", merged);
        prevMesociclosRef.current = merged;
        return merged;
      });
    };

    pullMesociclos();
    const unsub = _visResume.sub(() => pullMesociclos());
    const onBc = (e) => {
      if (e.data?.type === "mesociclos" || e.data?.type === "all")
        pullMesociclos();
    };

    _bc?.addEventListener("message", onBc);
    return () => {
      cancelled = true;
      unsub();
      _bc?.removeEventListener("message", onBc);
    };
  }, [coachId]);

  // ── Sincronizar atletas con DB cuando cambian (debounce 2s) ───────────
  useEffect(() => {
    if (!coachId || prevAtletasRef.current === null) return;
    const curr = atletas;
    const prev = prevAtletasRef.current;

    // Detectar borrados INMEDIATAMENTE (sin debounce) y ejecutar ya
    const deletedIds = prev
      .filter((p) => !curr.find((a) => a.id === p.id))
      .map((p) => p.id);
    if (deletedIds.length > 0) {
      deletedIds.forEach((id) => pendingDeleteAtletaIdsRef.current.add(id));
      // Borrar de DB inmediatamente (sin esperar debounce)
      for (const id of deletedIds) {
        sb.from("atletas")
          .eq("app_id", id)
          .delete()
          .then((res) => {
            if (res?.error) {
              console.warn(
                "DELETE atleta failed, keeping pending:",
                id,
                res.error,
              );
            } else {
              pendingDeleteAtletaIdsRef.current.delete(id);
            }
          })
          .catch((e) => console.warn("DELETE atleta exception:", id, e));
      }
      prevAtletasRef.current = curr;
    }

    if (atletaSyncTimerRef.current) clearTimeout(atletaSyncTimerRef.current);
    atletaSyncTimerRef.current = setTimeout(async () => {
      atletaSyncTimerRef.current = null;
      const prev2 = prevAtletasRef.current;
      prevAtletasRef.current = curr;

      const toUpsert = curr.filter((a) => {
        const old = prev2.find((p) => p.id === a.id);
        return !old || JSON.stringify(old) !== JSON.stringify(a);
      });
      if (toUpsert.length === 0) return;

      // _updated_at ya fue estampado por setAtletas() wrapper — no re-estampar
      // para evitar loop infinito (re-stamp → state change → re-trigger)

      await sb
        .from("atletas")
        .upsert(
          toUpsert.map((a) => atletaToDb(a, coachId)),
          { onConflict: "app_id" },
        )
        .catch((e) => console.warn("DB sync atletas failed:", e));
      broadcastDbWrite("atletas");
    }, 2000);
  }, [atletas]);

  // ── Sincronizar mesociclos con DB cuando cambian (debounce 2s) ──────────
  useEffect(() => {
    if (!coachId || prevMesociclosRef.current === null) return;
    const curr = mesociclos;
    const prev = prevMesociclosRef.current;

    // Detectar borrados INMEDIATAMENTE (sin debounce) y ejecutar ya
    const deletedIds = prev
      .filter((p) => !curr.find((m) => m.id === p.id))
      .map((p) => p.id);
    if (deletedIds.length > 0) {
      deletedIds.forEach((id) => pendingDeleteMesoIdsRef.current.add(id));
      for (const id of deletedIds) {
        sb.from("mesociclos")
          .eq("app_id", id)
          .delete()
          .then((res) => {
            if (res?.error) {
              console.warn(
                "DELETE mesociclo failed, keeping pending:",
                id,
                res.error,
              );
            } else {
              pendingDeleteMesoIdsRef.current.delete(id);
            }
          })
          .catch((e) => console.warn("DELETE mesociclo exception:", id, e));
      }
      prevMesociclosRef.current = curr;
    }

    if (mesoSyncTimerRef.current) clearTimeout(mesoSyncTimerRef.current);
    mesoSyncTimerRef.current = setTimeout(async () => {
      mesoSyncTimerRef.current = null;
      const prev2 = prevMesociclosRef.current;
      prevMesociclosRef.current = curr;

      const toUpsert = curr.filter((m) => {
        const old = prev2.find((p) => p.id === m.id);
        return !old || JSON.stringify(old) !== JSON.stringify(m);
      });
      if (toUpsert.length === 0) return;

      await sb
        .from("mesociclos")
        .upsert(
          toUpsert.map((m) => mesoToDb(m, coachId)),
          { onConflict: "app_id" },
        )
        .catch((e) => console.warn("DB sync mesociclos failed:", e));
      broadcastDbWrite("mesociclos");
    }, 2000);
  }, [mesociclos, coachId]);

  // ── Sincronizar overrides al ocultar/cerrar (sin polling periódico) ───────
  useEffect(() => {
    if (!coachId) return;
    const flushPendingDeletes = () => {
      // Ejecutar borrados pendientes que no se enviaron aún a DB
      const prevAtletas = prevAtletasRef.current || [];
      const currAtletas = atletasRef.current;
      const deletedAtletaIds = prevAtletas
        .filter((p) => !currAtletas.find((a) => a.id === p.id))
        .map((p) => p.id);
      for (const id of deletedAtletaIds) {
        pendingDeleteAtletaIdsRef.current.add(id);
        sb.from("atletas")
          .eq("app_id", id)
          .delete()
          .then((res) => {
            if (res?.error)
              console.warn("flush DELETE atleta failed:", id, res.error);
          })
          .catch((e) => console.warn("flush DELETE atleta exception:", id, e));
      }
      prevAtletasRef.current = currAtletas;

      const prevMesos = prevMesociclosRef.current || [];
      const currMesos = mesociclosRef.current;
      const deletedMesoIds = prevMesos
        .filter((p) => !currMesos.find((m) => m.id === p.id))
        .map((p) => p.id);
      for (const id of deletedMesoIds) {
        pendingDeleteMesoIdsRef.current.add(id);
        sb.from("mesociclos")
          .eq("app_id", id)
          .delete()
          .then((res) => {
            if (res?.error)
              console.warn("flush DELETE meso failed:", id, res.error);
          })
          .catch((e) => console.warn("flush DELETE meso exception:", id, e));
      }
      prevMesociclosRef.current = currMesos;
    };

    const syncOverrides = (useKeepalive = false) => {
      if (prevMesociclosRef.current === null) return;
      flushPendingDeletes();
      // Solo sincronizar si hay timers pendientes (cambios no guardados)
      const hadPendingMesos = mesoSyncTimerRef.current !== null;
      const hadPendingAtletas = atletaSyncTimerRef.current !== null;
      if (hadPendingMesos) {
        const curr = mesociclosRef.current;
        if (curr.length > 0) {
          sb.from("mesociclos")
            .upsert(
              curr.map((m) => mesoToDb(m, coachId)),
              { onConflict: "app_id" },
            )
            .catch(() => {});
        }
      }
      if (hadPendingAtletas) {
        const currAtletas = atletasRef.current;
        if (currAtletas.length > 0) {
          sb.from("atletas")
            .upsert(
              currAtletas.map((a) => atletaToDb(a, coachId)),
              { onConflict: "app_id" },
            )
            .catch(() => {});
        }
      }
      // Flush de timers de OVERRIDES (800ms) — los de celdas/sembrado, que
      // son los que más frecuentemente se pierden al ocultar/cerrar pestaña.
      const pendingMesoOvrIds = Array.from(
        mesoOverrideSyncTimersRef.current.keys(),
      );
      if (pendingMesoOvrIds.length > 0) {
        mesoOverrideSyncTimersRef.current.forEach((t) => clearTimeout(t));
        mesoOverrideSyncTimersRef.current.clear();
        const mesosToFlush = mesociclosRef.current.filter((m) =>
          pendingMesoOvrIds.includes(m.id),
        );
        if (mesosToFlush.length > 0) {
          sb.from("mesociclos")
            .upsert(
              mesosToFlush.map((m) => mesoToDb(m, coachId)),
              { onConflict: "app_id" },
            )
            .catch(() => {});
        }
      }
      const pendingAtletaOvrIds = Array.from(
        atletaOverrideSyncTimersRef.current.keys(),
      );
      if (pendingAtletaOvrIds.length > 0) {
        atletaOverrideSyncTimersRef.current.forEach((t) => clearTimeout(t));
        atletaOverrideSyncTimersRef.current.clear();
        const atletasToFlush = atletasRef.current.filter((a) =>
          pendingAtletaOvrIds.includes(a.id),
        );
        if (atletasToFlush.length > 0) {
          sb.from("atletas")
            .upsert(
              atletasToFlush.map((a) => atletaToDb(a, coachId)),
              { onConflict: "app_id" },
            )
            .catch(() => {});
        }
      }
      // Flush pending plantilla timers
      flushPlantillaSync();
    };

    const onHide = () => {
      if (document.visibilityState === "hidden") {
        // Cancel debounce timers but keep refs non-null so syncOverrides
        // knows there were pending changes and flushes them to DB.
        if (atletaSyncTimerRef.current)
          clearTimeout(atletaSyncTimerRef.current);
        if (mesoSyncTimerRef.current) clearTimeout(mesoSyncTimerRef.current);
        syncOverrides();
        // Safe to clear refs AFTER syncOverrides has checked them
        atletaSyncTimerRef.current = null;
        mesoSyncTimerRef.current = null;
      }
    };

    const onBeforeUnload = () => {
      if (atletaSyncTimerRef.current) clearTimeout(atletaSyncTimerRef.current);
      if (mesoSyncTimerRef.current) clearTimeout(mesoSyncTimerRef.current);
      syncOverrides(true);
    };

    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [coachId, flushPlantillaSync]);

  // Wrappers que persisten automáticamente
  const setAtletas = (val) => {
    setAtletasRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      // Stamp _updated_at on changed items so LWW keeps local edits
      const now = new Date().toISOString();
      const stamped = next.map((a) => {
        const old = prev.find((p) => p.id === a.id);
        if (!old || JSON.stringify(old) !== JSON.stringify(a)) {
          return { ...a, _updated_at: now };
        }
        return a;
      });
      save("liftplan_atletas", stamped);
      return stamped;
    });
  };
  const setMesociclos = (val) => {
    setMesociclosRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      // Stamp _updated_at on changed items so LWW keeps local edits
      // until the debounce sync pushes to DB
      const now = new Date().toISOString();
      const stamped = next.map((m) => {
        const old = prev.find((p) => p.id === m.id);
        if (!old || JSON.stringify(old) !== JSON.stringify(m)) {
          return { ...m, _updated_at: now };
        }
        return m;
      });
      save("liftplan_mesociclos", stamped);
      return stamped;
    });
  };
  const setAtletasTabs = (val) => {
    setAtletasTabsRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      save("liftplan_atletas_tabs", next);
      return next;
    });
  };
  const setPlantillasTabs = (val) => {
    setPlantillasTabsRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      save("liftplan_plantillas_tabs", next);
      return next;
    });
  };
  // addPlantilla: saves + opens tab
  const addPlantilla = (p) => {
    const saved = addPlantillaRaw(p);
    abrirPlantilla(saved || p);
  };

  // setAtletas con soporte de función (para los casos que usan prev =>)
  const setAtletasFn = (val) => {
    setAtletasRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      const now = new Date().toISOString();
      const stamped = next.map((a) => {
        const old = prev.find((p) => p.id === a.id);
        if (!old || JSON.stringify(old) !== JSON.stringify(a)) {
          return { ...a, _updated_at: now };
        }
        return a;
      });
      save("liftplan_atletas", stamped);
      return stamped;
    });
  };

  const abrirAtleta = (a, opts = {}) => {
    const view = opts.view || "meso";
    setAtletaOpenRequest((prev) => ({
      ...prev,
      [a.id]: {
        view,
        mesoId: opts.mesoId || null,
        openNewMeso: !!opts.openNewMeso,
        tick: (prev[a.id]?.tick || 0) + 1,
      },
    }));
    if (!atletasTabs.includes(a.id)) {
      setAtletasTabs((prev) => [...prev, a.id]);
    }
    setTab(`atleta:${a.id}`);
  };

  const cerrarAtleta = (id, e) => {
    e.stopPropagation();
    setAtletasTabs((prev) => prev.filter((x) => x !== id));
    if (tab === `atleta:${id}`) setTab("atletas");
  };

  const abrirPlantilla = (p) => {
    if (!plantillasTabs.includes(p.id)) {
      setPlantillasTabs((prev) => [...prev, p.id]);
    }
    setTab(`plantilla:${p.id}`);
  };
  const cerrarPlantilla = (id, e) => {
    e && e.stopPropagation && e.stopPropagation();
    setPlantillasTabs((prev) => prev.filter((x) => x !== id));
    if (tab === `plantilla:${id}`) setTab("plantillas");
  };

  const fixedTabs = [
    { id: "atletas", label: "Atletas" },
    { id: "plantillas", label: "Plantillas" },
    { id: "normativos", label: "Normativos G" },
    { id: "calculadora", label: "Tablas" },
  ];

  const [isManualSaving, setIsManualSaving] = useState(false);
  const [showBackupBanner, setShowBackupBanner] = useState(false);

  // ── Auto-backup: si pasan 5h sin sync a DB, mostrar aviso ─────────────────
  useEffect(() => {
    const check = () => {
      const lastSync = getLastDbSync();
      const lastPrompted = Number(
        localStorage.getItem(BACKUP_PROMPTED_KEY) || "0",
      );
      const now = Date.now();
      // Mostrar si: pasaron 5h desde último sync Y no se descargó backup recientemente
      if (
        lastSync > 0 &&
        now - lastSync > BACKUP_INTERVAL_MS &&
        now - lastPrompted > BACKUP_INTERVAL_MS
      ) {
        setShowBackupBanner(true);
      }
    };
    check();
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const forceSaveAllToDb = useCallback(async () => {
    if (!coachId || isManualSaving) return;

    // Cancelar debounce pendientes para evitar doble write
    if (atletaSyncTimerRef.current) {
      clearTimeout(atletaSyncTimerRef.current);
      atletaSyncTimerRef.current = null;
    }
    if (mesoSyncTimerRef.current) {
      clearTimeout(mesoSyncTimerRef.current);
      mesoSyncTimerRef.current = null;
    }

    setIsManualSaving(true);
    try {
      const atletasPayload = atletasRef.current.map((a) =>
        atletaToDb(a, coachId),
      );
      const mesociclosPayload = mesociclosRef.current.map((m) =>
        mesoToDb(m, coachId),
      );
      const plantillasPayload = (plantillas || []).map((p) =>
        plantillaToDb(p, coachId),
      );

      const writes = [];

      if (atletasPayload.length > 0) {
        writes.push(
          sb.from("atletas").upsert(atletasPayload, { onConflict: "app_id" }),
        );
      }
      if (mesociclosPayload.length > 0) {
        writes.push(
          sb
            .from("mesociclos")
            .upsert(mesociclosPayload, { onConflict: "app_id" }),
        );
      }
      if (plantillasPayload.length > 0) {
        writes.push(
          sb
            .from("plantillas")
            .upsert(plantillasPayload, { onConflict: "app_id" }),
        );
      }

      const normativosLocal = readLocalJson("liftplan_normativos", null);
      const tablasLocal = readLocalJson("liftplan_tablas", null);

      if (normativosLocal) {
        writes.push(
          saveCoachSetting(
            coachId,
            COACH_SETTING_KEYS.normativos,
            normativosLocal,
          ),
        );
      }
      if (tablasLocal) {
        writes.push(
          saveCoachSetting(coachId, COACH_SETTING_KEYS.tablas, tablasLocal),
        );
      }

      await Promise.all(writes);
      broadcastDbWrite("all");
    } catch (e) {
      console.warn("Manual save all failed:", e);
    } finally {
      setIsManualSaving(false);
    }
  }, [coachId, isManualSaving, plantillas]);

  return (
    <>
      <div className="app">
        <nav className="nav">
          <div className="nav-logo">
            <LogoHorizontal height={44} />
          </div>
          <div className="nav-tabs">
            {/* Pestañas fijas */}
            {fixedTabs.map((t) => (
              <button
                key={t.id}
                className={`nav-tab${tab === t.id ? " active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}

            {/* Separador si hay atletas abiertos */}
            {atletasTabs.length > 0 && (
              <div
                style={{
                  width: 1,
                  background: "var(--border)",
                  margin: "12px 6px",
                  flexShrink: 0,
                }}
              />
            )}

            {/* Una pestaña por cada atleta abierto */}
            {atletasTabs.map((aid) => {
              const a = atletas.find((x) => x.id === aid);
              if (!a) return null;
              const isActive = tab === `atleta:${aid}`;
              return (
                <div
                  key={aid}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: "100%",
                  }}
                >
                  <button
                    className={`nav-tab${isActive ? " active" : ""}`}
                    style={{
                      paddingRight: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                    onClick={() => setTab(`atleta:${aid}`)}
                  >
                    {a.tipo === "asesoria" ? (
                      <Briefcase
                        size={13}
                        style={{ flexShrink: 0, opacity: 0.8 }}
                      />
                    ) : (
                      <User size={13} style={{ flexShrink: 0, opacity: 0.8 }} />
                    )}
                    {a.nombre.split(" ")[0]}
                  </button>
                  <button
                    onClick={(e) => cerrarAtleta(aid, e)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--muted)",
                      lineHeight: 1,
                      padding: "0 6px 0 0",
                      marginLeft: -4,
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="Cerrar pestaña"
                  >
                    <X size={11} />
                  </button>
                </div>
              );
            })}

            {/* Separador plantillas */}
            {plantillasTabs.length > 0 && (
              <div
                style={{
                  width: 1,
                  background: "var(--border)",
                  margin: "12px 6px",
                  flexShrink: 0,
                }}
              />
            )}

            {/* Una pestaña por cada plantilla abierta */}
            {plantillasTabs.map((pid) => {
              const p = plantillas.find((x) => x.id === pid);
              if (!p) return null;
              const isActive = tab === `plantilla:${pid}`;
              return (
                <div
                  key={pid}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: "100%",
                  }}
                >
                  <button
                    className={`nav-tab${isActive ? " active" : ""}`}
                    style={{
                      paddingRight: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                    onClick={() => setTab(`plantilla:${pid}`)}
                  >
                    <Library
                      size={13}
                      style={{ flexShrink: 0, opacity: 0.8 }}
                    />
                    {p.nombre.split(" ")[0]}
                  </button>
                  <button
                    onClick={(e) => cerrarPlantilla(pid, e)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--muted)",
                      lineHeight: 1,
                      padding: "0 6px 0 0",
                      marginLeft: -4,
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="Cerrar pestaña"
                  >
                    <X size={11} />
                  </button>
                </div>
              );
            })}
          </div>
          {/* Botón panel referencia */}
          <button
            onClick={() => setRefPanel((v) => !v)}
            title="Panel de referencia"
            style={{
              flexShrink: 0,
              marginLeft: 8,
              padding: "0 12px",
              height: 36,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: refPanel ? "rgba(232,197,71,.15)" : "var(--surface2)",
              color: refPanel ? "var(--gold)" : "var(--muted)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all .2s",
              whiteSpace: "nowrap",
            }}
          >
            <Copy size={13} /> Ref
          </button>

          <button
            onClick={forceSaveAllToDb}
            title="Guardar todo en la base"
            disabled={!coachId || isManualSaving}
            style={{
              flexShrink: 0,
              marginLeft: 6,
              padding: "0 12px",
              height: 36,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface2)",
              color: isManualSaving ? "var(--gold)" : "var(--muted)",
              cursor: !coachId || isManualSaving ? "not-allowed" : "pointer",
              opacity: !coachId ? 0.6 : 1,
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all .2s",
              whiteSpace: "nowrap",
            }}
          >
            <Send size={13} /> {isManualSaving ? "Guardando..." : "Guardar"}
          </button>

          <button
            onClick={() => {
              downloadBackup();
              setShowBackupBanner(false);
            }}
            title="Descargar respaldo completo (localStorage + Supabase)"
            style={{
              flexShrink: 0,
              marginLeft: 6,
              padding: "0 10px",
              height: 36,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface2)",
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 5,
              transition: "all .2s",
            }}
          >
            <Download size={13} />
          </button>

          {/* Usuario logueado */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
              marginLeft: 8,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--muted)",
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "0 8px",
                display: "none",
              }}
              className="nav-user-info"
            >
              {profile?.rol === "superadmin" && (
                <Shield size={11} style={{ color: "var(--gold)" }} />
              )}
              <span
                style={{
                  maxWidth: 100,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {profile?.nombre || session?.user?.email?.split("@")[0]}
              </span>
            </div>
            <button
              onClick={onLogout}
              title="Cerrar sesión"
              style={{
                flexShrink: 0,
                padding: "0 10px",
                height: 36,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface2)",
                color: "var(--muted)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 5,
                transition: "all .2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--red)";
                e.currentTarget.style.borderColor = "var(--red)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--muted)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              <LogOut size={13} />
            </button>
          </div>
        </nav>

        {/* Banner de respaldo automático */}
        {showBackupBanner && (
          <div
            style={{
              background: "rgba(232,80,71,.12)",
              borderBottom: "1px solid var(--red)",
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              fontSize: 13,
              color: "var(--text)",
            }}
          >
            <span>
              ⚠️ Hace más de 5 horas sin sincronizar con la base de datos.
              Descargá un respaldo por seguridad.
            </span>
            <button
              onClick={() => {
                downloadBackup();
                setShowBackupBanner(false);
              }}
              style={{
                padding: "4px 14px",
                borderRadius: 6,
                border: "1px solid var(--gold)",
                background: "var(--gold)",
                color: "#0a0c10",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              <Download
                size={12}
                style={{ verticalAlign: -2, marginRight: 4 }}
              />
              Descargar respaldo
            </button>
            <button
              onClick={() => setShowBackupBanner(false)}
              style={{
                background: "none",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                padding: 4,
              }}
              title="Cerrar"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Content area — flex row with panel as sidebar on desktop */}
        <div
          style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}
        >
          <main
            className="main"
            style={{ flex: 1, minWidth: 0, overflowY: "auto" }}
          >
            {/* Pestañas estáticas — siempre montadas */}
            <div style={{ display: tab === "atletas" ? "block" : "none" }}>
              <PageAtletas
                atletas={atletas}
                setAtletas={setAtletasFn}
                mesociclos={mesociclos}
                setMesociclos={setMesociclos}
                onSelect={abrirAtleta}
                coachId={coachId}
              />
            </div>
            <div style={{ display: tab === "plantillas" ? "block" : "none" }}>
              <PagePlantillas
                plantillas={plantillas}
                onAdd={addPlantilla}
                onUpdate={updatePlantilla}
                onDelete={removePlantilla}
                onOpen={abrirPlantilla}
              />
            </div>
            <div style={{ display: tab === "calculadora" ? "block" : "none" }}>
              <PageCalculadora coachId={coachId} />
            </div>
            <div style={{ display: tab === "normativos" ? "block" : "none" }}>
              <PageNormativos
                coachId={coachId}
                isActive={tab === "normativos"}
              />
            </div>

            {/* Pestañas de atletas — montadas mientras estén abiertas */}
            {atletasTabs.map((aid) => {
              const a = atletas.find((x) => x.id === aid);
              if (!a) return null;
              return (
                <div
                  key={aid}
                  style={{
                    display: tab === `atleta:${aid}` ? "block" : "none",
                  }}
                >
                  <PageAtleta
                    atleta={a}
                    mesociclos={mesociclos}
                    setMesociclos={setMesociclos}
                    addPlantilla={addPlantilla}
                    onLiveMesoData={onLiveMesoDataCb}
                    onAtletaOverridesChange={queueAtletaOverrideSync}
                    openRequest={atletaOpenRequest[aid]}
                    onBack={() => {
                      cerrarAtleta(aid, { stopPropagation: () => {} });
                    }}
                  />
                </div>
              );
            })}

            {/* Pestañas de plantillas — montadas mientras estén abiertas */}
            {plantillasTabs.map((pid) => {
              const p = plantillas.find((x) => x.id === pid);
              if (!p) return null;
              return (
                <div
                  key={pid}
                  style={{
                    display: tab === `plantilla:${pid}` ? "block" : "none",
                  }}
                >
                  <PagePlantilla
                    plt={p}
                    onUpdate={(updated) => updatePlantilla(updated)}
                    onClose={() => cerrarPlantilla(pid, null)}
                  />
                </div>
              );
            })}
          </main>

          {refPanel && (
            <PanelReferencia
              atletas={atletas}
              mesociclos={mesociclos}
              plantillas={plantillas}
              liveMesoData={liveMesoData}
              onClose={() => setRefPanel(false)}
              onWidthChange={setRefPanelWidth}
              isMobile={
                typeof window !== "undefined" && window.innerWidth <= 768
              }
            />
          )}
        </div>
      </div>
    </>
  );
}
