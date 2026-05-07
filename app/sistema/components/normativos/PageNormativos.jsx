import { useState, useEffect, useRef, useCallback } from "react";
import { Modal } from "../common/Modal";
import { EJERCICIOS } from "../../data/ejercicios";
import { CATEGORIAS, CAT_COLOR } from "../../data/constantes";
import { readLocalJson, writeLocalJson } from "../../lib/storage";
import { COACH_SETTING_KEYS, loadCoachSettingRow, saveCoachSetting } from "../../lib/coach-settings";
import { _visResume } from "../../lib/sync";

export function PageNormativos({ coachId, isActive = false }) {
  const isNormativosValid = (value) =>
    Array.isArray(value) && value.length >= EJERCICIOS.length;

  const [ejercicios, setEjercicios] = useState(() => {
    const stored = readLocalJson("liftplan_normativos", null);
    return isNormativosValid(stored) ? stored : EJERCICIOS;
  });
  const [filtro, setFiltro] = useState("");
  const [catFiltro, setCatFiltro] = useState("");
  const [editId, setEditId] = useState(null); // id original del ej en edición
  const [editForm, setEditForm] = useState(null); // copia local mientras se edita
  const [showAdd, setShowAdd] = useState(false);
  const [newEj, setNewEj] = useState({
    id: "",
    nombre: "",
    categoria: "Arranque",
    pct_base: "",
    base: "arranque",
  });
  const [confirmDel, setConfirmDel] = useState(null);
  const [error, setError] = useState("");
  const isSyncingRef = useRef(false);

  const syncFromDb = useCallback(async () => {
    if (!coachId || isSyncingRef.current) return;
    isSyncingRef.current = true;
    try {
      const remoteRow = await loadCoachSettingRow(
        coachId,
        COACH_SETTING_KEYS.normativos,
      );
      const remote = remoteRow?.setting_value ?? null;

      if (isNormativosValid(remote)) {
        const local = readLocalJson("liftplan_normativos", null);
        const hasChanged = JSON.stringify(local) !== JSON.stringify(remote);
        if (hasChanged) {
          setEjercicios(remote);
          writeLocalJson("liftplan_normativos", remote);
        }
        return;
      }

      const local = readLocalJson("liftplan_normativos", null);
      const seed = isNormativosValid(local) ? local : EJERCICIOS;
      if (!isNormativosValid(local)) {
        writeLocalJson("liftplan_normativos", seed);
        setEjercicios(seed);
      }
      await saveCoachSetting(coachId, COACH_SETTING_KEYS.normativos, seed);
    } finally {
      isSyncingRef.current = false;
    }
  }, [coachId]);

  useEffect(() => {
    if (!coachId) return;
    syncFromDb().catch(() => {});
  }, [coachId, syncFromDb]);

  useEffect(() => {
    if (!coachId || !isActive) return;
    const unsub = _visResume.sub(() => syncFromDb().catch(() => {}));
    return () => unsub();
  }, [coachId, isActive, syncFromDb]);

  const save = (list) => {
    setEjercicios(list);
    writeLocalJson("liftplan_normativos", list);
    if (coachId) {
      saveCoachSetting(coachId, COACH_SETTING_KEYS.normativos, list);
    }
  };

  // Abrir edición: crea copia local del ejercicio
  const startEdit = (e) => {
    setEditId(e.id);
    setEditForm({ ...e, pct_base: e.pct_base ?? "" });
    setError("");
  };

  // Cancelar edición sin guardar
  const cancelEdit = () => {
    setEditId(null);
    setEditForm(null);
    setError("");
  };

  // Confirmar edición con validaciones
  const confirmEdit = () => {
    if (!editForm.nombre.trim()) {
      setError("El nombre no puede estar vacío");
      return;
    }
    const newId =
      editForm.id !== "" && editForm.id !== null ? Number(editForm.id) : editId;
    if (isNaN(newId) || newId === 0) {
      setError("El ID debe ser un número válido");
      return;
    }
    if (newId !== editId && ejercicios.some((e) => Number(e.id) === newId)) {
      setError(`El ID ${newId} ya está en uso`);
      return;
    }
    save(
      ejercicios.map((e) =>
        e.id === editId
          ? {
              ...editForm,
              id: newId,
              pct_base:
                editForm.pct_base !== "" ? Number(editForm.pct_base) : null,
            }
          : e,
      ),
    );
    setEditId(null);
    setEditForm(null);
    setError("");
  };

  const deleteEj = (id) => {
    save(ejercicios.filter((e) => e.id !== id));
    setConfirmDel(null);
    if (editId === id) cancelEdit();
  };

  const addEj = () => {
    if (!newEj.nombre.trim()) {
      setError("El nombre no puede estar vacío");
      return;
    }
    const id =
      newEj.id !== ""
        ? Number(newEj.id)
        : Math.max(...ejercicios.map((e) => Number(e.id) || 0)) + 1;
    if (isNaN(id)) {
      setError("El ID debe ser un número");
      return;
    }
    if (ejercicios.some((e) => Number(e.id) === id)) {
      setError(`El ID ${id} ya existe`);
      return;
    }
    setError("");
    save([
      ...ejercicios,
      {
        ...newEj,
        id,
        pct_base: newEj.pct_base !== "" ? Number(newEj.pct_base) : null,
      },
    ]);
    setNewEj({
      id: "",
      nombre: "",
      categoria: "Arranque",
      pct_base: "",
      base: "arranque",
    });
    setShowAdd(false);
  };

  const filtered = ejercicios
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
          <div className="page-title">Normativos G</div>
          <div className="page-sub">
            Ejercicios y porcentajes de referencia — editables globalmente
          </div>
        </div>
        <button
          className="btn btn-gold btn-sm"
          onClick={() => {
            setShowAdd((s) => !s);
            setError("");
          }}
        >
          {showAdd ? "Cancelar" : "+ Nuevo ejercicio"}
        </button>
      </div>

      {/* Formulario nuevo ejercicio */}
      {showAdd && (
        <div
          className="card mb16"
          style={{
            background: "rgba(232,197,71,.05)",
            border: "1px solid rgba(232,197,71,.25)",
          }}
        >
          <div className="card-title" style={{ fontSize: 15 }}>
            Nuevo ejercicio
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))",
              gap: 10,
              alignItems: "end",
            }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">ID</label>
              <input
                name="field_73"
                className="form-input"
                type="number"
                placeholder="auto"
                value={newEj.id}
                onChange={(e) =>
                  setNewEj((n) => ({ ...n, id: e.target.value }))
                }
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nombre</label>
              <input
                name="field_74"
                className="form-input"
                placeholder="Nombre del ejercicio"
                value={newEj.nombre}
                onChange={(e) =>
                  setNewEj((n) => ({ ...n, nombre: e.target.value }))
                }
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Categoría</label>
              <select
                name="field_75"
                className="form-select"
                value={newEj.categoria}
                onChange={(e) =>
                  setNewEj((n) => ({ ...n, categoria: e.target.value }))
                }
              >
                {CATEGORIAS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">% Base</label>
              <input
                name="field_76"
                className="form-input"
                type="number"
                min={0}
                max={200}
                placeholder="100"
                value={newEj.pct_base}
                onChange={(e) =>
                  setNewEj((n) => ({ ...n, pct_base: e.target.value }))
                }
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Referencia</label>
              <select
                name="field_77"
                className="form-select"
                value={newEj.base}
                onChange={(e) =>
                  setNewEj((n) => ({ ...n, base: e.target.value }))
                }
              >
                <option value="arranque">Arranque</option>
                <option value="envion">Envión</option>
                <option value="">Ninguna</option>
              </select>
            </div>
          </div>
          {error && (
            <div
              style={{
                color: "var(--red)",
                fontSize: 12,
                fontWeight: 600,
                marginTop: 8,
              }}
            >
              ⚠ {error}
            </div>
          )}
          <div
            style={{
              marginTop: 12,
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setShowAdd(false);
                setError("");
              }}
            >
              Cancelar
            </button>
            <button className="btn btn-gold btn-sm" onClick={addEj}>
              Agregar ejercicio
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card">
        <div className="flex gap12 mb14" style={{ flexWrap: "wrap" }}>
          <input
            name="field_78"
            className="form-input"
            style={{ maxWidth: 240 }}
            placeholder="Buscar por nombre o ID..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
          <select
            name="field_79"
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
            {filtered.length} ejercicios
          </span>
        </div>

        {/* Error en edición */}
        {error && editId && (
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
                <th style={{ width: 80, textAlign: "center" }}>% Base</th>
                <th style={{ width: 100 }}>Referencia</th>
                <th style={{ width: 80, textAlign: "right" }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const isEditing = editId === e.id;
                const row = isEditing ? editForm : e;
                return (
                  <tr
                    key={e.id}
                    style={{
                      background: isEditing
                        ? "rgba(232,197,71,.06)"
                        : "transparent",
                      cursor: isEditing ? "default" : "pointer",
                    }}
                    onClick={() => !isEditing && startEdit(e)}
                  >
                    {/* ID */}
                    <td onClick={(ev) => isEditing && ev.stopPropagation()}>
                      {isEditing ? (
                        <input
                          name="field_80"
                          style={{
                            ...inputStyle,
                            width: 60,
                            textAlign: "center",
                          }}
                          value={row.id ?? ""}
                          onChange={(ev) =>
                            setF(
                              "id",
                              ev.target.value === ""
                                ? ""
                                : Number(ev.target.value),
                            )
                          }
                          onKeyDown={(ev) => {
                            // Only allow digits, backspace, delete, arrows, tab
                            if (
                              !/[\d]/.test(ev.key) &&
                              ![
                                "Backspace",
                                "Delete",
                                "ArrowLeft",
                                "ArrowRight",
                                "Tab",
                                "Enter",
                              ].includes(ev.key)
                            ) {
                              ev.preventDefault();
                            }
                          }}
                          placeholder={String(e.id)}
                        />
                      ) : (
                        <span
                          style={{
                            fontFamily: "'Bebas Neue'",
                            fontSize: 16,
                            color: "var(--muted)",
                          }}
                        >
                          {e.id}
                        </span>
                      )}
                    </td>

                    {/* Nombre */}
                    <td onClick={(ev) => isEditing && ev.stopPropagation()}>
                      {isEditing ? (
                        <input
                          name="field_81"
                          style={{ ...inputStyle, minWidth: 250 }}
                          value={row.nombre}
                          onChange={(ev) => setF("nombre", ev.target.value)}
                        />
                      ) : (
                        <span style={{ fontWeight: 500 }}>{e.nombre}</span>
                      )}
                    </td>

                    {/* Categoría */}
                    <td onClick={(ev) => isEditing && ev.stopPropagation()}>
                      {isEditing ? (
                        <select
                          name="field_82"
                          style={inputStyle}
                          value={row.categoria}
                          onChange={(ev) => setF("categoria", ev.target.value)}
                        >
                          {CATEGORIAS.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className="badge"
                          style={{
                            background: `${CAT_COLOR[e.categoria]}20`,
                            color: CAT_COLOR[e.categoria],
                          }}
                        >
                          {e.categoria}
                        </span>
                      )}
                    </td>

                    {/* % Base */}
                    <td
                      style={{ textAlign: "center" }}
                      onClick={(ev) => isEditing && ev.stopPropagation()}
                    >
                      {isEditing ? (
                        <input
                          name="field_83"
                          type="number"
                          min={0}
                          max={200}
                          style={{
                            ...inputStyle,
                            width: 70,
                            textAlign: "center",
                          }}
                          value={row.pct_base}
                          onChange={(ev) => setF("pct_base", ev.target.value)}
                        />
                      ) : (
                        <span
                          style={{
                            fontFamily: "'Bebas Neue'",
                            fontSize: 16,
                            color: "var(--gold)",
                          }}
                        >
                          {e.pct_base || "—"}
                        </span>
                      )}
                    </td>

                    {/* Referencia */}
                    <td onClick={(ev) => isEditing && ev.stopPropagation()}>
                      {isEditing ? (
                        <select
                          name="field_84"
                          style={inputStyle}
                          value={row.base || ""}
                          onChange={(ev) => setF("base", ev.target.value)}
                        >
                          <option value="arranque">Arranque</option>
                          <option value="envion">Envión</option>
                          <option value="">Ninguna</option>
                        </select>
                      ) : (
                        <span className="text-sm text-muted">
                          {e.base || "—"}
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
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
                      ) : (
                        <button
                          className="btn btn-danger btn-xs"
                          onClick={() => setConfirmDel(e.id)}
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm delete modal */}
      {confirmDel !== null &&
        (() => {
          const ej = ejercicios.find((e) => e.id === confirmDel);
          return (
            <Modal
              title="Eliminar ejercicio"
              onClose={() => setConfirmDel(null)}
            >
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--text)",
                    marginBottom: 8,
                  }}
                >
                  ¿Estás seguro que querés eliminar este ejercicio?
                </div>
                <div
                  style={{
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "12px 16px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Bebas Neue'",
                      fontSize: 18,
                      color: "var(--gold)",
                    }}
                  >
                    {ej?.id} — {ej?.nombre}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      marginTop: 4,
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <span
                      className="badge"
                      style={{
                        background: `${CAT_COLOR[ej?.categoria]}20`,
                        color: CAT_COLOR[ej?.categoria],
                      }}
                    >
                      {ej?.categoria}
                    </span>
                    {ej?.pct_base && (
                      <span>
                        {ej.pct_base}% ({ej.base})
                      </span>
                    )}
                  </div>
                </div>
                <div
                  style={{ fontSize: 12, color: "var(--red)", marginTop: 10 }}
                >
                  Esta acción no se puede deshacer.
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-ghost"
                  onClick={() => setConfirmDel(null)}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => deleteEj(confirmDel)}
                >
                  Eliminar
                </button>
              </div>
            </Modal>
          );
        })()}
    </div>
  );
}
