# GitHub Push Ready

Use this file to push the project to your GitHub account `ayush382004`.

## Current local state

- Repo folder: `kavachforwork`
- Branch: `main`
- Latest local commit: `7cceab0`
- Current remote: `Shubhuk2005/kavachforwork_render_ready`

## 1. Open PowerShell in the project folder

```powershell
cd "C:\Users\gorai\Downloads\kavachforwork_render_ready (3)\kavachforwork_render_ready (3)\kavachforwork"
```

## 2. Log into GitHub CLI

```powershell
& 'C:\Program Files\GitHub CLI\gh.exe' auth login --hostname github.com --git-protocol https --web
```

Check login:

```powershell
& 'C:\Program Files\GitHub CLI\gh.exe' auth status
```

You should see account `ayush382004`.

## 3. Create a new repo under your account

If you want the repo name `kavachforwork`:

```powershell
& 'C:\Program Files\GitHub CLI\gh.exe' repo create ayush382004/kavachforwork --private --source . --remote origin --push
```

If the repo already exists, use these commands instead:

```powershell
& 'C:\Users\gorai\Downloads\kavachforwork_render_ready (3)\kavachforwork_render_ready (3)\tools\mingit\cmd\git.exe' remote remove origin
& 'C:\Users\gorai\Downloads\kavachforwork_render_ready (3)\kavachforwork_render_ready (3)\tools\mingit\cmd\git.exe' remote add origin https://github.com/ayush382004/kavachforwork.git
& 'C:\Users\gorai\Downloads\kavachforwork_render_ready (3)\kavachforwork_render_ready (3)\tools\mingit\cmd\git.exe' push -u origin main
```

## 4. Verify push

```powershell
& 'C:\Users\gorai\Downloads\kavachforwork_render_ready (3)\kavachforwork_render_ready (3)\tools\mingit\cmd\git.exe' remote -v
& 'C:\Users\gorai\Downloads\kavachforwork_render_ready (3)\kavachforwork_render_ready (3)\tools\mingit\cmd\git.exe' log --oneline -n 1
```

## 5. Important local-only files

These should stay local and are already ignored:

- `.env`
- `mobile/android/local.properties`
- `mobile/android/keystore.properties`
- `*.keystore`
- `*.jks`

## 6. APK paths

Debug APK:

```text
mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Release APK:

```text
mobile/android/app/build/outputs/apk/release/app-release.apk
```

## 7. Render next

After pushing to GitHub, connect the repo to Render and deploy using:

- Blueprint file: `render.yaml`
- Required secrets on Render:
  - `MONGODB_URI`
  - `WEATHERSTACK_API_KEY`
  - `ADMIN_PASSWORD`
  - `ANTHROPIC_API_KEY` if chatbot is needed
  - `RAZORPAY_KEY_ID`
  - `RAZORPAY_KEY_SECRET`

