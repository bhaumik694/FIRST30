import { getProduct } from "./products";
import type { CheckIn, Profile, Recommendation } from "./types";

const DAY = 86400000;

export function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function journeyDay(startDate: string, on: Date | string = new Date()) {
  const s = new Date(startDate + "T00:00:00");
  const t = typeof on === "string" ? new Date(on + "T00:00:00") : new Date(toISODate(on) + "T00:00:00");
  return Math.max(1, Math.floor((t.getTime() - s.getTime()) / DAY) + 1);
}

export function nextMilestone(day: number) {
  return [7, 14, 30].find((m) => m >= day) ?? null;
}

const SAFETY_WORDS = /\b(swell|swelling|swollen|blister|blistering|hives|peeling badly|bleed|bleeding|rash|oozing)\b/i;

function sorted(c: CheckIn[]) {
  return [...c].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}

function comfortScore(c: CheckIn) {
  return c.comfort === "comfortable" ? 0 : c.comfort === "slightly" ? 1 : 2;
}

export function discomfortScore(c: CheckIn) {
  return c.dryness + c.redness + c.itching + c.burning * 1.5 + comfortScore(c);
}

/**
 * Rule-based adaptive engine. Returns ordered recommendations (most important first).
 * Output is structured so an LLM could later rephrase it, but never needs one.
 */
export function recommend(profile: Profile, checkIns: CheckIn[], today = new Date()): Recommendation[] {
  const list = sorted(checkIns);
  const out: Recommendation[] = [];
  const product = getProduct(profile.productId);
  const day = journeyDay(profile.startDate, today);
  const latest = list.at(-1);

  if (!latest) {
    out.push({
      id: "start",
      level: "info",
      title: "Start with a quick check-in",
      message:
        "Log how your skin feels today. Your suggestions become more relevant as FIRST 30 learns how your skin responds.",
      reasons: [`You're on day ${day} with no check-ins yet.`],
    });
    if (profile.firstTime || profile.sensitivity === "high" || profile.skinType === "sensitive")
      out.push(patchTest(profile));
    return out;
  }

  const prev = list.slice(-4, -1);
  const recent3 = list.slice(-3);

  // 1. Safety — always first
  const notesFlag = SAFETY_WORDS.test(latest.notes);
  if (latest.burning >= 2 || notesFlag || [latest.redness, latest.itching, latest.dryness].some((s) => s === 3)) {
    const reasons: string[] = [];
    if (latest.burning >= 2) reasons.push(`You reported ${latest.burning === 3 ? "severe" : "moderate"} burning or stinging.`);
    if (latest.redness === 3) reasons.push("You reported severe redness.");
    if (latest.itching === 3) reasons.push("You reported severe itching.");
    if (latest.dryness === 3) reasons.push("You reported severe dryness.");
    if (notesFlag) reasons.push("Your notes mention symptoms such as swelling, blistering or a rash.");
    out.push({
      id: "safety-stop",
      level: "safety",
      title: "Pause and seek advice",
      message:
        "These symptoms are worth taking seriously. Stop using the product and seek medical advice, especially if symptoms persist or worsen. Do not push through irritation — this is not something to wait out.",
      reasons,
    });
    return out;
  }

  if (latest.burning === 1) {
    out.push({
      id: "mild-burning",
      level: "caution",
      title: "Watch the stinging",
      message:
        "Burning or stinging is worth taking seriously, even when mild. It isn't something to push through. If it continues or gets stronger, pause the product and seek medical advice.",
      reasons: ["You reported mild burning or stinging today."],
    });
  }

  // 2. Increasing dryness
  const dryTrend = recent3.length >= 2 && recent3.every((c, i) => i === 0 || c.dryness >= recent3[i - 1].dryness) && latest.dryness > recent3[0].dryness;
  const persistentDry = recent3.length >= 3 && recent3.every((c) => c.dryness >= 1);
  if (latest.dryness >= 1 && (dryTrend || persistentDry)) {
    const reasons = [
      dryTrend
        ? `Dryness went from ${label(recent3[0].dryness)} to ${label(latest.dryness)} over your last ${recent3.length} check-ins.`
        : `You've reported dryness in each of your last ${recent3.length} check-ins.`,
    ];
    if (profile.skinType === "dry" || profile.skinType === "sensitive") reasons.push(`Your profile says your skin is ${profile.skinType}.`);
    if (product.exfoliating) reasons.push(`${product.short} contains an acid, which can be drying for some people.`);
    out.push({
      id: "dryness-increasing",
      level: "caution",
      title: dryTrend ? "Dryness is increasing" : "Dryness is persisting",
      message: `Your recent check-ins show ${dryTrend ? "increasing" : "ongoing"} dryness. Review your product's usage instructions and consider whether your current frequency is suitable. A gentle moisturiser may help support your routine.`,
      reasons,
    });
  }

  // 3. Redness / itching present
  if ((latest.redness >= 2 || latest.itching >= 2) && !out.some((r) => r.level === "safety")) {
    out.push({
      id: "irritation",
      level: "caution",
      title: "Signs of irritation",
      message:
        "Moderate redness or itching can be a sign your skin isn't comfortable with something in your routine. Keep the rest of your routine simple, follow the label closely, and pause use and seek advice if it persists or worsens.",
      reasons: [
        latest.redness >= 2 ? `Redness: ${label(latest.redness)} today.` : "",
        latest.itching >= 2 ? `Itching: ${label(latest.itching)} today.` : "",
        profile.sensitivity === "high" ? "You described your skin as highly sensitive." : "",
      ].filter(Boolean),
    });
  }

  // 4. Improving
  if (prev.length >= 2) {
    const before = prev.reduce((s, c) => s + discomfortScore(c), 0) / prev.length;
    const now = discomfortScore(latest);
    const prevDry = Math.max(...prev.map((c) => c.dryness));
    if (before >= 2 && now <= before - 1.5) {
      out.push({
        id: "improving",
        level: "positive",
        title: "Your comfort is looking better",
        message:
          "Your recent comfort check-ins look more positive. Continue monitoring how your skin responds and follow the product instructions.",
        reasons: [
          prevDry > latest.dryness ? `Reported dryness dropped from ${label(prevDry as 0)} to ${label(latest.dryness)}.` : "Your overall reported discomfort has dropped compared with previous days.",
        ],
      });
    }
  }

  // 5. Breakouts more
  if (latest.breakouts === "more") {
    const moreCount = recent3.filter((c) => c.breakouts === "more").length;
    out.push({
      id: "breakouts",
      level: "info",
      title: "More breakouts noted",
      message:
        "Breakouts can vary for many reasons, and FIRST 30 can't tell you why. Keep following the label, avoid adding several new products at once, and speak to a dermatologist if breakouts are painful or keep getting worse.",
      reasons: [`You reported more breakouts in ${moreCount} of your last ${recent3.length} check-ins.`],
    });
  }

  // 6. No visible change after 2 weeks
  if (day >= 14 && latest.visibleChange === "none") {
    out.push({
      id: "no-change",
      level: "info",
      title: "No visible change yet",
      message:
        "Not seeing a visible change yet does not automatically mean the product is ineffective. Results vary. Keep following the product instructions and avoid increasing usage to accelerate results.",
      reasons: [`You're on day ${day} and reported no noticeable change.`],
    });
  }

  // 7. Comfortable
  const comfy = recent3.every((c) => c.dryness <= 1 && c.redness === 0 && c.itching <= 1 && c.burning === 0 && c.comfort === "comfortable");
  if (comfy && !out.some((r) => r.id === "improving")) {
    out.push({
      id: "comfortable",
      level: "positive",
      title: "Your skin has been comfortable",
      message:
        "Your recent check-ins suggest your skin has been comfortable. Continue following the product's labelled usage instructions.",
      reasons: [`No significant discomfort across your last ${recent3.length} check-in${recent3.length > 1 ? "s" : ""}.`],
    });
  }

  // Fallback
  if (out.length === 0) {
    out.push({
      id: "monitor",
      level: "info",
      title: "Keep observing",
      message:
        "Your skin shows some mild changes but nothing that stands out as a trend yet. Keep checking in daily so suggestions can become more specific.",
      reasons: [`Based on ${list.length} check-in${list.length > 1 ? "s" : ""} so far.`],
    });
  }

  if (product.sunscreen && day <= 30 && !out.some((r) => r.level === "safety"))
    out.push({
      id: "sunscreen",
      level: "info",
      title: "Daytime sunscreen",
      message: "Use a broad-spectrum sunscreen during the day, especially while using active products. Check your product label for any sun-related guidance.",
      reasons: [`${product.short} is the kind of product where daily sun protection is generally advised.`],
    });

  return out;
}

