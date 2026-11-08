import { AlertTriangle, Info, Leaf, ShieldAlert } from "lucide-react";
import type { Recommendation } from "@/lib/types";

const STYLE = {
  safety: { cls: "bg-danger-soft border-destructive/30", icon: ShieldAlert, tint: "text-destructive" },
  caution: { cls: "bg-warning-soft border-warning/40", icon: AlertTriangle, tint: "text-accent-foreground" },
  info: { cls: "bg-card border-border", icon: Info, tint: "text-primary" },
  positive: { cls: "bg-success-soft border-primary/25", icon: Leaf, tint: "text-primary" },
};

export function RecCard({ rec, large }: { rec: Recommendation; large?: boolean }) {
  const s = STYLE[rec.level];
  return (
    <div className={`rounded-2xl border p-5 ${s.cls}`}>
      <div className="flex items-start gap-3">
        <s.icon className={`mt-1 h-5 w-5 shrink-0 ${s.tint}`} />
        <div>
          <h3 className={large ? "text-2xl" : "text-lg"}>{rec.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">{rec.message}</p>
          {rec.reasons.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Why you're seeing this</p>
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {rec.reasons.map((r) => <li key={r}>• {r}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
