import { createFileRoute } from "@tanstack/react-router";
import { Camera, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { NeedsProfile, PageTitle } from "@/components/shell";
import { journeyDay, toISODate } from "@/lib/engine";
import { actions, photos as photoStore, uid, useAppData, usePhotos } from "@/lib/store";
import type { Photo, QualityReport } from "@/lib/types";
import { analyzeWithOpenCV, browserQuickCheck, fileToResizedDataUrl, lightingMismatch, validateFile } from "@/lib/vision";

export const Route = createFileRoute("/photos")({
  head: () => ({
    meta: [
      { title: "Photo Journal — FIRST 30" },
      { name: "description", content: "Private progress photos with OpenCV lighting, sharpness and alignment checks, plus before-and-after comparisons." },
      { property: "og:title", content: "Photo Journal — FIRST 30" },
      { property: "og:description", content: "Compare Day 1 with Day 7, 14 and 30." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PhotosPage,
});

const DISCLAIMER = "Visual comparison only. Lighting, camera angle and exposure can affect appearance. This is not a medical assessment.";

function PhotosPage() {
  const data = useAppData();
  const list = usePhotos();
  const [busy, setBusy] = useState(false);
  const [a, setA] = useState<string>();
  const [b, setB] = useState<string>();
  const [mode, setMode] = useState<"slider" | "side">("slider");
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!list || list.length === 0) return;
    if (!a || !list.find((p) => p.id === a)) setA(list[0].id);
    if (!b || !list.find((p) => p.id === b)) setB(list.at(-1)!.id);
  }, [list, a, b]);

  if (!data) return null;
  if (!data.profile) return <NeedsProfile />;
  const profile = data.profile;

  if (!data.photoConsent)
    return (
      <div className="card-soft mx-auto max-w-lg p-8">
        <PageTitle eyebrow="Photo Journal" title="Before you add photos" />
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Photos are stored privately in this browser on this device and are never made public.</li>
          <li>• If you connect the OpenCV service, photos are sent to it only for processing and are not kept.</li>
          <li>• Photos are never sent to external AI services.</li>
          <li>• You can delete any photo at any time.</li>
        </ul>
        <button onClick={() => actions.setConsent(true)} className="mt-6 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground">I understand and consent</button>
      </div>
    );

  async function handle(f?: File) {
    if (!f) return;
    const err = validateFile(f);
    if (err) return toast.error(err);
    setBusy(true);
    try {
      const dataUrl = await fileToResizedDataUrl(f);
      const baseline = list?.[0];
      let quality: QualityReport;
      let normalizedUrl: string | undefined;
      if (data!.visionApiUrl) {
        try {
          const r = await analyzeWithOpenCV(data!.visionApiUrl, dataUrl, baseline && !baseline.illustrative ? baseline.dataUrl : undefined);
          quality = r.quality;
          normalizedUrl = r.normalizedUrl;
        } catch (e) {
          toast.error(`OpenCV service unavailable — used basic browser check instead. (${(e as Error).message})`);
          quality = await browserQuickCheck(dataUrl);
        }
      } else quality = await browserQuickCheck(dataUrl);
      const today = toISODate(new Date());
      const p: Photo = { id: uid(), createdAt: new Date().toISOString(), date: today, day: journeyDay(profile.startDate), dataUrl, normalizedUrl, quality };
      await photoStore.put(p);
      setB(p.id);
      toast.success(list?.length ? "Progress photo added" : "Baseline photo added");
    } catch {
      toast.error("Couldn't read that image.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
      if (camRef.current) camRef.current.value = "";
    }
  }

  const pa = list?.find((p) => p.id === a);
  const pb = list?.find((p) => p.id === b);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle eyebrow="Photo Journal" title="Your progress, privately" sub="Take photos in the same spot, same light, same angle for the most reliable comparisons." />
        <div className="mb-8 flex gap-2">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
          <input ref={camRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
          <button disabled={busy} onClick={() => camRef.current?.click()} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm"><Camera className="h-4 w-4" />Camera</button>
          <button disabled={busy} onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm text-primary-foreground"><Upload className="h-4 w-4" />{busy ? "Processing…" : list?.length ? "Add photo" : "Add baseline"}</button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Analysis mode: {data.visionApiUrl ? <strong className="text-primary">OpenCV service connected</strong> : <>Basic browser check (not OpenCV). Connect the OpenCV service in Profile & Privacy for alignment and full analysis.</>}
      </p>

      {list && list.length >= 2 && pa && pb && (
        <div className="card-soft space-y-4 p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="mr-auto text-2xl">Compare</h2>
            <PhotoSelect list={list} value={a} onChange={setA} />
            <span className="text-muted-foreground">→</span>
            <PhotoSelect list={list} value={b} onChange={setB} />
            <div className="flex rounded-full bg-muted p-1 text-xs">
              {(["slider", "side"] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={`rounded-full px-3 py-1 ${mode === m ? "bg-card shadow-soft" : ""}`}>{m === "slider" ? "Slider" : "Side by side"}</button>)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {[7, 14, 30].map((m) => {
              const t = list.find((p) => p.day >= m);
              return <button key={m} disabled={!t} onClick={() => { setA(list[0].id); setB(t!.id); }} className="rounded-full border border-border px-3 py-1 disabled:opacity-40">Day 1 vs Day {m}</button>;
            })}
          </div>
          {mode === "slider" ? <Slider a={pa} b={pb} /> : (
            <div className="grid grid-cols-2 gap-3">
              {[pa, pb].map((p) => <figure key={p.id}><img src={p.normalizedUrl ?? p.dataUrl} alt={`Day ${p.day}`} className="aspect-[4/5] w-full rounded-xl object-cover" /><figcaption className="mt-1 text-center text-xs text-muted-foreground">Day {p.day}</figcaption></figure>)}
            </div>
          )}
          <Reliability a={pa} b={pb} />
          <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">{DISCLAIMER}</p>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-2xl">Timeline</h2>
        {list?.length === 0 && <p className="card-soft p-8 text-center text-muted-foreground">Add a baseline photo to begin.</p>}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {list?.map((p, i) => (
            <div key={p.id} className="card-soft overflow-hidden">
              <img src={p.normalizedUrl ?? p.dataUrl} alt={`Day ${p.day}`} className="aspect-[4/5] w-full object-cover" />
              <div className="space-y-2 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg">Day {p.day}{i === 0 && <span className="ml-1.5 text-xs text-muted-foreground">baseline</span>}</p>
                  <button aria-label="Delete photo" onClick={async () => { if (confirm("Delete this photo?")) { await photoStore.remove(p.id); toast("Photo deleted"); } }} className="rounded-full p-1.5 hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
                </div>
                {p.illustrative ? <p className="text-xs text-muted-foreground">Illustrative placeholder (demo)</p> : <QualityBadges q={p.quality} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PhotoSelect({ list, value, onChange }: { list: Photo[]; value?: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-full border border-input bg-card px-3 py-1.5 text-sm">
      {list.map((p) => <option key={p.id} value={p.id}>Day {p.day} · {p.date}</option>)}
    </select>
  );
}

function Slider({ a, b }: { a: Photo; b: Photo }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative mx-auto aspect-[4/5] max-w-md select-none overflow-hidden rounded-2xl">
      <img src={b.normalizedUrl ?? b.dataUrl} alt={`Day ${b.day}`} className="absolute inset-0 h-full w-full object-cover" />
      <img src={a.normalizedUrl ?? a.dataUrl} alt={`Day ${a.day}`} className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-card" style={{ left: `${pos}%` }} />
      <span className="absolute left-3 top-3 rounded-full bg-card/90 px-2.5 py-1 text-xs">Day {a.day}</span>
      <span className="absolute right-3 top-3 rounded-full bg-card/90 px-2.5 py-1 text-xs">Day {b.day}</span>
      <input aria-label="Comparison slider" type="range" min={0} max={100} value={pos} onChange={(e) => setPos(+e.target.value)} className="absolute inset-x-4 bottom-4 accent-primary" />
    </div>
  );
}

function QualityBadges({ q }: { q?: QualityReport }) {
  if (!q) return null;
  const item = (label: string, ok: boolean, text: string) => (
    <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className={ok ? "text-primary" : "text-destructive"}>{text}</span></div>
  );
  return (
    <div className="space-y-0.5">
      {item("Lighting", q.lighting === "good", q.lighting === "good" ? "Good" : q.lighting === "dark" ? "Too dark" : "Too bright")}
      {item("Sharpness", q.sharp === "good", q.sharp === "good" ? "Good" : "Blurry")}
      {q.alignment && item("Alignment", q.alignment === "successful", q.alignment === "successful" ? "Successful" : "Not reliable")}
      <p className="pt-1 text-[10px] text-muted-foreground">{q.source === "opencv" ? "Analysed with OpenCV" : "Basic browser check — not OpenCV"}</p>
    </div>
  );
}

function Reliability({ a, b }: { a: Photo; b: Photo }) {
  const qa = a.quality, qb = b.quality;
  if (a.illustrative || b.illustrative) return <p className="text-sm text-muted-foreground">Demo placeholders — no quality analysis.</p>;
  const issues: string[] = [];
  if (qa?.lighting !== "good" || qb?.lighting !== "good") issues.push("One or both photos are poorly lit.");
  if (qa?.sharp !== "good" || qb?.sharp !== "good") issues.push("One or both photos are blurry.");
  if (lightingMismatch(qa, qb)) issues.push("These photos were taken in noticeably different lighting.");
  if (qb?.alignment === "unreliable") issues.push("Camera angle differs from your baseline — alignment wasn't reliable.");
  const good = issues.length === 0;
  return (
    <div className={`rounded-xl p-4 text-sm ${good ? "bg-success-soft" : "bg-warning-soft"}`}>
      <p className="font-medium">Comparison reliability: {good ? "Good" : "Limited"}</p>
      {issues.map((i) => <p key={i} className="text-xs text-muted-foreground">• {i}</p>)}
      {!qb?.alignment && <p className="text-xs text-muted-foreground">Alignment not checked (needs the OpenCV service).</p>}
    </div>
  );
}
