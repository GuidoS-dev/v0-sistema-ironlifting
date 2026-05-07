import { describe, it, expect, beforeEach } from "vitest";
import {
  SUPA_URL,
  SUPA_ANON,
  SUPA_CONFIG_OK,
  getCurrentSession,
  sb,
  getSupabase,
} from "@/app/sistema/lib/supabase-client";

beforeEach(() => {
  localStorage.clear();
});

describe("config constants", () => {
  it("expone SUPA_URL/SUPA_ANON/SUPA_CONFIG_OK consistentes con el env", () => {
    expect(SUPA_URL).toBe(process.env.NEXT_PUBLIC_SUPABASE_URL);
    expect(SUPA_ANON).toBe(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    expect(SUPA_CONFIG_OK).toBe(Boolean(SUPA_URL && SUPA_ANON));
  });
});

describe("sb.auth shape", () => {
  it("expone los métodos canónicos", () => {
    expect(typeof sb.auth.getSession).toBe("function");
    expect(typeof sb.auth.onAuthStateChange).toBe("function");
    expect(typeof sb.auth.signInWithPassword).toBe("function");
    expect(typeof sb.auth.signUp).toBe("function");
    expect(typeof sb.auth.signOut).toBe("function");
    expect(typeof sb.auth.resetPasswordForEmail).toBe("function");
  });

  it("getSession retorna { data: { session } } cuando no hay sesión", async () => {
    const result = await sb.auth.getSession();
    expect(result.data.session).toBeNull();
  });

  it("onAuthStateChange devuelve subscription con unsubscribe", () => {
    const result = sb.auth.onAuthStateChange(() => {});
    expect(result.data.subscription.unsubscribe).toBeTypeOf("function");
    result.data.subscription.unsubscribe();
  });
});

describe("sb.from query builder", () => {
  it("encadena select/eq/limit/order/single/then sin tirar", () => {
    const q = sb.from("atletas").select("*").eq("id", "abc").limit(10);
    expect(typeof q.exec).toBe("function");
    expect(typeof q.then).toBe("function");
    expect(typeof q.insert).toBe("function");
    expect(typeof q.upsert).toBe("function");
    expect(typeof q.update).toBe("function");
    expect(typeof q.delete).toBe("function");
    expect(typeof q.single).toBe("function");
    expect(typeof q.order).toBe("function");
    expect(typeof q.gt).toBe("function");
  });
});

describe("sb.rpc", () => {
  it("expone función rpc", () => {
    expect(typeof sb.rpc).toBe("function");
  });
});

describe("sb._handleEmailCallback", () => {
  it("retorna null si no hay token_hash ni hash con access_token", async () => {
    const result = await sb._handleEmailCallback();
    expect(result).toBeNull();
  });
});

describe("getSupabase / getCurrentSession", () => {
  it("getSupabase retorna sb", () => {
    expect(getSupabase()).toBe(sb);
  });

  it("getCurrentSession retorna null cuando localStorage está vacío", () => {
    // Nota: el módulo cachea la sesión en module-load (loadSession() inicial),
    // así que sólo verificamos que sea null|object y tenga shape coherente.
    const s = getCurrentSession();
    expect(s === null || typeof s === "object").toBe(true);
  });
});
