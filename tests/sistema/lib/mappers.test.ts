import { describe, it, expect, beforeEach } from "vitest";
import {
  atletaToDb,
  atletaFromDb,
  mesoToDb,
  mesoFromDb,
  plantillaToDb,
  plantillaFromDb,
} from "@/app/sistema/lib/mappers";

beforeEach(() => {
  localStorage.clear();
});

describe("atletaToDb", () => {
  it("mapea campos básicos y aplica title-case al nombre", () => {
    const out = atletaToDb(
      {
        id: "a1",
        nombre: "juan pérez",
        email: "j@p.com",
        telefono: "123",
        fecha_nacimiento: "1990-01-01",
        notas: "n",
        tipo: "atleta",
        genero: "f",
        ciclo: { ultimoCiclo: "2024-10-01" },
        profile_id: "p1",
      },
      "coach-1",
    );
    expect(out.coach_id).toBe("coach-1");
    expect(out.app_id).toBe("a1");
    expect(out.nombre).toBe("Juan Pérez");
    expect(out.email).toBe("j@p.com");
    expect(out.genero).toBe("f");
    expect(out.ciclo).toBe(JSON.stringify({ ultimoCiclo: "2024-10-01" }));
    expect(out.profile_id).toBe("p1");
    expect(typeof out.updated_at).toBe("string");
  });

  it("aplica defaults cuando faltan campos", () => {
    const out = atletaToDb({ id: "a1" }, "c1");
    expect(out.nombre).toBe("");
    expect(out.email).toBe("");
    expect(out.tipo).toBe("atleta");
    expect(out.genero).toBe("m");
    expect(out.ciclo).toBeNull();
    expect(out.profile_id).toBeNull();
  });

  it("respeta options.pctOverrides y options.normativosOverrides", () => {
    const out = atletaToDb({ id: "a1" }, "c1", {
      pctOverrides: { foo: 1 },
      normativosOverrides: { bar: 2 },
    });
    expect(out.pct_overrides).toEqual({ foo: 1 });
    expect(out.normativos_overrides).toEqual({ bar: 2 });
  });
});

describe("atletaFromDb", () => {
  it("mapea row de DB y parsea ciclo si es string", () => {
    const result = atletaFromDb({
      app_id: "a1",
      nombre: "juan pérez",
      email: "j@p.com",
      telefono: "1",
      fecha_nacimiento: "1990-01-01",
      notas: "n",
      tipo: "atleta",
      genero: "f",
      ciclo: JSON.stringify({ x: 1 }),
      profile_id: "p1",
      updated_at: "2024-01-01",
    });
    expect(result.id).toBe("a1");
    expect(result.nombre).toBe("Juan Pérez");
    expect(result.ciclo).toEqual({ x: 1 });
    expect(result._updated_at).toBe("2024-01-01");
  });

  it("retorna ciclo=null ante JSON inválido", () => {
    const result = atletaFromDb({ app_id: "a1", nombre: "n", ciclo: "{not-json" });
    expect(result.ciclo).toBeNull();
  });

  it("default genero=m", () => {
    expect(atletaFromDb({ app_id: "a1", nombre: "n" }).genero).toBe("m");
  });
});

describe("mesoToDb", () => {
  it("mapea campos y aplica defaults", () => {
    const out = mesoToDb({ id: "m1", atleta_id: "a1" }, "c1");
    expect(out.coach_id).toBe("c1");
    expect(out.app_id).toBe("m1");
    expect(out.app_atleta_id).toBe("a1");
    expect(out.modo).toBe("Preparatorio");
    expect(out.activo).toBe(false);
    expect(out.semanas).toEqual([]);
    expect(out.overrides._meta).toBeDefined();
  });

  it("usa options.overrides cuando se provee", () => {
    const out = mesoToDb({ id: "m1" }, "c1", { overrides: { custom: true } } as any);
    expect(out.overrides).toEqual({ custom: true });
  });
});

describe("mesoFromDb", () => {
  it("extrae meta de overrides._meta", () => {
    const result = mesoFromDb({
      app_id: "m1",
      app_atleta_id: "a1",
      nombre: "Meso 1",
      semanas: [],
      overrides: {
        _meta: {
          escuela: true,
          escuela_nivel: "3",
          num_bloques_basica: 5,
          distribucion: "lineal",
          pretemporada: true,
        },
      },
    });
    expect(result.escuela).toBe(true);
    expect(result.escuela_nivel).toBe("3");
    expect(result.num_bloques_basica).toBe(5);
    expect(result.distribucion).toBe("lineal");
    expect(result.pretemporada).toBe(true);
  });

  it("aplica defaults cuando _meta no existe", () => {
    const result = mesoFromDb({ app_id: "m1", overrides: {} });
    expect(result.escuela).toBe(false);
    expect(result.escuela_nivel).toBe("1");
    expect(result.num_bloques_basica).toBe(3);
    expect(result.distribucion).toBeNull();
    expect(result.pretemporada).toBe(false);
  });
});

describe("plantillaToDb / plantillaFromDb", () => {
  it("inyecta meta dentro de overrides._meta y la recupera al volver", () => {
    const dbRow = plantillaToDb(
      {
        id: "p1",
        nombre: "Plantilla 1",
        descripcion: "desc",
        tipo: "meso",
        periodo: "competitivo",
        objetivo: "fuerza",
        nivel: "elite",
        modo: "Competitivo",
        escuela: true,
        escuela_nivel: "5",
        num_bloques_basica: 4,
        pretemporada: true,
      },
      "c1",
    );
    expect(dbRow.overrides._meta).toEqual({
      escuela: true,
      escuela_nivel: "5",
      num_bloques_basica: 4,
      pretemporada: true,
    });
    const back = plantillaFromDb({
      ...dbRow,
      app_id: dbRow.app_id,
      created_at: "2024-05-01T10:00:00Z",
    });
    expect(back.escuela).toBe(true);
    expect(back.escuela_nivel).toBe("5");
    expect(back.num_bloques_basica).toBe(4);
    expect(back.pretemporada).toBe(true);
    expect(back.creado).toBe("2024-05-01");
  });

  it("plantillaToDb aplica defaults", () => {
    const out = plantillaToDb({ id: "p1" }, "c1");
    expect(out.tipo).toBe("meso");
    expect(out.periodo).toBe("general");
    expect(out.objetivo).toBe("mixto");
    expect(out.nivel).toBe("intermedio");
    expect(out.modo).toBe("Preparatorio");
  });

  it("plantillaFromDb hace fallback a campos top-level si _meta no existe", () => {
    const result = plantillaFromDb({
      app_id: "p1",
      nombre: "n",
      escuela: true,
      escuela_nivel: "2",
      num_bloques_basica: 5,
      pretemporada: true,
    });
    expect(result.escuela).toBe(true);
    expect(result.escuela_nivel).toBe("2");
    expect(result.num_bloques_basica).toBe(5);
    expect(result.pretemporada).toBe(true);
  });
});
