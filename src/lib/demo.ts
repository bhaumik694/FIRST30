import { toISODate } from "./engine";
import { photos, setData, uid } from "./store";
import type { CheckIn, Photo, Severity } from "./types";

// Fictional sample data for demonstration. Not real customer data.
const seq: [Severity, Severity, Severity, Severity, CheckIn["breakouts"], CheckIn["comfort"], string][] = [
  [0, 0, 0, 0, "same", "comfortable", "First use. Felt fresh."],
  [1, 0, 0, 0, "same", "comfortable", ""],
  [1, 0, 0, 0, "same", "slightly", "A little tight after washing."],
  [1, 1, 0, 0, "same", "slightly", ""],
  [2, 1, 1, 0, "same", "slightly", "Tight around nose."],
  [2, 1, 0, 0, "more", "slightly", "Added moisturiser at night."],
  [2, 0, 0, 0, "same", "slightly", ""],
  [1, 0, 0, 0, "same", "comfortable", "Moisturiser seems to help."],
  [1, 0, 0, 0, "better", "comfortable", ""],
  [1, 0, 0, 0, "same", "comfortable", ""],
  [0, 0, 0, 0, "better", "comfortable", ""],
  [1, 0, 0, 0, "same", "comfortable", "Busy week, slept less."],
  [0, 0, 0, 0, "same", "comfortable", ""],
  [0, 0, 0, 0, "better", "comfortable", "Skin feels balanced."],
];

function illustrative(day: number, tone: number): string {
  const c = document.createElement("canvas");
  c.width = 600;
  c.height = 750;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, 0, 750);
  g.addColorStop(0, `hsl(35 30% ${88 - tone}%)`);
  g.addColorStop(1, `hsl(30 25% ${78 - tone}%)`);
  x.fillStyle = g;
  x.fillRect(0, 0, 600, 750);
  x.fillStyle = `hsl(25 35% ${70 - tone}%)`;
  x.beginPath();
  x.ellipse(300, 360, 170, 220, 0, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = "rgba(60,50,40,0.55)";
  x.font = "600 28px Georgia";
  x.textAlign = "center";
  x.fillText(`Illustrative placeholder · Day ${day}`, 300, 680);
  x.font = "18px sans-serif";
  x.fillText("Sample data — not a real photo", 300, 712);
  return c.toDataURL("image/jpeg", 0.85);
}

export async function loadDemo() {
  const start = new Date();
  start.setDate(start.getDate() - 13);
  const checkIns: CheckIn[] = seq.map((s, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    d.setHours(9, 0, 0, 0);
    return {
      id: uid(),
      createdAt: d.toISOString(),
      date: toISODate(d),
      day: i + 1,
      dryness: s[0], redness: s[1], itching: s[2], burning: s[3],
      breakouts: s[4], comfort: s[5], notes: s[6],
      visibleChange: i === 13 ? "unsure" : undefined,
    };
  });
  await photos.clear();
  for (const [day, tone] of [[1, 0], [7, 2], [14, 1]] as const) {
    const d = new Date(start);
    d.setDate(d.getDate() + day - 1);
    const p: Photo = {
      id: uid(), createdAt: d.toISOString(), date: toISODate(d), day,
      dataUrl: illustrative(day, tone), illustrative: true,
    };
    await photos.put(p);
  }
  setData((d) => ({
    ...d,
    demo: true,
    photoConsent: true,
    profile: {
      name: "Aanya (sample)",
      skinType: "combination",
      concern: "acne",
      sensitivity: "medium",
      productId: "sa-facewash",
      customProductName: "",
      startDate: toISODate(start),
      firstTime: true,
    },
    checkIns,
    history: [],
  }));
}
