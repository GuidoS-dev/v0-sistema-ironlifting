import { CAT_COLOR } from "../../data/constantes";
import { calcKg, getEjercicioById } from "../../lib/calc";
import { EjBuscador } from "../common/EjBuscador";

export function ComplementarioRow({
  comp,
  idx,
  irm_arr,
  irm_env,
  onChange,
  onDelete,
  normativos = null,
}) {
  const ejData = comp.ejercicio_id
    ? getEjercicioById(comp.ejercicio_id, normativos)
    : null;
  const kg = ejData ? calcKg(ejData, irm_arr, irm_env) : null;
  const kgIntens = kg ? Math.round((kg * comp.intensidad) / 100) : null;

  return (
    <div className="comp-row">
      <div className="ej-num">{idx + 1}</div>
      <EjBuscador
        value={comp.ejercicio_id}
        onChange={(id) => onChange({ ...comp, ejercicio_id: id })}
        normativos={normativos}
      />
      <input
        className="ej-input"
        name="comp_intensidad"
        type="number"
        min={40}
        max={110}
        value={comp.intensidad}
        onChange={(e) =>
          onChange({ ...comp, intensidad: Number(e.target.value) })
        }
        title="Intensidad %"
      />
      <select
        className="ej-input"
        name="comp_tabla"
        value={comp.tabla}
        onChange={(e) => onChange({ ...comp, tabla: Number(e.target.value) })}
      >
        <option value={1}>T1</option>
        <option value={2}>T2</option>
        <option value={3}>T3</option>
      </select>
      <input
        className="ej-input"
        name="comp_reps_asignadas"
        type="number"
        min={0}
        value={comp.reps_asignadas}
        onChange={(e) =>
          onChange({ ...comp, reps_asignadas: Number(e.target.value) })
        }
        title="Reps asignadas"
      />
      <div className="ej-kg">
        {kgIntens ? (
          `${kgIntens}kg`
        ) : ejData ? (
          <span className="text-muted">—</span>
        ) : (
          ""
        )}
      </div>
      <input
        className="ej-input"
        name="comp_aclaracion"
        type="text"
        value={comp.aclaracion || ""}
        placeholder="Aclaración"
        onChange={(e) => onChange({ ...comp, aclaracion: e.target.value })}
        title="Aclaración"
      />
      <button
        onClick={onDelete}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--red)",
          fontSize: 14,
          padding: "0 4px",
          lineHeight: 1,
          justifySelf: "center",
        }}
      >
        ✕
      </button>
      {ejData && (
        <span
          className="ej-cat"
          style={{
            background: `${CAT_COLOR[ejData.categoria]}20`,
            color: CAT_COLOR[ejData.categoria],
          }}
        >
          {ejData.categoria.slice(0, 3)}
        </span>
      )}
    </div>
  );
}
