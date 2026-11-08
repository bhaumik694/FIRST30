import { createFileRoute } from "@tanstack/react-router";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { NeedsProfile, PageTitle } from "@/components/shell";
import { journeyDay, reportedSummary } from "@/lib/engine";
import { useAppData, usePhotos } from "@/lib/store";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Insights — FIRST 30" },
      { name: "description", content: "Symptom trends, milestones and a summary of your reported skincare experience." },
      { property: "og:title", content: "Insights — FIRST 30" },
      { property: "og:description", content: "See how your reported experience changed over 30 days." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Insights,
});

function Insights() {
  const data = useAppData();
  const photos = usePhotos();
  if (!data) return null;
  if (!data.profile) return <NeedsProfile />;
  const list = [...data.checkIns].sort((a, b) => a.date.localeCompare(b.date));
  const chart = list.map((c) => ({ day: c.day, Dryness: c.dryness, Redness: c.redness, Itching: c.itching, Burning: c.burning }));
  const day = journeyDay(data.profile.startDate);
  const notes = list.filter((c) => c.notes).reverse();

  return (
    <div className="space-y-6">
      <PageTitle eyebrow="Insights" title="What's changed" sub="Self-reported symptoms and photo processing are shown separately — neither is a medical assessment." />

      <div className="card-soft p-6">
        <p className="text-xs uppercase tracking-wider text-primary">Your reported experience</p>
        <ul className="mt-2 space-y-1.5">{reportedSummary(list).map((s) => <li key={s} className="font-display text-xl">{s}</li>)}</ul>
        <p className="mt-3 text-xs text-muted-foreground">Based only on what you logged in {list.length} check-ins. Not a measurement of your skin.</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[1, 7, 14, 30].map((m) => {
          const ci = list.find((c) => c.day === m);
          const ph = photos?.find((p) => p.day === m);
          return (
            <div key={m} className={`card-soft p-4 ${day >= m ? "" : "opacity-50"}`}>
              <p className="font-display text-2xl">Day {m}</p>
              <p className="mt-1 text-xs text-muted-foreground">{ci ? "✓ Check-in" : "— Check-in"}</p>
              <p className="text-xs text-muted-foreground">{ph ? "✓ Photo" : "— Photo"}</p>
            </div>
          );
        })}
      </div>

      <div className="card-soft p-6">
        <h3 className="text-xl">Symptom trends</h3>
        <p className="text-xs text-muted-foreground">0 = None · 1 = Mild · 2 = Moderate · 3 = Severe</p>
        {chart.length > 1 ? (
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis domain={[0, 3]} ticks={[0, 1, 2, 3]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={20} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line dataKey="Dryness" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                <Line dataKey="Redness" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
                <Line dataKey="Itching" stroke="var(--chart-4)" strokeWidth={2} dot={false} />
                <Line dataKey="Burning" stroke="var(--chart-5)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="mt-4 text-sm text-muted-foreground">Add at least two check-ins to see trends.</p>}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="card-soft p-6">
          <h3 className="text-xl">Suggestion history</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {[...data.history].reverse().slice(0, 12).map((h) => (
              <li key={h.date + h.recId} className="flex justify-between gap-3"><span>{h.title}</span><span className="shrink-0 text-muted-foreground">Day {h.day}</span></li>
            ))}
            {data.history.length === 0 && <li className="text-muted-foreground">Suggestions are recorded each day you open FIRST 30.</li>}
          </ul>
        </div>
        <div className="card-soft p-6">
          <h3 className="text-xl">Your notes</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {notes.slice(0, 10).map((c) => <li key={c.id}><span className="text-muted-foreground">Day {c.day} · </span>{c.notes}</li>)}
            {notes.length === 0 && <li className="text-muted-foreground">No notes yet.</li>}
          </ul>
        </div>
      </div>

      <div className="card-soft p-6">
        <p className="text-xs uppercase tracking-wider text-primary">Photo processing (separate from symptoms)</p>
        <p className="mt-2 text-sm">{photos?.length ?? 0} photos in your journal. {photos?.filter((p) => p.quality?.source === "opencv").length ?? 0} processed with OpenCV for lighting, sharpness and alignment.</p>
        <p className="mt-1 text-xs text-muted-foreground">Photo processing checks image quality only. It does not detect acne, pigmentation, redness or treatment effectiveness.</p>
      </div>
    </div>
  );
}
