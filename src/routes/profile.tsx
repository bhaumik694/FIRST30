import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ProfileForm } from "@/components/profile-form";
import { NeedsProfile, PageTitle } from "@/components/shell";
import { Switch } from "@/components/ui/switch";
import { loadDemo } from "@/lib/demo";
import { actions, useAppData } from "@/lib/store";
import { pingOpenCV } from "@/lib/vision";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Privacy — FIRST 30" },
      { name: "description", content: "Edit your skin profile, manage photo consent, and control your data." },
      { property: "og:title", content: "Profile & Privacy — FIRST 30" },
      { property: "og:description", content: "Your profile and privacy controls." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const data = useAppData();
  const nav = useNavigate();
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  if (!data) return null;
  if (!data.profile) return <NeedsProfile />;
  const apiUrl = url ?? data.visionApiUrl;

  return (
    <div className="space-y-6">
      <PageTitle eyebrow="Profile & Privacy" title="Your details" />
      <div className="card-soft p-6 md:p-8">
        <ProfileForm key={JSON.stringify(data.profile)} initial={data.profile} submitLabel="Save profile" onSave={(p) => { actions.saveProfile(p); toast.success("Profile saved"); }} />
      </div>

      <div className="card-soft space-y-4 p-6 md:p-8">
        <h2 className="text-2xl">Privacy</h2>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li>• Your profile and check-ins are stored only in this browser on this device.</li>
          <li>• Photos are stored in this browser's private storage. They are never published or shared publicly.</li>
          <li>• Photos are only sent to the OpenCV service if you connect one below — it processes them and stores nothing.</li>
          <li>• Photos are never sent to external AI services.</li>
        </ul>
        <label className="flex items-center justify-between gap-4 rounded-xl bg-muted p-4 text-sm">
          <span>I consent to storing progress photos on this device</span>
          <Switch checked={data.photoConsent} onCheckedChange={(v) => actions.setConsent(v)} />
        </label>
      </div>

      <div className="card-soft space-y-3 p-6 md:p-8">
        <h2 className="text-2xl">OpenCV photo service</h2>
        <p className="text-sm text-muted-foreground">Connect the FIRST 30 FastAPI + OpenCV service (in the project's <code>backend/</code> folder) to get real lighting, sharpness and alignment analysis. Without it, a basic browser check is used and labelled as such.</p>
        <div className="flex flex-wrap gap-2">
          <input value={apiUrl} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-service.example.com" className="min-w-0 flex-1 rounded-xl border border-input bg-card px-4 py-2.5 text-sm" />
          <button onClick={async () => {
            actions.setVisionUrl(apiUrl);
            if (!apiUrl) { setStatus("Disconnected."); return; }
            setStatus("Checking…");
            try { const r = await pingOpenCV(apiUrl.replace(/\/$/, "")); setStatus(`Connected · OpenCV ${r.opencv}`); }
            catch { setStatus("Couldn't reach the service. Saved anyway."); }
          }} className="rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground">Save & test</button>
        </div>
        {status && <p className="text-sm">{status}</p>}
      </div>

      <div className="card-soft flex flex-wrap gap-3 p-6 md:p-8">
        <button onClick={async () => { await loadDemo(); toast.success("Demo data reset"); }} className="rounded-full border border-border px-5 py-2.5 text-sm">{data.demo ? "Reset demo data" : "Load demo data"}</button>
        <button onClick={async () => { if (confirm("Delete your profile, check-ins and photos from this device?")) { await actions.resetAll(); toast("All data deleted"); nav({ to: "/" }); } }} className="rounded-full bg-destructive px-5 py-2.5 text-sm text-destructive-foreground">Delete all my data</button>
      </div>
    </div>
  );
}
