import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CheckInDialog } from "@/components/checkin-dialog";
import { NeedsProfile, PageTitle } from "@/components/shell";
import { actions, useAppData } from "@/lib/store";
import { COMFORT_LABELS, SEVERITY_LABELS, type CheckIn } from "@/lib/types";

export const Route = createFileRoute("/journey")({
  head: () => ({
    meta: [
      { title: "My Journey — FIRST 30" },
      { name: "description", content: "View, edit and delete your daily skin check-ins." },
      { property: "og:title", content: "My Journey — FIRST 30" },
      { property: "og:description", content: "Your daily skin check-in history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Journey,
});

function Journey() {
  const data = useAppData();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<CheckIn | undefined>();
  if (!data) return null;
  if (!data.profile) return <NeedsProfile />;
  const list = [...data.checkIns].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle eyebrow="My Journey" title="Check-in history" sub="Every entry shapes your suggestions. Edit or remove anything that isn't right." />
        <button onClick={() => { setEdit(undefined); setOpen(true); }} className="mb-8 rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground">New check-in</button>
      </div>
      {list.length === 0 && <p className="card-soft p-8 text-center text-muted-foreground">No check-ins yet.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((c) => (
          <div key={c.id} className="card-soft p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-display text-2xl">Day {c.day}</p>
                <p className="text-xs text-muted-foreground">{new Date(c.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</p>
              </div>
              <div className="flex gap-1">
                <button aria-label="Edit check-in" onClick={() => { setEdit(c); setOpen(true); }} className="rounded-full p-2 hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                <button aria-label="Delete check-in" onClick={() => { if (confirm("Delete this check-in?")) { actions.deleteCheckIn(c.id); toast("Check-in deleted"); } }} className="rounded-full p-2 hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {(["dryness", "redness", "itching", "burning"] as const).map((k) => (
                <div key={k} className="flex justify-between"><span className="capitalize text-muted-foreground">{k}</span><span className={c[k] >= 2 ? "text-destructive" : ""}>{SEVERITY_LABELS[c[k]]}</span></div>
              ))}
              <div className="flex justify-between"><span className="text-muted-foreground">Breakouts</span><span className="capitalize">{c.breakouts}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Comfort</span><span>{COMFORT_LABELS[c.comfort].replace("Slightly uncomfortable", "Slightly")}</span></div>
            </div>
            {c.notes && <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-sm italic text-muted-foreground">“{c.notes}”</p>}
          </div>
        ))}
      </div>
      <CheckInDialog open={open} onOpenChange={setOpen} profile={data.profile} existing={edit} />
    </div>
  );
}
