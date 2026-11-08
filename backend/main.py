"""FIRST 30 — OpenCV photo quality service (FastAPI).

Processes images in memory only; nothing is stored. Checks image quality
(lighting, sharpness, alignment). It does NOT assess skin conditions.
"""
import base64
import os

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

MAX_BYTES = 8 * 1024 * 1024
ALLOWED = {"image/jpeg", "image/png", "image/webp"}
SIZE = (600, 750)  # width, height

app = FastAPI(title="FIRST 30 Vision")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


async def read_image(f: UploadFile) -> np.ndarray:
    if f.content_type not in ALLOWED:
        raise HTTPException(415, "Only JPG, PNG or WEBP images are accepted.")
    raw = await f.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise HTTPException(413, "Image is larger than 8 MB.")
    img = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "Could not decode image.")
    return img


def resize_cover(img: np.ndarray) -> np.ndarray:
    tw, th = SIZE
    h, w = img.shape[:2]
    s = max(tw / w, th / h)
    r = cv2.resize(img, (int(w * s + 0.5), int(h * s + 0.5)), interpolation=cv2.INTER_AREA)
    y, x = (r.shape[0] - th) // 2, (r.shape[1] - tw) // 2
    return r[y : y + th, x : x + tw]


def quality(img: np.ndarray) -> dict:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    small = cv2.resize(gray, (256, int(256 * gray.shape[0] / gray.shape[1])))
    brightness = float(small.mean())
    sharpness = float(cv2.Laplacian(small, cv2.CV_64F).var())
    return {
        "brightness": round(brightness),
        "sharpness": round(sharpness),
        "lighting": "dark" if brightness < 70 else "bright" if brightness > 200 else "good",
        "sharp": "blurry" if sharpness < 60 else "good",
    }


def normalize(img: np.ndarray) -> np.ndarray:
    """Gentle CLAHE on luminance for a consistent preview (display only)."""
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    l = cv2.createCLAHE(clipLimit=1.5, tileGridSize=(8, 8)).apply(l)
    return cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)


def align(img: np.ndarray, base: np.ndarray):
    """ORB + RANSAC homography to the baseline. Falls back safely on failure."""
    try:
        orb = cv2.ORB_create(1500)
        g1 = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        g2 = cv2.cvtColor(base, cv2.COLOR_BGR2GRAY)
        k1, d1 = orb.detectAndCompute(g1, None)
        k2, d2 = orb.detectAndCompute(g2, None)
        if d1 is None or d2 is None or len(k1) < 20 or len(k2) < 20:
            return img, False, 0
        matches = sorted(cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True).match(d1, d2), key=lambda m: m.distance)[:300]
        if len(matches) < 25:
            return img, False, len(matches)
        src = np.float32([k1[m.queryIdx].pt for m in matches]).reshape(-1, 1, 2)
        dst = np.float32([k2[m.trainIdx].pt for m in matches]).reshape(-1, 1, 2)
        H, mask = cv2.findHomography(src, dst, cv2.RANSAC, 5.0)
        inliers = int(mask.sum()) if mask is not None else 0
        if H is None or inliers < 20 or abs(np.linalg.det(H[:2, :2]) - 1) > 0.5:
            return img, False, inliers
        return cv2.warpPerspective(img, H, (base.shape[1], base.shape[0])), True, inliers
    except cv2.error:
        return img, False, 0


def to_data_url(img: np.ndarray) -> str:
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return "data:image/jpeg;base64," + base64.b64encode(buf).decode()


@app.get("/health")
def health():
    return {"status": "ok", "opencv": cv2.__version__}


@app.post("/analyze")
async def analyze(image: UploadFile = File(...), baseline: UploadFile | None = File(None)):
    img = resize_cover(await read_image(image))
    q = quality(img)
    out = img
    if baseline is not None:
        base = resize_cover(await read_image(baseline))
        out, ok, n = align(img, base)
        bq = quality(base)
        q["alignment"] = "successful" if ok else "unreliable"
        q["matches"] = n
        q["reliability"] = (
            "good" if ok and q["lighting"] == "good" and q["sharp"] == "good" and abs(bq["brightness"] - q["brightness"]) <= 35 else "limited"
        )
    else:
        q["reliability"] = "good" if q["lighting"] == "good" and q["sharp"] == "good" else "limited"
    return {"quality": q, "normalized": to_data_url(normalize(out))}
