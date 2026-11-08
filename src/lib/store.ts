import { useEffect, useState, useSyncExternalStore } from "react";
import type { AppData, CheckIn, Photo, Profile } from "./types";

const KEY = "first30:data:v1";
const DB = "first30";
const STORE = "photos";

const empty: AppData = { profile: null, checkIns: [], photoConsent: false, demo: false, visionApiUrl: "", history: [] };

let data: AppData = empty;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function load() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) data = { ...empty, ...JSON.parse(raw) };
  } catch {
    data = empty;
  }
}

export function setData(fn: (d: AppData) => AppData) {
  load();
  data = fn(data);
  localStorage.setItem(KEY, JSON.stringify(data));
  emit();
}

export function getData() {
  load();
  return data;
}

/** Returns null until hydrated on the client (avoids SSR mismatch). */
export function useAppData(): AppData | null {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    load();
    setReady(true);
  }, []);
  const d = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => data,
    () => empty,
  );
  return ready ? d : null;
}

export const actions = {
  saveProfile(p: Profile) {
    setData((d) => ({ ...d, profile: p }));
  },
  upsertCheckIn(c: CheckIn) {
    setData((d) => ({ ...d, checkIns: [...d.checkIns.filter((x) => x.id !== c.id), c] }));
  },
  deleteCheckIn(id: string) {
    setData((d) => ({ ...d, checkIns: d.checkIns.filter((x) => x.id !== id) }));
  },
  setConsent(v: boolean) {
    setData((d) => ({ ...d, photoConsent: v }));
  },
  setVisionUrl(v: string) {
    setData((d) => ({ ...d, visionApiUrl: v.trim().replace(/\/$/, "") }));
  },
  logRec(day: number, date: string, recId: string, title: string) {
    setData((d) =>
      d.history.some((h) => h.date === date && h.recId === recId)
        ? d
        : { ...d, history: [...d.history.filter((h) => h.date !== date), { day, date, recId, title }].slice(-60) },
    );
  },
  async resetAll() {
    await photos.clear();
    setData(() => empty);
  },
};

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ---------- Photos (IndexedDB, device-local) ----------
function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((res, rej) => {
    const req = fn(d.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

let photoVersion = 0;
const photoListeners = new Set<() => void>();
function photoEmit() {
  photoVersion++;
  photoListeners.forEach((l) => l());
}

export const photos = {
  async all(): Promise<Photo[]> {
    const list = (await tx("readonly", (s) => s.getAll())) as Photo[];
    return list.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  },
  async put(p: Photo) {
    await tx("readwrite", (s) => s.put(p));
    photoEmit();
  },
  async remove(id: string) {
    await tx("readwrite", (s) => s.delete(id));
    photoEmit();
  },
  async clear() {
    if (typeof indexedDB === "undefined") return;
    await tx("readwrite", (s) => s.clear());
    photoEmit();
  },
};

export function usePhotos(): Photo[] | null {
  const [list, setList] = useState<Photo[] | null>(null);
  const [v, setV] = useState(photoVersion);
  useEffect(() => {
    const l = () => setV(photoVersion);
    photoListeners.add(l);
    return () => {
      photoListeners.delete(l);
    };
  }, []);
  useEffect(() => {
    photos.all().then(setList).catch(() => setList([]));
  }, [v]);
  return list;
}
