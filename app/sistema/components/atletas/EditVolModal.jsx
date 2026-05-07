import { useState, useRef } from "react";
import { Modal } from "../common/Modal";
import { formatDateDisplay, getFechaSemana } from "../../lib/ciclo-menstrual";

export function EditVolModal({ meso, onSave, onClose }) {
  const [volTotal, setVolTotal] = useState(meso.volumen_total);
  const [semanas, setSemanas] = useState(meso.semanas.map((s) => ({ ...s })));
  const rrReduceRef = useRef({});
  const rrIncreaseRef = useRef({});

  const totalPct = semanas.reduce((s, sem) => s + Number(sem.pct_volumen), 0);

  const toIntPct = (val) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  };

  const distributeReduction = (baseVals, keys, amount, rrKey = "default") => {
    const vals = { ...baseVals };
    let pending = Math.max(0, Math.round(amount));
    let cursor = rrReduceRef.current[rrKey] || 0;
    while (pending > 0) {
      const candidates = keys.filter((k) => (vals[k] || 0) > 0);
      if (candidates.length === 0) break;
      const start = cursor % candidates.length;
      for (let i = 0; i < candidates.length; i += 1) {
        const k = candidates[(start + i) % candidates.length];
        if (pending <= 0) break;
        if ((vals[k] || 0) > 0) {
          vals[k] -= 1;
          pending -= 1;
        }
      }
      cursor = (start + 1) % candidates.length;
    }
    rrReduceRef.current[rrKey] = cursor;
    return vals;
  };

  const distributeIncrease = (baseVals, keys, amount, rrKey = "default") => {
    const vals = { ...baseVals };
    let pending = Math.max(0, Math.round(amount));
    let cursor = rrIncreaseRef.current[rrKey] || 0;
    while (pending > 0) {
      const candidates = keys.filter((k) => (vals[k] || 0) < 100);
      if (candidates.length === 0) break;
      const start = cursor % candidates.length;
      for (let i = 0; i < candidates.length; i += 1) {
        const k = candidates[(start + i) % candidates.length];
        if (pending <= 0) break;
        if ((vals[k] || 0) < 100) {
          vals[k] += 1;
          pending -= 1;
        }
      }
      cursor = (start + 1) % candidates.length;
    }
    rrIncreaseRef.current[rrKey] = cursor;
    return vals;
  };

  const updatePct = (idx, val) => {
    const s = [...semanas];
    s[idx] = { ...s[idx], pct_volumen: toIntPct(val) };
    setSemanas(s);
  };

  const stepPct = (idx, delta) => {
    const vals = {};
    semanas.forEach((sem, i) => {
      vals[i] = toIntPct(sem.pct_volumen);
    });

    const prevSum = Object.values(vals).reduce((acc, v) => acc + v, 0);
    const current = vals[idx] || 0;
    let applied = toIntPct(current + delta) - current;
    if (applied === 0) return;

    if (applied > 0) {
      const otherKeys = Object.keys(vals)
        .map(Number)
        .filter((k) => k !== idx && (vals[k] || 0) > 0);
      const capacity = otherKeys.reduce((acc, k) => acc + (vals[k] || 0), 0);
      const neededWhenNormal = Math.max(0, prevSum + applied - 100);
      const required =
        prevSum > 100 ? Math.min(applied, capacity) : neededWhenNormal;
      const missing = Math.max(0, required - capacity);

      if (missing > 0 && prevSum <= 100) {
        applied = Math.max(0, applied - missing);
      }
      if (applied === 0) return;

      vals[idx] = current + applied;

      const balanceAmount =
        prevSum > 100
          ? Math.min(
              applied,
              otherKeys.reduce((acc, k) => acc + (vals[k] || 0), 0),
            )
          : Math.max(0, prevSum + applied - 100);

      const reduced = distributeReduction(
        vals,
        otherKeys,
        balanceAmount,
        "semanas",
      );
      const nextSemanas = semanas.map((sem, i) => ({
        ...sem,
        pct_volumen: toIntPct(reduced[i] || 0),
      }));
      setSemanas(nextSemanas);
      return;
    }

    let dec = Math.abs(applied);
    const otherKeys = Object.keys(vals)
      .map(Number)
      .filter((k) => k !== idx && (vals[k] || 0) > 0 && (vals[k] || 0) < 100);
    const capacityUp = otherKeys.reduce(
      (acc, k) => acc + (100 - (vals[k] || 0)),
      0,
    );
    const neededWhenNormal = Math.max(0, 100 - (prevSum - dec));
    const required =
      prevSum < 100 ? Math.min(dec, capacityUp) : neededWhenNormal;
    const missing = Math.max(0, required - capacityUp);
    if (missing > 0 && prevSum >= 100) {
      dec = Math.max(0, dec - missing);
    }
    if (dec === 0) return;

    vals[idx] = current - dec;
    const balanceAmount =
      prevSum < 100
        ? Math.min(dec, capacityUp)
        : Math.max(0, 100 - (prevSum - dec));
    const increased = distributeIncrease(
      vals,
      otherKeys,
      balanceAmount,
      "semanas",
    );
    const nextSemanas = semanas.map((sem, i) => ({
      ...sem,
      pct_volumen: toIntPct(increased[i] || 0),
    }));
    setSemanas(nextSemanas);
  };

  return (
    <Modal title="Editar Volumen y Semanas" onClose={onClose}>
      <div className="form-group">
        <label className="form-label">Repeticiones totales del mesociclo</label>
        <input
          name="field_41"
          className="form-input"
          type="number"
          value={volTotal}
          onChange={(e) => setVolTotal(Number(e.target.value))}
        />
      </div>
      <div className="divider" />
      <div className="form-label mb8">Distribución semanal</div>
      {semanas.map((s, i) => {
        const repsCalc = Math.round((volTotal * s.pct_volumen) / 100);
        return (
          <div
            key={s.id}
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "14px 16px",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontFamily: "'Bebas Neue'",
                fontSize: 16,
                color: "var(--gold)",
                marginBottom: 4,
                letterSpacing: ".05em",
              }}
            >
              SEMANA {s.numero}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: s.fecha_override ? "var(--gold)" : "var(--muted)",
                }}
              >
                {formatDateDisplay(
                  s.fecha_override ||
                    getFechaSemana(meso.fecha_inicio, s.numero),
                ) || "—"}
              </span>
              <input
                className="form-input"
                name="fecha_override"
                type="date"
                value={s.fecha_override || ""}
                onChange={(e) => {
                  const ns = [...semanas];
                  ns[i] = { ...ns[i], fecha_override: e.target.value };
                  setSemanas(ns);
                }}
                style={{ width: 130, fontSize: 11 }}
              />
              {s.fecha_override && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    const ns = [...semanas];
                    ns[i] = { ...ns[i], fecha_override: "" };
                    setSemanas(ns);
                  }}
                  title="Restaurar fecha automática"
                  style={{ minWidth: 22, padding: "2px 4px", fontSize: 10 }}
                >
                  ✕
                </button>
              )}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <input
                name="field_42"
                className="form-input"
                type="number"
                min={0}
                max={100}
                value={s.pct_volumen}
                onChange={(e) => updatePct(i, e.target.value)}
                style={{ width: 80 }}
              />
              <span
                style={{
                  fontFamily: "'Bebas Neue'",
                  fontSize: 20,
                  color: totalPct === 100 ? "var(--green)" : "var(--muted)",
                }}
              >
                %
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => stepPct(i, 1)}
                  title="Subir 1%"
                  style={{ minWidth: 28, padding: "2px 6px", lineHeight: 1 }}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => stepPct(i, -1)}
                  title="Bajar 1%"
                  style={{ minWidth: 28, padding: "2px 6px", lineHeight: 1 }}
                >
                  ▼
                </button>
              </div>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>
                →{" "}
                <span
                  style={{
                    color: "var(--gold)",
                    fontFamily: "'Bebas Neue'",
                    fontSize: 20,
                  }}
                >
                  {repsCalc}
                </span>{" "}
                reps
              </span>
            </div>
            <div
              style={{
                height: 4,
                background: "var(--surface3)",
                borderRadius: 2,
                marginTop: 10,
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 2,
                  width: `${Math.min(s.pct_volumen, 100)}%`,
                  background: totalPct === 100 ? "var(--green)" : "var(--gold)",
                  transition: "width .3s",
                }}
              />
            </div>
          </div>
        );
      })}
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          marginBottom: 4,
          background:
            totalPct === 100 ? "rgba(71,232,160,.08)" : "rgba(232,71,71,.08)",
          border: `1px solid ${totalPct === 100 ? "rgba(71,232,160,.3)" : "rgba(232,71,71,.3)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: totalPct === 100 ? "var(--green)" : "var(--red)",
          }}
        >
          Total: {totalPct}%
        </span>
        <span
          style={{
            fontSize: 12,
            color: totalPct === 100 ? "var(--green)" : "var(--red)",
          }}
        >
          {totalPct === 100
            ? "✓ Distribución válida"
            : "Debe sumar exactamente 100%"}
        </span>
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="btn btn-gold"
          style={{
            opacity: totalPct === 100 ? 1 : 0.4,
            cursor: totalPct === 100 ? "pointer" : "not-allowed",
          }}
          onClick={() => {
            if (totalPct === 100) onSave(volTotal, semanas);
          }}
        >
          Guardar cambios
        </button>
      </div>
    </Modal>
  );
}
