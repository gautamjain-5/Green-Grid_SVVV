import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_ON } from "@/lib/campus-devices";

export interface Control { device_id: string; is_on: boolean; auto_mode: boolean; setpoint: number; fan_speed: number; updated_at: string }
export interface LogRow { id: string; device_id: string; action: string; created_at: string }

/** Admin device switches stored in Lovable Cloud, synced live across admins. */
export function useDeviceControls() {
  const [rows, setRows] = useState<Record<string, Control>>({});
  const [log, setLog] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [c, l] = await Promise.all([
      supabase.from("device_controls").select("device_id,is_on,auto_mode,setpoint,fan_speed,updated_at"),
      supabase.from("control_log").select("id,device_id,action,created_at").order("created_at", { ascending: false }).limit(12),
    ]);
    if (c.error) toast.error("Could not load device states");
    setRows(Object.fromEntries((c.data ?? []).map((r) => [r.device_id, r])));
    setLog(l.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const ch = supabase.channel("device-controls")
      .on("postgres_changes", { event: "*", schema: "public", table: "device_controls" }, () => void load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "control_log" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [load]);

  const get = useCallback((id: string): Control => rows[id] ?? { device_id: id, is_on: DEFAULT_ON[id] ?? false, auto_mode: false, setpoint: 24, fan_speed: 3, updated_at: "" }, [rows]);

  const update = useCallback(async (id: string, patch: Partial<Omit<Control, "device_id" | "updated_at">>, action: string) => {
    const next = { ...get(id), ...patch };
    setRows((r) => ({ ...r, [id]: { ...next, updated_at: new Date().toISOString() } }));
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("device_controls").upsert({ device_id: id, is_on: next.is_on, auto_mode: next.auto_mode, setpoint: next.setpoint, fan_speed: next.fan_speed, updated_by: u.user?.id, updated_at: new Date().toISOString() });
    if (error) { toast.error("Change not saved — admin access required"); void load(); return; }
    await supabase.from("control_log").insert({ device_id: id, action });
    toast.success(action);
  }, [get, load]);

  return { get, update, log, loading };
}
