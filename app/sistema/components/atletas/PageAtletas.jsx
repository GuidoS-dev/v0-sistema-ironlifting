import { useState, useEffect } from "react";
import { ChevronLeft, Copy, Plus, Trash2 } from "lucide-react";
import { Modal } from "../common/Modal";
import { mkId } from "../../data/constantes";
import { sb, SUPA_CONFIG_OK } from "../../lib/supabase-client";
import { formatDateDisplay, parseAppDate } from "../../lib/ciclo-menstrual";
import { LogoIL } from "../common/Logos";
import { AtletaCardItem } from "./AtletaCardItem";
import { AtletaForm } from "./AtletaForm";
import { AlumnoSectionHeader } from "../common/LayoutHelpers";

export function PageAtletas({
  atletas,
  setAtletas,
  mesociclos,
  setMesociclos,
  onSelect,
  coachId,
}) {
  const [showForm, setShowForm] = useState(false);
  const [tipoInicial, setTipoInicial] = useState("atleta");
  const [editAtleta, setEditAtleta] = useState(null);
  const [previewAtleta, setPreviewAtleta] = useState(null);
  const [expandedAtletas, setExpandedAtletas] = useState(false);
  const [expandedAsesorias, setExpandedAsesorias] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const MAX_VISIBLE = 4;

  // Load registered athlete users for the selector
  useEffect(() => {
    if (!SUPA_CONFIG_OK) return;
    sb.from("profiles")
      .select("id, nombre, email")
      .eq("rol", "atleta")
      .then(({ data }) => {
        if (data) setRegisteredUsers(data);
      })
      .catch(() => {});
  }, []);

  const saveAtleta = (a) => {
    setAtletas((prev) => {
      const idx = prev.findIndex((x) => x.id === a.id);
      return idx >= 0 ? prev.map((x) => (x.id === a.id ? a : x)) : [...prev, a];
    });
    setShowForm(false);
    setEditAtleta(null);
  };

  const [confirmDeleteAtleta, setConfirmDeleteAtleta] = useState(null);
  const deleteAtleta = (id, e) => {
    e.stopPropagation();
    const atleta = atletas.find((a) => a.id === id);
    setConfirmDeleteAtleta(atleta);
  };

  const atletasGrupo = atletas.filter((a) => a.tipo !== "asesoria");
  const asesorias = atletas.filter((a) => a.tipo === "asesoria");

  const renderCard = (a) => (
    <AtletaCardItem
      key={a.id}
      a={a}
      mesociclos={mesociclos}
      coachId={coachId}
      onSelect={() => setPreviewAtleta(a)}
      onEdit={setEditAtleta}
      onDelete={deleteAtleta}
    />
  );

  const previewMesos = previewAtleta
    ? mesociclos
        .filter((m) => m.atleta_id === previewAtleta.id)
        .sort(
          (x, y) =>
            (parseAppDate(y.fecha_inicio)?.getTime() || 0) -
            (parseAppDate(x.fecha_inicio)?.getTime() || 0),
        )
    : [];

  const [confirmDeletePreviewMeso, setConfirmDeletePreviewMeso] =
    useState(null);

  const previewSetActivo = (m) => {
    const willBeActive = !m.activo;
    setMesociclos((prev) =>
      prev.map((x) =>
        x.atleta_id === previewAtleta.id
          ? { ...x, activo: willBeActive && x.id === m.id }
          : x,
      ),
    );
  };

  const previewDuplicarMeso = (meso) => {
    const newId = mkId();
    const dup = {
      ...JSON.parse(JSON.stringify(meso)),
      id: newId,
      activo: false,
      nombre: (meso.nombre || "Mesociclo") + " (copia)",
      fecha_inicio: new Date().toISOString().slice(0, 10),
      semanas: (meso.semanas || []).map((s) => ({
        ...s,
        id: mkId(),
        turnos: (s.turnos || []).map((t) => ({
          ...t,
          id: mkId(),
          ejercicios: (t.ejercicios || []).map((e) => ({ ...e, id: mkId() })),
        })),
      })),
    };
    setMesociclos((prev) => [...prev, dup]);
  };

  return (
    <div>
      <div className="flex-between mb20">
        <div>
          <div className="page-title">Alumnos</div>
          <div className="page-sub">
            {atletas.length} registrados · {atletasGrupo.length} atletas ·{" "}
            {asesorias.length} asesorías
          </div>
        </div>
      </div>

      {atletas.length === 0 ? (
        <div className="card text-center" style={{ padding: 48 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <LogoIL size={80} />
          </div>
          <div
            style={{
              fontSize: 18,
              fontFamily: "'Bebas Neue'",
              color: "var(--muted)",
            }}
          >
            No hay alumnos todavía
          </div>
          <div className="text-sm text-muted mt8 mb16">
            Creá tu primer atleta o asesoría
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              className="btn btn-gold"
              onClick={() => {
                setShowForm(true);
              }}
            >
              <Plus size={14} /> Atleta
            </button>
            <button
              className="btn"
              style={{ background: "var(--blue)", color: "#fff" }}
              onClick={() => {
                setShowForm(true);
              }}
            >
              <Plus size={14} /> Asesoría
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* ── Atletas ─────────────────────────────────────── */}
          <div>
            <AlumnoSectionHeader
              title="Atletas"
              count={atletasGrupo.length}
              color="var(--gold)"
              onAdd={() => {
                setTipoInicial("atleta");
                setShowForm(true);
              }}
            />
            {atletasGrupo.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "var(--muted)",
                  fontSize: 12,
                  background: "var(--surface2)",
                  borderRadius: 8,
                }}
              >
                No hay atletas.{" "}
                <button
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--gold)",
                    cursor: "pointer",
                    textDecoration: "underline",
                    fontSize: 12,
                  }}
                  onClick={() => {
                    setTipoInicial("atleta");
                    setShowForm(true);
                  }}
                >
                  Crear uno
                </button>
              </div>
            ) : (
              (() => {
                const visible = expandedAtletas
                  ? atletasGrupo
                  : atletasGrupo.slice(0, MAX_VISIBLE);
                const hasMore = atletasGrupo.length > MAX_VISIBLE;
                return (
                  <>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        maxHeight:
                          hasMore && !expandedAtletas
                            ? `${MAX_VISIBLE * 90}px`
                            : "none",
                        overflowY:
                          hasMore && !expandedAtletas ? "hidden" : "visible",
                        position: "relative",
                      }}
                    >
                      {visible.map((a) => renderCard(a))}
                      {!expandedAtletas && hasMore && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: 60,
                            background:
                              "linear-gradient(transparent, var(--background))",
                            pointerEvents: "none",
                          }}
                        />
                      )}
                    </div>
                    {hasMore && (
                      <button
                        onClick={() => setExpandedAtletas((e) => !e)}
                        style={{
                          width: "100%",
                          marginTop: 8,
                          padding: "8px",
                          background: "var(--surface2)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          color: "var(--gold)",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: "'DM Sans'",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        {expandedAtletas ? (
                          <>
                            <ChevronLeft
                              size={14}
                              style={{ transform: "rotate(90deg)" }}
                            />{" "}
                            Ver menos
                          </>
                        ) : (
                          <>
                            <ChevronLeft
                              size={14}
                              style={{ transform: "rotate(-90deg)" }}
                            />{" "}
                            Ver {atletasGrupo.length - MAX_VISIBLE} más
                          </>
                        )}
                      </button>
                    )}
                  </>
                );
              })()
            )}
          </div>

          {/* ── Asesorías ────────────────────────────────────── */}
          <div>
            <AlumnoSectionHeader
              title="Asesorías"
              count={asesorias.length}
              color="var(--blue)"
              onAdd={() => {
                setTipoInicial("asesoria");
                setShowForm(true);
              }}
            />
            {asesorias.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "var(--muted)",
                  fontSize: 12,
                  background: "var(--surface2)",
                  borderRadius: 8,
                }}
              >
                No hay asesorías.{" "}
                <button
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--blue)",
                    cursor: "pointer",
                    textDecoration: "underline",
                    fontSize: 12,
                  }}
                  onClick={() => {
                    setTipoInicial("asesoria");
                    setShowForm(true);
                  }}
                >
                  Crear una
                </button>
              </div>
            ) : (
              (() => {
                const visible = expandedAsesorias
                  ? asesorias
                  : asesorias.slice(0, MAX_VISIBLE);
                const hasMore = asesorias.length > MAX_VISIBLE;
                return (
                  <>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        maxHeight:
                          hasMore && !expandedAsesorias
                            ? `${MAX_VISIBLE * 90}px`
                            : "none",
                        overflowY:
                          hasMore && !expandedAsesorias ? "hidden" : "visible",
                        position: "relative",
                      }}
                    >
                      {visible.map((a) => renderCard(a))}
                      {!expandedAsesorias && hasMore && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: 60,
                            background:
                              "linear-gradient(transparent, var(--background))",
                            pointerEvents: "none",
                          }}
                        />
                      )}
                    </div>
                    {hasMore && (
                      <button
                        onClick={() => setExpandedAsesorias((e) => !e)}
                        style={{
                          width: "100%",
                          marginTop: 8,
                          padding: "8px",
                          background: "var(--surface2)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          color: "var(--blue)",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: "'DM Sans'",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        {expandedAsesorias ? (
                          <>
                            <ChevronLeft
                              size={14}
                              style={{ transform: "rotate(90deg)" }}
                            />{" "}
                            Ver menos
                          </>
                        ) : (
                          <>
                            <ChevronLeft
                              size={14}
                              style={{ transform: "rotate(-90deg)" }}
                            />{" "}
                            Ver {asesorias.length - MAX_VISIBLE} más
                          </>
                        )}
                      </button>
                    )}
                  </>
                );
              })()
            )}
          </div>
        </div>
      )}
      {(showForm || editAtleta) && (
        <AtletaForm
          atleta={editAtleta}
          tipoInicial={tipoInicial}
          registeredUsers={registeredUsers}
          onSave={saveAtleta}
          onClose={() => {
            setShowForm(false);
            setEditAtleta(null);
          }}
        />
      )}

      {confirmDeleteAtleta && (
        <Modal
          title="Eliminar atleta"
          onClose={() => setConfirmDeleteAtleta(null)}
        >
          <p style={{ fontSize: 13, color: "var(--text)", marginBottom: 8 }}>
            ¿Eliminar a <strong>{confirmDeleteAtleta.nombre}</strong>?
          </p>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>
            Se eliminarán también todos sus mesociclos. Esta acción no se puede
            deshacer.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              className="btn btn-ghost"
              onClick={() => setConfirmDeleteAtleta(null)}
            >
              Cancelar
            </button>
            <button
              className="btn"
              style={{ background: "var(--red)", color: "#fff" }}
              onClick={() => {
                setAtletas((prev) =>
                  prev.filter((a) => a.id !== confirmDeleteAtleta.id),
                );
                setConfirmDeleteAtleta(null);
              }}
            >
              <Trash2 size={14} /> Eliminar atleta
            </button>
          </div>
        </Modal>
      )}

      {previewAtleta && (
        <Modal
          title={`Historial · ${previewAtleta.nombre}`}
          onClose={() => setPreviewAtleta(null)}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 10,
            }}
          >
            <button
              className="btn btn-gold btn-sm"
              onClick={() => {
                onSelect(previewAtleta, {
                  view: "historial",
                  openNewMeso: true,
                });
                setPreviewAtleta(null);
              }}
            >
              <Plus size={13} /> Nuevo mesociclo
            </button>
          </div>

          {previewMesos.length === 0 ? (
            <div
              style={{
                fontSize: 12,
                color: "var(--muted)",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 12,
              }}
            >
              Este atleta no tiene mesociclos todavía.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {previewMesos.map((m) => (
                <div
                  key={m.id}
                  className="historial-row"
                  style={{
                    marginBottom: 0,
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    border: m.activo
                      ? "1px solid rgba(71,232,160,.4)"
                      : undefined,
                    background: m.activo ? "rgba(71,232,160,.04)" : undefined,
                  }}
                >
                  <div className="historial-fecha">
                    {formatDateDisplay(m.fecha_inicio)}
                  </div>
                  <div className="historial-info">
                    <div className="historial-name">
                      {m.nombre || "Mesociclo sin nombre"}
                    </div>
                    <div className="historial-marks">
                      {m.modo} · {m.volumen_total || 0} reps
                      {m.activo ? " · Activo" : ""}
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", gap: 4, alignItems: "center" }}
                  >
                    <button
                      className="btn btn-xs"
                      title={m.activo ? "Desactivar" : "Activar"}
                      style={{
                        background: m.activo
                          ? "rgba(71,232,160,.15)"
                          : "transparent",
                        color: m.activo ? "var(--green)" : "var(--muted)",
                        border: `1px solid ${m.activo ? "rgba(71,232,160,.4)" : "var(--border)"}`,
                        borderRadius: 6,
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: 11,
                        padding: "3px 8px",
                      }}
                      onClick={() => previewSetActivo(m)}
                    >
                      {m.activo ? "● Activo" : "Activar"}
                    </button>
                    <button
                      className="btn btn-ghost btn-xs"
                      title="Duplicar"
                      style={{ padding: "3px 5px" }}
                      onClick={() => previewDuplicarMeso(m)}
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      className="btn btn-ghost btn-xs"
                      title="Eliminar"
                      style={{ padding: "3px 5px", color: "var(--red)" }}
                      onClick={() => setConfirmDeletePreviewMeso(m)}
                    >
                      <Trash2 size={12} />
                    </button>
                    <button
                      className="btn btn-gold btn-sm"
                      style={{ fontSize: 11, padding: "3px 10px" }}
                      onClick={() => {
                        onSelect(previewAtleta, { view: "meso", mesoId: m.id });
                        setPreviewAtleta(null);
                      }}
                    >
                      Abrir planilla
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="modal-footer">
            <button
              className="btn btn-ghost"
              onClick={() => setPreviewAtleta(null)}
            >
              Cerrar
            </button>
          </div>
        </Modal>
      )}

      {confirmDeletePreviewMeso && (
        <Modal
          title="Eliminar mesociclo"
          onClose={() => setConfirmDeletePreviewMeso(null)}
        >
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            ¿Eliminar{" "}
            <strong>
              {confirmDeletePreviewMeso.nombre || "este mesociclo"}
            </strong>
            ?
          </p>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>
            Se perderán todos los datos del ciclo. Esta acción no se puede
            deshacer.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              className="btn btn-ghost"
              onClick={() => setConfirmDeletePreviewMeso(null)}
            >
              Cancelar
            </button>
            <button
              className="btn"
              style={{ background: "var(--red)", color: "#fff" }}
              onClick={() => {
                setMesociclos((prev) =>
                  prev.filter((m) => m.id !== confirmDeletePreviewMeso.id),
                );
                setConfirmDeletePreviewMeso(null);
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
