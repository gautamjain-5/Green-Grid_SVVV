import { AlertTriangle, Droplets, Fan, Flame, Lightbulb, Power, Snowflake, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CampusWarning } from "@/lib/campus-devices";
import { usePrefs } from "@/lib/preferences";
import { cn } from "@/lib/utils";

const ICON = { light: Lightbulb, fan: Fan, ac: Snowflake, tap: Droplets, bin: Trash2, heat: Flame };

export function WarningsPanel({ warnings, onTurnOff }: { warnings: CampusWarning[]; onTurnOff?: (w: CampusWarning) => void }) {
  const { t } = usePrefs();
  return (
    <section aria-label={t("warnings")}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><AlertTriangle className="h-5 w-5 text-warning" />{t("warnings")}</h2>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", warnings.length ? "bg-destructive/15 text-destructive" : "bg-primary-soft text-primary")}>{warnings.length}</span>
      </div>
      {warnings.length === 0 ? (
        <p className="glass rounded-xl p-5 text-sm text-muted-foreground">{t("warnings.none")}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {warnings.map((w) => {
            const Icon = ICON[w.kind];
            return (
              <article key={w.id} className={cn("warning-card glass rounded-xl border-l-4 p-4", w.severity === "critical" ? "border-l-destructive" : "border-l-warning")}>
                <div className="flex items-start gap-3">
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", w.severity === "critical" ? "bg-destructive/15 text-destructive" : "bg-warning-soft text-warning")}><Icon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold">{w.title}</h3>
                    <p className="mt-0.5 text-xs font-medium text-primary">{w.where}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{w.detail}</p>
                  </div>
                </div>
                {onTurnOff && w.deviceId && (
                  <Button size="sm" variant="destructive" className="mt-3" onClick={() => onTurnOff(w)}><Power className="h-4 w-4" />{t("turnoff")}</Button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
