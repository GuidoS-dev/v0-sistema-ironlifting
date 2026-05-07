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

export async function saveCoachSetting(coachId, settingKey, settingValue) {
  if (!coachId) return;
  await sb
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
    )
    .catch(() => {});
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
