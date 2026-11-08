# FIRST 30 — OpenCV photo service

A separate Python FastAPI service that performs real OpenCV processing for the Photo Journal:
safe decoding, resizing to 600×750, brightness/exposure, Laplacian sharpness, blur/lighting
flags, CLAHE-normalised previews and ORB + RANSAC alignment to the baseline (with fallback).

It never stores images and never assesses skin conditions.

## Run locally

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

Deploy anywhere that runs Python (Render, Railway, Fly.io). Set `ALLOWED_ORIGINS` to your app URL.

## Connect the app

Open **Profile & Privacy → OpenCV photo service**, paste the service URL (e.g. `http://localhost:8000`) and press **Save & test**.
New photos are then analysed with OpenCV; without it the app uses a clearly labelled basic browser check.
