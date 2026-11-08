import { useState } from "react";
import { toISODate } from "@/lib/engine";
import { PRODUCTS } from "@/lib/products";
import type { Profile } from "@/lib/types";

const SKIN = ["oily", "dry", "combination", "normal", "sensitive"] as const;
const CONCERN = [["acne", "Acne"], ["pigmentation", "Pigmentation"], ["texture", "Uneven texture"], ["hydration", "Hydration"], ["general", "General skincare"]] as const;
const SENS = [["low", "Rarely reacts"], ["medium", "Sometimes reacts"], ["high", "Reacts easily"]] as const;

function Opt({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-2xl border px-4 py-3 text-left text-sm capitalize transition-all ${active ? "border-primary bg-secondary text-secondary-foreground" : "border-border bg-card hover:border-primary/40"}`}>
      {children}
    </button>
  );
}

export const blankProfile = (): Profile => ({
  name: "", skinType: "combination", concern: "general", sensitivity: "medium",
  productId: "sa-facewash", customProductName: "", startDate: toISODate(new Date()), firstTime: true,
});

export function ProfileForm({ initial, onSave, submitLabel, stepped }: { initial: Profile; onSave: (p: Profile) => void; submitLabel: string; stepped?: boolean }) {
  const [p, setP] = useState(initial);
  const [step, setStep] = useState(0);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }));

  const sections = [
    <div key="s0" className="space-y-3">
      <h3 className="text-xl">What should we call you?</h3>
      <input placeholder="Name or nickname (optional)" value={p.name} onChange={(e) => set("name", e.target.value)} maxLength={40} className="w-full rounded-xl border border-input bg-card px-4 py-3" />
    </div>,
    <div key="s1" className="space-y-5">
      <div>
        <h3 className="mb-3 text-xl">Your skin type</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{SKIN.map((s) => <Opt key={s} active={p.skinType === s} onClick={() => set("skinType", s)}>{s}</Opt>)}</div>
      </div>
      <div>
        <h3 className="mb-3 text-xl">Main concern</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{CONCERN.map(([v, l]) => <Opt key={v} active={p.concern === v} onClick={() => set("concern", v)}>{l}</Opt>)}</div>
      </div>
      <div>
        <h3 className="mb-3 text-xl">How sensitive is your skin?</h3>
        <div className="grid grid-cols-3 gap-2">{SENS.map(([v, l]) => <Opt key={v} active={p.sensitivity === v} onClick={() => set("sensitivity", v)}>{l}</Opt>)}</div>
      </div>
    </div>,
    <div key="s2" className="space-y-5">
      <div>
        <h3 className="mb-3 text-xl">Which product did you recently start?</h3>
        <div className="grid gap-2">{PRODUCTS.map((pr) => <Opt key={pr.id} active={p.productId === pr.id} onClick={() => set("productId", pr.id)}><span className="normal-case">{pr.id === "other" ? "Other (custom product)" : pr.name}</span></Opt>)}</div>
        {p.productId === "other" && <input placeholder="Product name" value={p.customProductName} onChange={(e) => set("customProductName", e.target.value)} maxLength={80} className="mt-2 w-full rounded-xl border border-input bg-card px-4 py-3" />}
      </div>
      <label className="block">
        <span className="text-sm font-medium">Start date</span>
        <input type="date" value={p.startDate} max={toISODate(new Date())} onChange={(e) => e.target.value && set("startDate", e.target.value)} className="mt-1 block w-full rounded-xl border border-input bg-card px-4 py-3" />
      </label>
      <div>
        <p className="mb-2 text-sm font-medium">Is this your first time using it?</p>
        <div className="grid grid-cols-2 gap-2">
          <Opt active={p.firstTime} onClick={() => set("firstTime", true)}>Yes, first time</Opt>
          <Opt active={!p.firstTime} onClick={() => set("firstTime", false)}>I've used it before</Opt>
        </div>
      </div>
    </div>,
  ];

  const canSave = p.productId !== "other" || p.customProductName.trim().length > 0;

  if (!stepped)
    return (
      <div className="space-y-8">
        {sections}
        <button disabled={!canSave} onClick={() => onSave(p)} className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50">{submitLabel}</button>
      </div>
    );

  return (
    <div>
      <div className="mb-6 flex gap-1.5">{sections.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />)}</div>
      {sections[step]}
      <div className="mt-8 flex justify-between">
        <button onClick={() => setStep((s) => s - 1)} className={`rounded-full px-5 py-2.5 text-sm text-muted-foreground ${step === 0 ? "invisible" : ""}`}>Back</button>
        {step < sections.length - 1 ? (
          <button onClick={() => setStep((s) => s + 1)} className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground">Continue</button>
        ) : (
          <button disabled={!canSave} onClick={() => onSave(p)} className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">{submitLabel}</button>
        )}
      </div>
    </div>
  );
}