function patchTest(profile: Profile): Recommendation {
  return {
    id: "patch-test",
    level: "info",
    title: "Patch test first",
    message: "Before applying to your whole face, try a small amount on a discreet area and wait as directed on the label to see how your skin reacts.",
    reasons: [
      profile.firstTime ? "This is your first time using this product." : "",
      profile.sensitivity === "high" || profile.skinType === "sensitive" ? "You described your skin as sensitive." : "",
    ].filter(Boolean),
  };
}

function label(s: number) {
  return ["none", "mild", "moderate", "severe"][s] ?? "none";
}

/** Summary sentences for self-reported change (never claims percentages). */
export function reportedSummary(checkIns: CheckIn[]): string[] {
  const list = sorted(checkIns);
  if (list.length < 3) return ["Log a few more check-ins to see how your reported experience is changing."];
  const half = Math.floor(list.length / 2);
  const a = list.slice(0, half);
  const b = list.slice(half);
  const avg = (arr: CheckIn[], k: "dryness" | "redness" | "itching" | "burning") => arr.reduce((s, c) => s + c[k], 0) / arr.length;
  const out: string[] = [];
  (["dryness", "redness", "itching", "burning"] as const).forEach((k) => {
    const d = avg(b, k) - avg(a, k);
    if (d <= -0.4) out.push(`Your reported ${k} decreased.`);
    else if (d >= 0.4) out.push(`Your reported ${k} increased.`);
  });
  const ca = a.filter((c) => c.comfort === "comfortable").length / a.length;
  const cb = b.filter((c) => c.comfort === "comfortable").length / b.length;
  if (cb - ca >= 0.2) out.push("You've reported feeling comfortable more often recently.");
  if (ca - cb >= 0.2) out.push("You've reported feeling comfortable less often recently.");
  if (out.length === 0) out.push("Your reported symptoms have stayed fairly steady.");
  return out;
}
