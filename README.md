# KavachForWork

KavachForWork is a mobile-first safety and climate-risk app for outdoor workers. This repo contains:

- `client/` - React + Vite frontend
- `server/` - Node.js + Express API
- `ai/` - FastAPI fraud/verification service
- `mobile/` - Capacitor Android wrapper

## Before GitHub

- Keep `.env` private. It is already ignored.
- Use `.env.example` as the public template.
- Do not commit Android keystores, MongoDB secrets, API keys, or SMS credentials.

## Local Run

Prerequisites:

- Node.js 20+
- Python 3.11+
- MongoDB Atlas or local MongoDB

Install:

```bash
npm run install:all
cd ai && pip install -r requirements.txt
```

Create `.env` from `.env.example`, then start:

```bash
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- AI service: `http://localhost:8000`

## Hosting Plan

Recommended split:

- `client/` -> Vercel or Netlify
- `server/` -> Render, Railway, or VPS
- `ai/` -> Render or Railway
- MongoDB -> MongoDB Atlas

Update these env values when hosting:

- `CLIENT_URL`
- `AI_SERVICE_URL`
- `MONGODB_URI`
- `JWT_SECRET`
- `OPENWEATHER_API_KEY` (optional)
- `GEMINI_API_KEY` (optional, for chatbot)
- `TWILIO_*` if using real OTP SMS

Weather and location notes:

- Weather works without any weather API key because the backend falls back to Open-Meteo.
- `OPENWEATHER_API_KEY` is optional and improves weather coverage.
- Live location does not need a separate key. The app uses browser/native geolocation and BigDataCloud reverse geocoding.

## Android APK

This repo already includes a Capacitor Android project in `mobile/android`.

Build steps:

```bash
cd client && npm run build
cd ../mobile && npm run sync
cd android && .\gradlew assembleDebug
```

Expected debug APK output:

```text
mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Requirements for APK build:

- Java installed
- Android SDK installed
- `ANDROID_HOME` or `ANDROID_SDK_ROOT` set

## Notes

- Forgot-password OTP is wired for Twilio, with fallback/mock behavior when credentials are missing.
- The mobile app uses Capacitor plus a native Android plugin for device/sensor access.
