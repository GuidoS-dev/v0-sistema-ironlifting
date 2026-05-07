import { useState } from "react";
import { CATEGORIAS, CAT_COLOR } from "../../data/constantes";

export function PageNormativosAtleta({
  atleta,
  globalNormativos,
  atletaNormativos,
  atletaNormOverrides,
  saveAtletaOverrides,
  getEjAtleta,
}) {
  const [filtro, setFiltro] = useState("");
  const [catFiltro, setCatFiltro] = useState("");
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [error, setError] = useState("");

  const globalById = {};
  globalNormativos.forEach((e) => {
    globalById[e.id] = e;
  });

  const startEdit = (e) => {
    const curr = getEjAtleta(e.id) || e;
    setEditId(e.id);
    setEditForm({
      id: e.id,
      pct_base: curr.pct_base ?? "",
      base: curr.base || "",
    });
    setError("");
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditForm(null);
    setError("");
  };

  const confirmEdit = () => {
    if (!editForm) return;
    const parsedPct =
      editForm.pct_base === "" ? null : Number(editForm.pct_base);
    if (
      parsedPct !== null &&
      (isNaN(parsedPct) || parsedPct < 0 || parsedPct > 200)
    ) {
      setError("% Base debe estar entre 0 y 200");
      return;
    }
    const globalEj = globalById[editId];
    if (!globalEj) {
      setError("No se pudo encontrar el ejercicio global");
      return;
    }

    const nextRow = {};
    if (parsedPct !== (globalEj.pct_base ?? null)) nextRow.pct_base = parsedPct;
    if ((editForm.base || "") !== (globalEj.base || ""))
      nextRow.base = editForm.base || "";

    saveAtletaOverrides((prev) => {
      const next = { ...prev };
      if (Object.keys(nextRow).length === 0) delete next[editId];
      else next[editId] = nextRow;
      return next;
    });
    setEditId(null);
    setEditForm(null);
    setError("");
  };

  const resetOverride = (id) => {
    saveAtletaOverrides((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (editId === id) cancelEdit();
  };

  const filtered = atletaNormativos
    .filter(
      (e) =>
        (!catFiltro || e.categoria === catFiltro) &&
        (!filtro ||
          e.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
          String(e.id).includes(filtro)),
    )
    .sort((a, b) => Number(a.id) - Number(b.id));

  const setF = (field, val) => setEditForm((f) => ({ ...f, [field]: val }));
  const inputStyle = {
    background: "var(--surface3)",
    border: "1px solid var(--gold)",
    borderRadius: 5,
    color: "var(--text)",
    fontSize: 12,
    padding: "3px 6px",
    outline: "none",
    width: "100%",
  };

  return (
    <div>
      <div className="flex-between mb16">
        <div>
          <div className="page-title">Normativos A · {atleta.nombre}</div>
          <div className="page-sub">
            Overrides locales por atleta sobre los normativos globales
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex gap12 mb14" style={{ flexWrap: "wrap" }}>
          <input
            name="field_67"
            className="form-input"
            style={{ maxWidth: 240 }}
            placeholder="Buscar por nombre o ID..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
          <select
            name="field_68"
            className="form-select"
            style={{ maxWidth: 200 }}
            value={catFiltro}
            onChange={(e) => setCatFiltro(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <span className="text-sm text-muted" style={{ alignSelf: "center" }}>
            {filtered.length} ejercicios ·{" "}
            {Object.keys(atletaNormOverrides).length} overrides
          </span>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 12,
              padding: "8px 14px",
              borderRadius: 8,
              background: "rgba(232,71,71,.1)",
              border: "1px solid rgba(232,71,71,.3)",
              fontSize: 12,
              color: "var(--red)",
              fontWeight: 600,
            }}
          >
            ⚠ {error}
          </div>
        )}

        <div className="scroll-x">
          <table className="norm-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>ID</th>
                <th>Ejercicio</th>
                <th style={{ width: 150 }}>Categoría</th>
                <th style={{ width: 90, textAlign: "center" }}>% Base</th>
                <th style={{ width: 120 }}>Base IRM</th>
                <th style={{ width: 160, textAlign: "right" }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const isEditing = editId === e.id;
                const row = isEditing ? editForm : e;
                const ovr = atletaNormOverrides[e.id] || null;
                const hasOverride = !!ovr;
                const pctOver =
                  hasOverride &&
                  Object.prototype.hasOwnProperty.call(ovr, "pct_base");
                const baseOver =
                  hasOverride &&
                  Object.prototype.hasOwnProperty.call(ovr, "base");

                return (
                  <tr
                    key={e.id}
                    style={{
                      background: isEditing
                        ? "rgba(232,197,71,.06)"
                        : hasOverride
                          ? "rgba(71,157,232,.05)"
                          : "transparent",
                      cursor: isEditing ? "default" : "pointer",
                      borderLeft: hasOverride
                        ? "3px solid var(--blue)"
                        : "3px solid transparent",
                    }}
                    onClick={() => !isEditing && startEdit(e)}
                  >
                    <td>
                      <span
                        style={{
                          fontFamily: "'Bebas Neue'",
                          fontSize: 16,
                          color: "var(--muted)",
                        }}
                      >
                        {e.id}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{e.nombre}</span>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: `${CAT_COLOR[e.categoria]}20`,
                          color: CAT_COLOR[e.categoria],
                        }}
                      >
                        {e.categoria}
                      </span>
                    </td>
                    <td
                      style={{ textAlign: "center" }}
                      onClick={(ev) => isEditing && ev.stopPropagation()}
                    >
                      {isEditing ? (
                        <input
                          name="field_69"
                          type="number"
                          min={0}
                          max={200}
                          style={{
                            ...inputStyle,
                            width: 70,
                            textAlign: "center",
                            borderColor: pctOver
                              ? "var(--blue)"
                              : "var(--gold)",
                            color: pctOver ? "var(--blue)" : "var(--text)",
                          }}
                          value={row.pct_base}
                          onChange={(ev) => setF("pct_base", ev.target.value)}
                        />
                      ) : (
                        <span
                          style={{
                            fontFamily: "'Bebas Neue'",
                            fontSize: 16,
                            color: pctOver ? "var(--blue)" : "var(--gold)",
                          }}
                        >
                          {e.pct_base ?? "—"}
                        </span>
                      )}
                    </td>
                    <td onClick={(ev) => isEditing && ev.stopPropagation()}>
                      {isEditing ? (
                        <select
                          name="field_70"
                          style={{
                            ...inputStyle,
                            borderColor: baseOver
                              ? "var(--blue)"
                              : "var(--gold)",
                            color: baseOver ? "var(--blue)" : "var(--text)",
                          }}
                          value={row.base || ""}
                          onChange={(ev) => setF("base", ev.target.value)}
                        >
                          <option value="arranque">Arranque</option>
                          <option value="envion">Envión</option>
                          <option value="">Ninguna</option>
                        </select>
                      ) : (
                        <span
                          className="text-sm"
                          style={{
                            color: baseOver ? "var(--blue)" : "var(--muted)",
                          }}
                        >
                          {e.base || "—"}
                        </span>
                      )}
                    </td>
                    <td
                      style={{ textAlign: "right" }}
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      {isEditing ? (
                        <div
                          className="flex gap4"
                          style={{ justifyContent: "flex-end" }}
                        >
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={cancelEdit}
                          >
                            ✕
                          </button>
                          <button
                            className="btn btn-gold btn-xs"
                            onClick={confirmEdit}
                          >
                            ✓
                          </button>
                        </div>
                      ) : hasOverride ? (
                        <button
                          className="btn btn-ghost btn-xs"
                          style={{ color: "var(--blue)" }}
                          onClick={() => resetOverride(e.id)}
                        >
                          Resetear
                        </button>
                      ) : (
                        <span style={{ color: "var(--surface3)" }}>•</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
