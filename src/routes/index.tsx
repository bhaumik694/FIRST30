import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckInDialog } from "@/components/checkin-dialog";
import { ProfileForm, blankProfile } from "@/components/profile-form";
import { RecCard } from "@/components/rec-card";
import { loadDemo } from "@/lib/demo";
import { discomfortScore, journeyDay, nextMilestone, recommend, toISODate } from "@/lib/engine";
import { productName } from "@/lib/products";
import { actions, useAppData, usePhotos } from "@/lib/store";
import { COMFORT_LABELS, SEVERITY_LABELS } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FIRST 30 — Your first month with a new skincare product" },
      { name: "description", content: "Track symptoms, compare progress photos and get adaptive suggestions during your first 30 days with a new skincare product." },
      { property: "og:title", content: "FIRST 30 — Smart Skincare Companion" },
      { property: "og:description", content: "Track your skin. Understand your experience. Get more relevant suggestions over time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const data = useAppData();
  if (!data) return <div className="h-96" />;
  if (!data.profile) return <Welcome />;
  return <Dashboard />;
}

function Welcome() {
  const [start, setStart] = useState(false);
  const [loading, setLoading] = useState(false);
  if (start)
    return (
      <div className="card-soft mx-auto max-w-xl p-6 md:p-10">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Set up your journey</p>
        <div className="mt-4">
          <ProfileForm stepped initial={blankProfile()} submitLabel="Begin my 30 days" onSave={(p) => actions.saveProfile(p)} />
        </div>
      </div>
    );
  return (
    <div className="grid items-center gap-10 py-6 md:grid-cols-2 md:py-16">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-primary">The first 30 days</p>
        <h1 className="mt-3 text-5xl font-medium leading-[1.05] md:text-7xl">Your first month with a new product, made less confusing.</h1>
        <p className="mt-5 max-w-md text-lg text-muted-foreground">Track your skin. Understand your experience. Get more relevant suggestions over time.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button onClick={() => setStart(true)} className="rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground">Start my journey</button>
          <button
            disabled={loading}
            onClick={async () => { setLoading(true); await loadDemo(); }}
            className="rounded-full border border-border bg-card px-7 py-3.5 text-sm font-medium"
          >
            {loading ? "Loading…" : "Explore the demo"}
          </button>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">Independent prototype. Not affiliated with Be Bodywise. Not medical advice.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[["Daily check-ins", "20 seconds to log dryness, redness, comfort and more."], ["Adaptive suggestions", "Rules that respond to your trends — and tell you why."], ["Photo journal", "Compare Day 1 to Day 30 with lighting and sharpness checks."], ["Safety first", "Burning or swelling? We'll tell you to stop and seek advice."]].map(([t, d], i) => (
          <div key={t} className={`card-soft p-5 ${i % 2 ? "mt-6" : ""}`}>
            <h3 className="text-lg">{t}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard() {
  const data = useAppData()!;
  const profile = data.profile!;
  const photos = usePhotos();
  const [open, setOpen] = useState(false);
  const day = journeyDay(profile.startDate);
  const recs = useMemo(() => recommend(profile, data.checkIns), [profile, data.checkIns]);
  const today = toISODate(new Date());
  const doneToday = data.checkIns.some((c) => c.date === today);
  const ms = nextMilestone(day);
  const sorted = [...data.checkIns].sort((a, b) => a.date.localeCompare(b.date));
  const chart = sorted.slice(-14).map((c) => ({ day: `D${c.day}`, comfort: Math.max(0, 10 - discomfortScore(c)) }));
  const latestPhoto = photos?.at(-1);

  useEffect(() => {
    if (recs[0]) actions.logRec(day, today, recs[0].id, recs[0].title);
  }, [recs, day, today]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{greeting()}{profile.name ? `, ${profile.name}` : ""}</p>
          <h1 className="mt-1 text-5xl font-medium md:text-6xl">Day {Math.min(day, 30)}<span className="text-muted-foreground"> / 30</span></h1>
          <p className="mt-1 text-muted-foreground">with {productName(profile)}{day > 30 ? " · journey complete" : ""}</p>
        </div>
        <button onClick={() => setOpen(true)} className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">
          {doneToday ? "Add another check-in" : "Today's check-in · 20 sec"}
        </button>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (day / 30) * 100)}%` }} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        {[1, 7, 14, 30].map((m) => <span key={m} className={day >= m ? "text-primary" : ""}>Day {m}</span>)}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Today's suggestion</p>
          <RecCard rec={recs[0]} large />
          {recs.slice(1, 3).map((r) => <RecCard key={r.id} rec={r} />)}
        </div>
        <div className="space-y-5">
          <div className="card-soft p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Next milestone</p>
            {ms ? (
              <>
                <p className="mt-1 font-display text-3xl">Day {ms}</p>
                <p className="text-sm text-muted-foreground">{ms - day === 0 ? "Today — take a progress photo" : `In ${ms - day} day${ms - day > 1 ? "s" : ""}`}</p>
              </>
            ) : <p className="mt-1 text-sm">All milestones reached.</p>}
          </div>
          <Link to="/photos" className="card-soft block overflow-hidden">
            {latestPhoto ? (
              <img src={latestPhoto.normalizedUrl ?? latestPhoto.dataUrl} alt={`Progress photo day ${latestPhoto.day}`} className="aspect-[4/3] w-full object-cover" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-muted text-sm text-muted-foreground">No photos yet</div>
            )}
            <p className="p-4 text-sm">{latestPhoto ? `Latest photo · Day ${latestPhoto.day}` : "Add a baseline photo →"}</p>
          </Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card-soft p-5 lg:col-span-2">
          <h3 className="text-xl">Skin comfort trend</h3>
          <p className="text-xs text-muted-foreground">Based on your self-reported check-ins (higher = more comfortable)</p>
          {chart.length > 1 ? (
            <div className="mt-4 h-48">
              <ResponsiveContainer>
                <AreaChart data={chart}>
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis domain={[0, 10]} hide />
                  <Tooltip />
                  <Area type="monotone" dataKey="comfort" stroke="var(--primary)" fill="var(--secondary)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="mt-6 text-sm text-muted-foreground">Your trend appears after two check-ins.</p>}
        </div>
        <div className="card-soft p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl">Recent check-ins</h3>
            <Link to="/journey" className="text-xs text-primary">View all</Link>
          </div>
          <ul className="mt-3 divide-y divide-border">
            {sorted.slice(-4).reverse().map((c) => (
              <li key={c.id} className="py-2.5 text-sm">
                <div className="flex justify-between"><span className="font-medium">Day {c.day}</span><span className="text-muted-foreground">{COMFORT_LABELS[c.comfort]}</span></div>
                <p className="text-xs text-muted-foreground">Dryness {SEVERITY_LABELS[c.dryness].toLowerCase()} · Redness {SEVERITY_LABELS[c.redness].toLowerCase()}</p>
              </li>
            ))}
            {sorted.length === 0 && <li className="py-3 text-sm text-muted-foreground">No check-ins yet.</li>}
          </ul>
        </div>
      </div>
      <CheckInDialog open={open} onOpenChange={setOpen} profile={profile} />
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
