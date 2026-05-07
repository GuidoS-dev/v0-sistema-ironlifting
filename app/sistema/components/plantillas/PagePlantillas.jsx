import { useState } from "react";
import { Files, Plus, Trash2 } from "lucide-react";
import { Modal } from "../common/Modal";
import { mkId } from "../../data/constantes";
import { PERIODOS, OBJETIVOS, NIVELES, ESCUELA_NIVELES, PERIODO_LABEL, OBJETIVO_LABEL, NIVEL_LABEL, ESCUELA_NIVEL_LABEL, ESCUELA_NIVEL_COLOR } from "../../data/plantillas-meta";
import { CrearPlantillaModal } from "./CrearPlantillaModal";
import { DuplicarPlantillaModal } from "./DuplicarPlantillaModal";
import { SectionHeader, CardGrid, NivelSection } from "../common/LayoutHelpers";

export function PagePlantillas({ plantillas, onAdd, onUpdate, onDelete, onOpen }) {
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showCrear, setShowCrear] = useState(false);
  const [showNueva, setShowNueva] = useState(false);
  const [duplicando, setDuplicando] = useState(null);
  const [showImportar, setShowImportar] = useState(false);
  const [colapsadoEscuela, setColapsadoEscuela] = useState({});
  const [colapsadoEscuelaMain, setColapsadoEscuelaMain] = useState(false);
  const [colapsadoPretemp, setColapsadoPretemp] = useState(false);
  const [colapsadoMias, setColapsadoMias] = useState(false);

  const escuela = plantillas.filter(
    (p) => p.escuela === true || p.escuela === "true",
  );
  const pretemporada = plantillas.filter(
    (p) => p.pretemporada === true || p.pretemporada === "true",
  );
  const mias = plantillas.filter(
    (p) =>
      (!p.escuela || p.escuela === false || p.escuela === "false") &&
      (!p.pretemporada ||
        p.pretemporada === false ||
        p.pretemporada === "false"),
  );

  const matchBusqueda = (p) =>
    !busqueda ||
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.descripcion?.toLowerCase().includes(busqueda.toLowerCase());

  const handleOpen = onOpen ? (plt) => onOpen(plt) : null;
  const handleDuplicate = (plt) => setDuplicando(plt);
  const handleEdit = (plt) => setEditando(plt);
  const handleDelete = (plt) => setConfirmDelete(plt);

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div className="page-title">Biblioteca de Plantillas</div>
          <div className="page-sub">
            {plantillas.length} plantilla{plantillas.length !== 1 ? "s" : ""}{" "}
            guardada{plantillas.length !== 1 ? "s" : ""}
            {escuela.length > 0 && ` · ${escuela.length} Escuela Inicial`}
            {pretemporada.length > 0 &&
              ` · ${pretemporada.length} Pretemporada`}
          </div>
        </div>
        <button className="btn btn-gold" onClick={() => setShowNueva(true)}>
          <Plus size={14} /> Nueva plantilla
        </button>
      </div>

      {/* Modal selector: crear desde cero o importar */}
      {showNueva && (
        <Modal title="Nueva plantilla" onClose={() => setShowNueva(false)}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: "8px 0",
            }}
          >
            <button
              className="btn btn-gold"
              onClick={() => {
                setShowNueva(false);
                setShowCrear(true);
              }}
              style={{
                padding: "14px 20px",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                gap: 10,
                justifyContent: "flex-start",
              }}
            >
              <Plus size={18} />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700 }}>Crear desde cero</div>
                <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 400 }}>
                  Plantilla nueva con estructura vacía
                </div>
              </div>
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setShowNueva(false);
                setShowImportar(true);
              }}
              style={{
                padding: "14px 20px",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                gap: 10,
                justifyContent: "flex-start",
                border: "1px solid var(--border)",
              }}
            >
              <Files size={18} />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700 }}>
                  Duplicar plantilla existente
                </div>
                <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 400 }}>
                  Copiá una plantilla como base y modificala
                </div>
              </div>
            </button>
          </div>
        </Modal>
      )}

      {showCrear && (
        <CrearPlantillaModal
          onSave={(p) => {
            onAdd(p);
            setShowCrear(false);
          }}
          onClose={() => setShowCrear(false)}
        />
      )}

      {/* Modal importar/duplicar desde plantilla existente */}
      {showImportar && (
        <DuplicarPlantillaModal
          plantillas={plantillas}
          onSave={(base, nombre, desc) => {
            const copia = {
              ...JSON.parse(JSON.stringify(base)),
              id: mkId(),
              nombre,
              descripcion: desc,
              creado: new Date().toISOString().slice(0, 10),
            };
            onAdd(copia);
            setShowImportar(false);
          }}
          onClose={() => setShowImportar(false)}
        />
      )}

      {/* Modal duplicar desde card */}
      {duplicando && (
        <DuplicarPlantillaModal
          plantillas={plantillas}
          base={duplicando}
          onSave={(base, nombre, desc) => {
            const copia = {
              ...JSON.parse(JSON.stringify(base)),
              id: mkId(),
              nombre,
              descripcion: desc,
              creado: new Date().toISOString().slice(0, 10),
            };
            onAdd(copia);
            setDuplicando(null);
          }}
          onClose={() => setDuplicando(null)}
        />
      )}

      {/* Buscador global */}
      {plantillas.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
          }}
        >
          <input
            name="field_63"
            style={{
              flex: 1,
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 14px",
              color: "var(--text)",
              fontSize: 13,
              outline: "none",
              fontFamily: "'DM Sans'",
            }}
            placeholder="Buscar plantilla..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              style={{
                background: "none",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </div>
      )}

      {plantillas.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "var(--surface)",
            borderRadius: 14,
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <div
            style={{
              fontFamily: "'Bebas Neue'",
              fontSize: 24,
              color: "var(--muted)",
              letterSpacing: ".05em",
              marginBottom: 8,
            }}
          >
            Sin plantillas aún
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--muted)",
              maxWidth: 360,
              margin: "0 auto",
            }}
          >
            Creá una plantilla nueva con el botón{" "}
            <strong style={{ color: "var(--text)" }}>Nueva plantilla</strong>, o
            guardá mesociclos desde la pestaña de cada atleta
          </div>
        </div>
      ) : (
        <>
          {/* ── SECCIÓN ESCUELA INICIAL ── */}
          {escuela.length > 0 && (
            <SectionHeader
              title="Escuela Inicial"
              count={escuela.filter(matchBusqueda).length}
              color="#4db6ac"
              badge={`${ESCUELA_NIVELES.filter((n) => escuela.some((p) => p.escuela_nivel === n)).length} niveles`}
              collapsed={colapsadoEscuelaMain}
              onToggle={() => setColapsadoEscuelaMain((v) => !v)}
            >
              {ESCUELA_NIVELES.map((n) => (
                <NivelSection
                  key={n}
                  nivel={n}
                  pltList={escuela.filter((p) => p.escuela_nivel === n)}
                  colapsadoEscuela={colapsadoEscuela}
                  setColapsadoEscuela={setColapsadoEscuela}
                  matchBusqueda={matchBusqueda}
                  onOpen={handleOpen}
                  onDuplicate={handleDuplicate}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
              {/* Plantillas de escuela sin nivel asignado */}
              {(() => {
                const sinNivel = escuela
                  .filter(
                    (p) =>
                      !p.escuela_nivel ||
                      !ESCUELA_NIVELES.includes(p.escuela_nivel),
                  )
                  .filter(matchBusqueda);
                return sinNivel.length > 0 ? (
                  <div style={{ marginTop: 8 }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        marginBottom: 8,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                      }}
                    >
                      Sin nivel asignado
                    </div>
                    <CardGrid
                      lista={sinNivel}
                      onOpen={handleOpen}
                      onDuplicate={handleDuplicate}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  </div>
                ) : null;
              })()}
            </SectionHeader>
          )}

          {/* ── SECCIÓN PRETEMPORADA ── */}
          {pretemporada.filter(matchBusqueda).length > 0 && (
            <SectionHeader
              title="Pretemporada"
              count={pretemporada.filter(matchBusqueda).length}
              color="#ff9800"
              collapsed={colapsadoPretemp}
              onToggle={() => setColapsadoPretemp((v) => !v)}
            >
              <CardGrid
                lista={pretemporada.filter(matchBusqueda)}
                onOpen={handleOpen}
                onDuplicate={handleDuplicate}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </SectionHeader>
          )}

          {/* ── SECCIÓN MIS PLANTILLAS ── */}
          {mias.filter(matchBusqueda).length > 0 && (
            <SectionHeader
              title="Mis Plantillas"
              count={mias.filter(matchBusqueda).length}
              color="var(--gold)"
              collapsed={colapsadoMias}
              onToggle={() => setColapsadoMias((v) => !v)}
            >
              <CardGrid
                lista={mias.filter(matchBusqueda)}
                onOpen={handleOpen}
                onDuplicate={handleDuplicate}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </SectionHeader>
          )}

          {busqueda &&
            escuela.filter(matchBusqueda).length === 0 &&
            pretemporada.filter(matchBusqueda).length === 0 &&
            mias.filter(matchBusqueda).length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: 40,
                  color: "var(--muted)",
                  fontSize: 13,
                }}
              >
                No hay plantillas con ese nombre
              </div>
            )}
        </>
      )}

      {/* Modal editar metadatos */}
      {editando && (
        <Modal
          title="Editar plantilla"
          onClose={() => {
            onUpdate(editando);
            setEditando(null);
          }}
        >
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input
              name="field_64"
              className="form-input"
              value={editando.nombre}
              onChange={(e) =>
                setEditando((p) => ({ ...p, nombre: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea
              name="field_65"
              className="form-input"
              value={editando.descripcion || ""}
              onChange={(e) =>
                setEditando((p) => ({ ...p, descripcion: e.target.value }))
              }
              rows={2}
              style={{ resize: "vertical" }}
            />
          </div>

          {/* Selector tipo en edición */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {[
              { key: "regular", label: "Regular", color: "var(--gold)" },
              { key: "escuela", label: "Escuela Inicial", color: "#4db6ac" },
              { key: "pretemporada", label: "Pretemporada", color: "#ff9800" },
            ].map((opt) => {
              const active =
                opt.key === "escuela"
                  ? editando.escuela
                  : opt.key === "pretemporada"
                    ? editando.pretemporada
                    : !editando.escuela && !editando.pretemporada;
              return (
                <button
                  key={opt.key}
                  onClick={() => {
                    if (opt.key === "escuela") {
                      setEditando((p) => ({
                        ...p,
                        escuela: true,
                        pretemporada: false,
                      }));
                    } else if (opt.key === "pretemporada") {
                      setEditando((p) => ({
                        ...p,
                        escuela: false,
                        pretemporada: true,
                      }));
                    } else {
                      setEditando((p) => ({
                        ...p,
                        escuela: false,
                        pretemporada: false,
                      }));
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: active
                      ? `2px solid ${opt.color}`
                      : "1px solid var(--border)",
                    background: active ? `${opt.color}18` : "var(--surface2)",
                    color: active ? opt.color : "var(--muted)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "'DM Sans'",
                    transition: "all .15s",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {editando.escuela && (
            <>
              <div className="form-group">
                <label className="form-label">Nivel de Escuela</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {ESCUELA_NIVELES.map((n) => (
                    <button
                      key={n}
                      onClick={() =>
                        setEditando((p) => ({ ...p, escuela_nivel: n }))
                      }
                      style={{
                        padding: "5px 14px",
                        borderRadius: 20,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 700,
                        transition: "all .15s",
                        background:
                          editando.escuela_nivel === n
                            ? ESCUELA_NIVEL_COLOR[n]
                            : "var(--surface2)",
                        color:
                          editando.escuela_nivel === n
                            ? "#fff"
                            : "var(--muted)",
                      }}
                    >
                      {ESCUELA_NIVEL_LABEL[n]}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {!editando.escuela && !editando.pretemporada && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              {[
                [
                  "periodo",
                  "Período",
                  PERIODOS.map((p) => [p, PERIODO_LABEL[p]]),
                ],
                [
                  "objetivo",
                  "Objetivo",
                  OBJETIVOS.map((o) => [o, OBJETIVO_LABEL[o]]),
                ],
                ["nivel", "Nivel", NIVELES.map((n) => [n, NIVEL_LABEL[n]])],
              ].map(([k, lbl, opts]) => (
                <div key={k} className="form-group">
                  <label className="form-label">{lbl}</label>
                  <select
                    name="field_66"
                    className="form-select"
                    value={editando[k]}
                    onChange={(e) =>
                      setEditando((p) => ({ ...p, [k]: e.target.value }))
                    }
                  >
                    {opts.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
          <div
            className="flex gap8 mt16"
            style={{ justifyContent: "flex-end" }}
          >
            <button className="btn btn-ghost" onClick={() => setEditando(null)}>
              Cancelar
            </button>
            <button
              className="btn btn-gold"
              onClick={() => {
                onUpdate(editando);
                setEditando(null);
              }}
            >
              Guardar cambios
            </button>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal
          title="Eliminar plantilla"
          onClose={() => setConfirmDelete(null)}
        >
          <p style={{ fontSize: 13, color: "var(--text)", marginBottom: 16 }}>
            ¿Eliminar <strong>{confirmDelete.nombre}</strong>? Esta acción no se
            puede deshacer.
          </p>
          <div className="flex gap8" style={{ justifyContent: "flex-end" }}>
            <button
              className="btn btn-ghost"
              onClick={() => setConfirmDelete(null)}
            >
              Cancelar
            </button>
            <button
              className="btn"
              style={{ background: "var(--red)", color: "#fff" }}
              onClick={() => {
                onDelete(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              <Trash2 size={14} /> Eliminar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
