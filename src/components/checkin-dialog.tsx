import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { journeyDay, toISODate } from "@/lib/engine";
import { actions, uid } from "@/lib/store";
import { COMFORT_LABELS, SEVERITY_LABELS, type CheckIn, type Profile, type Severity } from "@/lib/types";

function Chips<T extends string | number>({ value, options, onChange }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          type="button"
          key={String(o.v)}
          onClick={() => onChange(o.v)}
          className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${value === o.v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/50"}`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

const sev = SEVERITY_LABELS.map((l, i) => ({ v: i as Severity, l }));

export function CheckInDialog({ open, onOpenChange, profile, existing }: { open: boolean; onOpenChange: (o: boolean) => void; profile: Profile; existing?: CheckIn }) {
  const today = toISODate(new Date());
  const init = (): CheckIn =>
    existing ?? {
      id: uid(), createdAt: new Date().toISOString(), date: today, day: journeyDay(profile.startDate),
      dryness: 0, redness: 0, itching: 0, burning: 0, breakouts: "same", comfort: "comfortable", notes: "",
    };
  const [c, setC] = useState<CheckIn>(init);
  const [lastKey, setLastKey] = useState<string>("");
  const key = `${open}-${existing?.id ?? "new"}`;
  if (key !== lastKey) {
    setLastKey(key);
    if (open) setC(init());
  }
  const set = <K extends keyof CheckIn>(k: K, v: CheckIn[K]) => setC((x) => ({ ...x, [k]: v }));
  const day = journeyDay(profile.startDate, c.date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium">{existing ? "Edit check-in" : "How's your skin today?"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="text-muted-foreground">Date · Day {day}</span>
            <input type="date" value={c.date} min={profile.startDate} max={today} onChange={(e) => set("date", e.target.value)} className="mt-1 block w-full rounded-xl border border-input bg-card px-3 py-2" />
          </label>
          {([["dryness", "Dryness / tightness"], ["redness", "Redness"], ["itching", "Itching"], ["burning", "Burning / stinging"]] as const).map(([k, l]) => (
            <div key={k}>
              <p className="mb-1.5 text-sm font-medium">{l}</p>
              <Chips value={c[k]} options={sev} onChange={(v) => set(k, v)} />
            </div>
          ))}
          <div>
            <p className="mb-1.5 text-sm font-medium">Breakouts</p>
            <Chips value={c.breakouts} options={[{ v: "better", l: "Better" }, { v: "same", l: "Same" }, { v: "more", l: "More" }]} onChange={(v) => set("breakouts", v)} />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">Overall comfort</p>
            <Chips value={c.comfort} options={(Object.keys(COMFORT_LABELS) as CheckIn["comfort"][]).map((v) => ({ v, l: COMFORT_LABELS[v] }))} onChange={(v) => set("comfort", v)} />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">Noticed any visible change? <span className="font-normal text-muted-foreground">(optional)</span></p>
            <Chips value={c.visibleChange ?? ("" as never)} options={[{ v: "none", l: "No change" }, { v: "some", l: "Some change" }, { v: "unsure", l: "Not sure" }]} onChange={(v) => set("visibleChange", v)} />
          </div>
          <Textarea placeholder="Notes (optional) — e.g. new moisturiser, swelling, slept badly…" value={c.notes} onChange={(e) => set("notes", e.target.value)} maxLength={500} />
          <button
            className="w-full rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground"
            onClick={() => {
              actions.upsertCheckIn({ ...c, day });
              toast.success(existing ? "Check-in updated" : "Check-in saved");
              onOpenChange(false);
            }}
          >
            {existing ? "Save changes" : "Save check-in"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
