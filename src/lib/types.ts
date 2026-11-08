export type SkinType = "oily" | "dry" | "combination" | "normal" | "sensitive";
export type Concern = "acne" | "pigmentation" | "texture" | "hydration" | "general";
export type Sensitivity = "low" | "medium" | "high";
export type ProductId = "sa-facewash" | "snail-serum" | "pigmentation" | "other";
export type Severity = 0 | 1 | 2 | 3; // None, Mild, Moderate, Severe
export type Breakouts = "better" | "same" | "more";
export type Comfort = "comfortable" | "slightly" | "uncomfortable";

export interface Profile {
  name: string;
  skinType: SkinType;
  concern: Concern;
  sensitivity: Sensitivity;
  productId: ProductId;
  customProductName: string;
  startDate: string; // yyyy-mm-dd
  firstTime: boolean;
}

export interface CheckIn {
  id: string;
  createdAt: string; // ISO
  date: string; // yyyy-mm-dd
  day: number;
  dryness: Severity;
  redness: Severity;
  itching: Severity;
  burning: Severity;
  breakouts: Breakouts;
  comfort: Comfort;
  visibleChange?: "none" | "some" | "unsure" | undefined;
  notes: string;
}

export interface QualityReport {
  source: "opencv" | "browser";
  brightness: number; // 0-255 mean
  sharpness: number; // laplacian variance
  lighting: "good" | "dark" | "bright";
  sharp: "good" | "blurry";
  alignment?: "successful" | "unreliable";
  reliability?: "good" | "limited";
  matches?: number;
}

export interface Photo {
  id: string;
  createdAt: string;
  date: string;
  day: number;
  dataUrl: string;
  normalizedUrl?: string | undefined;
  illustrative?: boolean | undefined;
  quality?: QualityReport | undefined;
}

export interface Recommendation {
  id: string;
  level: "safety" | "caution" | "info" | "positive";
  title: string;
  message: string;
  reasons: string[];
}

export interface AppData {
  profile: Profile | null;
  checkIns: CheckIn[];
  photoConsent: boolean;
  demo: boolean;
  visionApiUrl: string;
  history: { date: string; day: number; recId: string; title: string }[];
}

export const SEVERITY_LABELS = ["None", "Mild", "Moderate", "Severe"] as const;
export const COMFORT_LABELS: Record<Comfort, string> = {
  comfortable: "Comfortable",
  slightly: "Slightly uncomfortable",
  uncomfortable: "Uncomfortable",
};
