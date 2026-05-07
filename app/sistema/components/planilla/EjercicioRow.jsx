import { CAT_COLOR } from "../../data/constantes";
import { calcKg, getEjercicioById } from "../../lib/calc";
import { EjBuscador } from "../common/EjBuscador";

export function EjercicioRow({
  ej,
  idx,
  irm_arr,
  irm_env,
  onChange,
  normativos = null,
}) {
  const ejData = ej.ejercicio_id
    ? getEjercicioById(ej.ejercicio_id, normativos)
    : null;
  const kg = ejData ? calcKg(ejData, irm_arr, irm_env) : null;
  const kgIntens = kg ? Math.round((kg * ej.intensidad) / 100) : null;

  return (
    <div className="ej-row">
      <div className="ej-num">{idx + 1}</div>
      <EjBuscador
        value={ej.ejercicio_id}
        onChange={(id) => onChange({ ...ej, ejercicio_id: id })}
        normativos={normativos}
      />
      <input
        name="field_1"
        className="ej-input"
        type="number"
        min={40}
        max={110}
        value={ej.intensidad}
        onChange={(e) =>
          onChange({ ...ej, intensidad: Number(e.target.value) })
        }
        title="Intensidad %"
      />
      <select
        name="field_2"
        className="ej-input"
        value={ej.tabla}
        onChange={(e) => onChange({ ...ej, tabla: Number(e.target.value) })}
      >
        <option value={1}>Tabla 1</option>
        <option value={2}>Tabla 2</option>
        <option value={3}>Tabla 3</option>
        <option value={4}>Tabla 4</option>
        <option value={5}>Tabla 5</option>
      </select>
      <input
        name="field_3"
        className="ej-input"
        type="number"
        min={0}
        value={ej.reps_asignadas}
        onChange={(e) =>
          onChange({ ...ej, reps_asignadas: Number(e.target.value) })
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
