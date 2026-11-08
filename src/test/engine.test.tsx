import { describe, expect, it } from "vitest";
import { recommend } from "@/lib/engine";
import type { CheckIn, Profile, Severity } from "@/lib/types";

const profile: Profile = { name: "", skinType: "combination", concern: "acne", sensitivity: "medium", productId: "sa-facewash", customProductName: "", startDate: "2026-01-01", firstTime: false };
const ci = (day: number, o: Partial<CheckIn> = {}): CheckIn => ({
  id: String(day), createdAt: `2026-01-${String(day).padStart(2, "0")}T09:00:00Z`, date: `2026-01-${String(day).padStart(2, "0")}`, day,
  dryness: 0, redness: 0, itching: 0, burning: 0, breakouts: "same", comfort: "comfortable", notes: "", ...o,
});
const on = (d: number) => new Date(2026, 0, d);

describe("recommendation engine", () => {
  it("moderate burning triggers stop-and-seek-advice safety message", () => {
    const r = recommend(profile, [ci(1), ci(2, { burning: 2 })], on(2));
    expect(r[0].id).toBe("safety-stop");
    expect(r).toHaveLength(1);
  });
  it("swelling in notes triggers safety message", () => {
    expect(recommend(profile, [ci(1, { notes: "some swelling near cheek" })], on(1))[0].id).toBe("safety-stop");
  });
  it("mild, mild, moderate dryness is flagged as increasing", () => {
    const r = recommend(profile, [ci(1, { dryness: 1 as Severity }), ci(2, { dryness: 1 }), ci(3, { dryness: 2 })], on(3));
    expect(r[0].id).toBe("dryness-increasing");
  });
  it("comfortable check-ins produce the comfortable suggestion", () => {
    expect(recommend(profile, [ci(1), ci(2), ci(3)], on(3))[0].id).toBe("comfortable");
  });
  it("no visible change after two weeks gives the patience message", () => {
    const r = recommend(profile, [ci(14), ci(15, { visibleChange: "none" })], on(15));
    expect(r.some((x) => x.id === "no-change")).toBe(true);
  });
  it("improving after dryness shows improvement", () => {
    const r = recommend(profile, [ci(1, { dryness: 2, comfort: "slightly" }), ci(2, { dryness: 2, comfort: "slightly" }), ci(3, { dryness: 2, comfort: "slightly" }), ci(4)], on(4));
    expect(r[0].id).toBe("improving");
  });
  it("never suggests increasing frequency or calls irritation purging", () => {
    const all = recommend(profile, [ci(1, { dryness: 1 }), ci(2, { dryness: 2, redness: 2 })], on(2));
    const text = all.map((r) => r.message).join(" ").toLowerCase();
    expect(text).not.toContain("purging");
    expect(text).not.toMatch(/increase (your )?(usage|frequency)/);
  });
});
