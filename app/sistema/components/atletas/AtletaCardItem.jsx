import { User } from "lucide-react";
import { formatDateDisplay, getAgeFromBirthDate, parseAppDate } from "../../lib/ciclo-menstrual";

export function AtletaCardItem({
  a,
  mesociclos,
  coachId,
  onSelect,
  onEdit,
  onDelete,
}) {
  const mesoAtleta = mesociclos
    .filter((m) => m.atleta_id === a.id)
    .sort(
      (x, y) =>
        (parseAppDate(y.fecha_inicio)?.getTime() || 0) -
        (parseAppDate(x.fecha_inicio)?.getTime() || 0),
    );
  const mesoActivo = mesoAtleta.find((m) => m.activo) || mesoAtleta[0];
  const edad = getAgeFromBirthDate(a.fecha_nacimiento);
  return (
    <div className="atleta-card" onClick={() => onSelect(a)}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div
          className="atleta-avatar"
          style={{
            background:
              a.tipo === "asesoria"
                ? "rgba(71,180,232,.15)"
                : "var(--surface3)",
            color: a.tipo === "asesoria" ? "var(--blue)" : "var(--gold)",
          }}
        >
          {a.nombre.charAt(0).toUpperCase()}
        </div>
        <div
          title={
            a.profile_id
              ? "Vinculado a cuenta de usuario"
              : "Sin cuenta vinculada"
          }
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "var(--bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid var(--surface)",
          }}
        >
          <User
            size={10}
            style={{ color: a.profile_id ? "var(--green)" : "var(--muted)" }}
          />
        </div>
      </div>
      <div className="atleta-info">
        <div className="atleta-name">{a.nombre}</div>
        <div className="atleta-meta">
          {a.email}
          {a.telefono && ` · ${a.telefono}`}
          {edad !== null && ` · ${edad} años`}
        </div>
        {mesoActivo ? (
          <div className="flex gap8 mt8" style={{ flexWrap: "wrap" }}>
            <span
              className={
                "badge " +
                (mesoActivo.modo === "Competitivo"
                  ? "badge-gold"
                  : "badge-blue")
              }
            >
              {mesoActivo.modo}
            </span>
            <span className={mesoActivo.activo ? "badge badge-green" : "badge"}>
              {mesoActivo.activo ? "Activo" : "Inactivo"}
            </span>
            {mesoActivo.nombre && (
              <span
                style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}
              >
                {mesoActivo.nombre}
              </span>
            )}
            <span className="text-sm text-muted">
              {formatDateDisplay(mesoActivo.fecha_inicio)}
            </span>
            {(mesoActivo.irm_arranque || mesoActivo.irm_envion) && (
              <span
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "nowrap",
                  alignItems: "center",
                }}
              >
                {mesoActivo.irm_arranque && (
                  <span className="text-sm text-muted">
                    ARR:{" "}
                    <strong style={{ color: "var(--gold)" }}>
                      {mesoActivo.irm_arranque}
                    </strong>
                    kg
                  </span>
                )}
                {mesoActivo.irm_envion && (
                  <span className="text-sm text-muted">
                    ENV:{" "}
                    <strong style={{ color: "var(--blue)" }}>
                      {mesoActivo.irm_envion}
                    </strong>
                    kg
                  </span>
                )}
              </span>
            )}
          </div>
        ) : (
          <div className="mt8">
            <span
              className="badge"
              style={{ background: "var(--surface3)", color: "var(--muted)" }}
            >
              Sin mesociclo
            </span>
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 4,
        }}
      >
        <div className="flex gap8">
          <button
            className="btn btn-ghost btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(a);
            }}
          >
            Editar
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(a.id, e);
            }}
          >
            x
          </button>
        </div>
        {mesoActivo?._updated_at && (
          <span
            style={{
              fontSize: 9,
              color: "var(--muted)",
              opacity: 0.6,
              whiteSpace: "nowrap",
            }}
            title={`Última edición: ${new Date(mesoActivo._updated_at).toLocaleString()}`}
          >
            ed.{" "}
            {(() => {
              const _d = new Date(mesoActivo._updated_at);
              return `${String(_d.getDate()).padStart(2, "0")}-${String(_d.getMonth() + 1).padStart(2, "0")}-${_d.getFullYear()} ${String(_d.getHours()).padStart(2, "0")}:${String(_d.getMinutes()).padStart(2, "0")}`;
            })()}{" "}
            <span
              style={{
                fontWeight: 700,
                color: coachId ? "var(--green)" : "var(--blue)",
              }}
            >
              {coachId ? "DB" : "LO"}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
