import { sb } from "./supabase-client";

export const COACH_SETTING_KEYS = {
  normativos: "normativos_globales",
  tablas: "tablas_calculadora",
};

export async function loadCoachSetting(coachId, settingKey) {
  const row = await loadCoachSettingRow(coachId, settingKey);
  return row?.setting_value ?? null;
}

export async function loadCoachSettingRow(coachId, settingKey) {
  if (!coachId) return null;
  const { data, error } = await sb
    .from("coach_settings")
    .select("setting_value,updated_at")
    .eq("coach_id", coachId)
    .eq("setting_key", settingKey)
    .single()
    .exec();
  if (error || !data) return null;
  return data;
}

// Returns true on success, false on failure. Existing callers that ignore the
// return value continue to work — only new callers that need to know whether
// the upsert actually persisted should check the result.
export async function saveCoachSetting(coachId, settingKey, settingValue) {
  if (!coachId) return false;
  try {
    const res = await sb
      .from("coach_settings")
      .upsert(
        [
          {
            coach_id: coachId,
            setting_key: settingKey,
            setting_value: settingValue,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "coach_id,setting_key" },
      );
    // Supabase resolves with { data, error } — the previous .catch only caught
    // network/runtime throws, never actual Postgres errors. Inspect explicitly.
    if (res && res.error) return false;
    return true;
  } catch {
    return false;
  }
}

export async function resolveSharedCoachId(coachId) {
  if (!coachId) return null;
  const { data, error } = await sb
    .from("coach_shared_workspace")
    .select("workspace_owner_id")
    .eq("coach_id", coachId)
    .limit(1)
    .exec();

  if (error || !data || !data[0]?.workspace_owner_id) return coachId;
  return data[0].workspace_owner_id;
}
