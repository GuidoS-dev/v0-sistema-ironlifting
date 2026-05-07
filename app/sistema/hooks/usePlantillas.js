import { useState, useRef, useCallback, useEffect } from "react";
import { sb } from "../lib/supabase-client";
import { plantillaToDb, plantillaFromDb } from "../lib/mappers";
import { safeSetItem } from "../lib/storage";
import { mkId } from "../data/constantes";
import { _visResume } from "../lib/sync";

export function usePlantillas(coachId) {
  const [plantillas, setPlantillas] = useState(() => {
    try {
      const list = JSON.parse(
        localStorage.getItem("liftplan_plantillas") || "[]",
      );
      // Recuperar borradores más nuevos que el array guardado
      return list.map((p) => {
        try {
          const draft = JSON.parse(
            localStorage.getItem(`liftplan_plt_draft_${p.id}`) || "null",
          );
          // Usar el borrador si existe (siempre es más reciente)
          return draft || p;
        } catch {
          return p;
        }
      });
    } catch {
      return [];
    }
  });
  const plantillaSyncTimersRef = useRef(new Map());
  const pendingDeletePlantillaIdsRef = useRef(new Set());

  const queuePlantillaSync = useCallback(
    (item, delay = 4000) => {
      if (!coachId || !item?.id) return;
      const pending = plantillaSyncTimersRef.current.get(item.id);
      if (pending) clearTimeout(pending);

      const timer = setTimeout(() => {
        plantillaSyncTimersRef.current.delete(item.id);
        sb.from("plantillas")
          .upsert([plantillaToDb(item, coachId)], { onConflict: "app_id" })
          .catch(() => {});
      }, delay);

      plantillaSyncTimersRef.current.set(item.id, timer);
    },
    [coachId],
  );

  useEffect(() => {
    return () => {
      plantillaSyncTimersRef.current.forEach((timer) => clearTimeout(timer));
      plantillaSyncTimersRef.current.clear();
    };
  }, []);

  // Cargar plantillas desde Supabase + pull on visibility
  const lastPullPlantillasRef = useRef(0);
  const lastSyncTsPlantillasRef = useRef(null);
  useEffect(() => {
    if (!coachId) return;
    let cancelled = false;

    const pullPlantillas = async () => {
      const now = Date.now();
      if (now - lastPullPlantillasRef.current < 5000) return; // throttle 5s
      lastPullPlantillasRef.current = now;
      const q = sb.from("plantillas").select("*").eq("coach_id", coachId);
      // Delta sync
      if (lastSyncTsPlantillasRef.current) {
        q.gt("updated_at", lastSyncTsPlantillasRef.current);
      }
      const { data, error } = await q.exec();
      if (cancelled || error || !data) return;
      // Registrar timestamp
      if (data.length > 0) {
        const maxTs = data.reduce((max, r) => {
          return r.updated_at && r.updated_at > max ? r.updated_at : max;
        }, lastSyncTsPlantillasRef.current || "");
        if (maxTs) lastSyncTsPlantillasRef.current = maxTs;
      } else if (!lastSyncTsPlantillasRef.current) {
        lastSyncTsPlantillasRef.current = new Date().toISOString();
      }
      const appPlantillas = data.filter((r) => r.app_id);
      if (appPlantillas.length > 0) {
        const loaded = appPlantillas.map(plantillaFromDb);
        setPlantillas((prev) => {
          const pendingDel = pendingDeletePlantillaIdsRef.current;
          // LWW per-item: only overwrite items where DB is actually newer
          const merged = loaded
            .filter((dbItem) => !pendingDel.has(dbItem.id)) // skip pending deletes
            .map((dbItem) => {
              const local = prev.find((p) => p.id === dbItem.id);
              if (!local) return dbItem;
              const dbTs = dbItem._updated_at
                ? new Date(dbItem._updated_at).getTime()
                : 0;
              const localTs = local._updated_at
                ? new Date(local._updated_at).getTime()
                : 0;
              return dbTs >= localTs ? dbItem : local;
            });
          // Keep local items not yet in DB
          prev.forEach((localItem) => {
            if (
              !pendingDel.has(localItem.id) &&
              !merged.find((m) => m.id === localItem.id)
            )
              merged.push(localItem);
          });
          if (JSON.stringify(prev) === JSON.stringify(merged)) return prev;
          safeSetItem("liftplan_plantillas", JSON.stringify(merged));
          return merged;
        });
      } else {
        // DB vacía — migrar localStorage → DB
        const local = (() => {
          try {
            return JSON.parse(
              localStorage.getItem("liftplan_plantillas") || "[]",
            );
          } catch {
            return [];
          }
        })();
        if (local.length > 0) {
          sb.from("plantillas")
            .upsert(
              local.map((p) => plantillaToDb(p, coachId)),
              { onConflict: "app_id" },
            )
            .catch(() => {});
        }
      }
    };

    pullPlantillas().catch(() => {});
    const unsub = _visResume.sub(() => pullPlantillas().catch(() => {}));
    return () => {
      cancelled = true;
      unsub();
    };
  }, [coachId]);

  const add = (p) => {
    const item = {
      id: mkId(),
      creado: new Date().toISOString().slice(0, 10),
      ...p,
    };
    setPlantillas((prev) => {
      const next = [...prev, item];
      safeSetItem("liftplan_plantillas", JSON.stringify(next));
      return next;
    });
    queuePlantillaSync(item, 1000);
    return item;
  };
  const update = (p) => {
    const stamped = { ...p, _updated_at: new Date().toISOString() };
    setPlantillas((prev) => {
      const exists = prev.some((x) => x.id === stamped.id);
      const next = exists
        ? prev.map((x) => (x.id === stamped.id ? stamped : x))
        : [...prev, stamped];
      safeSetItem(`liftplan_plt_draft_${stamped.id}`, JSON.stringify(stamped));
      safeSetItem("liftplan_plantillas", JSON.stringify(next));
      return next;
    });
    queuePlantillaSync(stamped, 4000);
  };
  const remove = (id) => {
    const pending = plantillaSyncTimersRef.current.get(id);
    if (pending) {
      clearTimeout(pending);
      plantillaSyncTimersRef.current.delete(id);
    }
    pendingDeletePlantillaIdsRef.current.add(id);
    setPlantillas((prev) => {
      const next = prev.filter((x) => x.id !== id);
      safeSetItem("liftplan_plantillas", JSON.stringify(next));
      return next;
    });
    try {
      localStorage.removeItem(`liftplan_plt_draft_${id}`);
    } catch {}
    if (coachId) {
      sb.from("plantillas")
        .eq("app_id", id)
        .delete()
        .then((res) => {
          if (res?.error) {
            console.warn(
              "DELETE plantilla failed, keeping pending:",
              id,
              res.error,
            );
          } else {
            pendingDeletePlantillaIdsRef.current.delete(id);
          }
        })
        .catch((e) => console.warn("DELETE plantilla exception:", id, e));
    }
  };
  const flushSync = useCallback(() => {
    // Flush all pending plantilla sync timers and push current state
    if (plantillaSyncTimersRef.current.size > 0) {
      plantillaSyncTimersRef.current.forEach((timer) => clearTimeout(timer));
      plantillaSyncTimersRef.current.clear();
    }
    if (coachId && plantillas.length > 0) {
      sb.from("plantillas")
        .upsert(
          plantillas.map((p) => plantillaToDb(p, coachId)),
          { onConflict: "app_id" },
        )
        .catch(() => {});
    }
  }, [coachId, plantillas]);
  return { plantillas, add, update, remove, flushSync };
}
