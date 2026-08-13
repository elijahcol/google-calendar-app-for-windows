# Google Calendar Desktop

A minimal Windows desktop wrapper for Google Calendar, built with
[Electron](https://www.electronjs.org/). It opens `calendar.google.com`
in its own native window — its own taskbar icon, its own title bar, no
browser tabs, no PWA install banner — and can be packaged as an **MSIX**
(`.appx`) file suitable for submission to the Microsoft Store.

A GitHub Actions workflow is included that builds the MSIX for you
automatically on a real Windows machine in the cloud, so you don't need
Windows locally to produce the package.

---

## Table of contents

1. [What this actually is](#what-this-actually-is)
2. [Before you spend time on this: Microsoft Store policy risk](#before-you-spend-time-on-this-microsoft-store-policy-risk)
3. [Project structure](#project-structure)
4. [Live day icon](#live-day-icon)
5. [Running it locally](#running-it-locally)
6. [Building the MSIX with GitHub Actions](#building-the-msix-with-github-actions)
7. [Required config before you can submit: identity values](#required-config-before-you-can-submit-identity-values)
8. [Submitting to the Microsoft Store](#submitting-to-the-microsoft-store)
9. [Sideloading the MSIX without the Store](#sideloading-the-msix-without-the-store)
10. [Customizing the app](#customizing-the-app)
11. [Troubleshooting](#troubleshooting)

---

## What this actually is

`main.js` creates a single `BrowserWindow` that loads
`https://calendar.google.com/calendar/u/0/r`. That's the entire app. It
is **not** a reimplementation of Calendar and does not use any Google
API — it's a native window frame around the same website you'd see in
a browser, with:

- A persistent login session stored locally (`partition: 'persist:gcal'`),
  so you stay signed in between launches.
- External links (account switcher, help center, etc.) opened in your
  default browser instead of inside the app window.
- A hidden menu bar (press `Alt` to reveal Reload / Zoom / DevTools).
- A window/taskbar icon that updates to show **today's actual date**,
  the way Google's own Calendar app icon does — see
  [Live day icon](#live-day-icon) below.

## Before you spend time on this: Microsoft Store policy risk

Read this before you set up a Partner Center account and reserve a name.

Microsoft Store policy (section 10.2.1 of the
[Microsoft Store Policies](https://learn.microsoft.com/en-us/legal/windows/agreements/store-policies))
requires that an app provide "unique and distinct value" and generally
disallows apps that are just a website loaded in a window with no
meaningful native functionality added. Reviewers do sometimes reject
plain "site-in-a-frame" wrappers, particularly ones that:

- Wrap a well-known third-party brand/service you don't own or have
  permission to represent (Google, in this case), and
- Don't add functionality beyond what the website already does in a
  browser (no offline support, no OS-level notifications, no widgets,
  etc.)

This app currently falls into that category. It may pass review, or it
may not — Store review outcomes for this kind of app are inconsistent
in practice. Two things you can do to improve its odds if you want to
pursue this:

- **Add real native value**: Windows toast notifications for upcoming
  events, a jump-list/taskbar quick-create shortcut, offline "you're
  offline" handling, keyboard shortcuts, etc. `main.js` is a good
  starting point for adding these with Electron's `Notification` and
  `app.setUserTasks` APIs. The live date-flipping icon (below) is one
  small step in this direction — it's an actual OS-integration feature
  a plain browser tab can't give you.
- **Be upfront in your Store listing** that this is an unofficial,
  independent wrapper and not made by or affiliated with Google — do
  not use Google's logo or claim affiliation, per Microsoft's
  [trademark policy](https://learn.microsoft.com/en-us/legal/windows/agreements/store-policies#1012-icons-titles-and-metadata).
  The icon in this repo is an original design (not Google's), which
  helps here too.

If you'd rather skip the Store entirely, see
[Sideloading the MSIX without the Store](#sideloading-the-msix-without-the-store)
— that path has no review or trademark gate.

## Project structure

```
.
├── main.js                        # Electron main process — creates the window,
│                                   #   drives the live day icon
├── iconTemplate.js                # SVG icon generator, parameterized by day number
├── icon-render.html                # Hidden page main.js uses to render the SVG
│                                   #   via Chromium and capture it as an image
├── scripts/
│   └── build-icons.js             # Regenerates the static icon.ico / icon1024.png
├── package.json                   # App metadata + electron-builder MSIX config
├── icon.ico                       # Static window/taskbar icon (fallback before
│                                   #   the first live capture, and the .exe's
│                                   #   embedded icon)
├── icon1024.png                   # Static source icon electron-builder uses to
│                                   #   generate all Store tile sizes
├── .github/
│   └── workflows/
│       └── build-msix.yml         # Builds the MSIX on a Windows GitHub runner
└── .gitignore
```

## Live day icon

The app's window and taskbar icon shows the actual current day of the
month, the way Google's own Calendar app icon does — a "31" on the
31st, a "5" on the 5th, and so on. Here's how it works:

1. `iconTemplate.js` exports `renderIconSVG(day)`, which returns the
   calendar icon as an SVG string with the given number drawn on it.
2. On launch, `main.js` opens a hidden, invisible `BrowserWindow`
   pointed at `icon-render.html`, which calls `renderIconSVG(new Date().getDate())`
   and injects the result into the page.
3. Once that hidden window finishes rendering, `main.js` captures it as
   an image (`webContents.capturePage()`) and applies it with
   `mainWindow.setIcon()`.
4. A timer recalculates this at the next local midnight, then every 24
   hours after that, so the icon flips over automatically if you leave
   the app running overnight.

This uses Electron's own Chromium to rasterize the SVG, so there's no
extra native dependency (no `canvas`/`sharp` needed at runtime, no
`electron-rebuild` step to worry about in CI).

**Important limitation**: this only updates the icon *while the app is
running*. A taskbar shortcut pinned to a closed app, or the Start menu
tile, will show whatever's baked into the `.exe`/`.appx` at build
time (see below) — Windows doesn't let a packaged Store app rewrite its
own installed icon resource on disk. If you want the pinned/Start tile
to also stay current without the app open, that requires hooking into
Windows' live tile / badge notification APIs, which is a meaningfully
bigger addition — happy to help build that out if you want to go
further.

**Regenerating the static icon** (`icon.ico` / `icon1024.png`, used for
the Store tile and the .exe's embedded resource) from the same
template:

```bash
npm install                 # pulls in sharp + png-to-ico (dev-only, not bundled into the app)
npm run build-icons         # defaults to today's date
npm run build-icons -- 15   # or pass a specific day, e.g. for a nicer-looking Store screenshot
```

Commit the regenerated `icon.ico` / `icon1024.png` before pushing if
you run this.

## Running it locally

You need [Node.js](https://nodejs.org/) 18+ installed (any OS — this
part works fine on Windows, macOS, or Linux).

```bash
npm install
npm start
```

This opens the app in an Electron window without packaging anything —
useful for testing changes to `main.js` quickly.

## Building the MSIX with GitHub Actions

MSIX/AppX packages can only be built by Microsoft's packaging tools,
which only run on Windows. Rather than requiring you to have a Windows
machine, this repo's `.github/workflows/build-msix.yml` builds it for
you on a `windows-latest` GitHub-hosted runner.

**Steps:**

1. Create a new GitHub repository and push this project to it:

   ```bash
   cd gcal-desktop
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```

2. Once pushed, go to the **Actions** tab on your repository. The
   `Build MSIX` workflow runs automatically on every push to `main`
   (it also runs on pull requests, and you can trigger it manually via
   **Run workflow**).

3. When the run finishes (usually 2–4 minutes), open it and scroll to
   **Artifacts** at the bottom of the run summary page. Download
   **`GoogleCalendar-MSIX`** — it's a zip containing the `.appx` file.

You do **not** need Windows, Wine, or the Windows SDK on your own
machine for this — the runner has everything pre-installed.

## Required config before you can submit: identity values

Before your MSIX will actually install or be accepted by Partner
Center, you must replace the placeholder identity values in
`package.json` under `build.appx` with values that match your own
Microsoft account:

```json
"appx": {
  "identityName": "YourPublisherAlias.GoogleCalendarDesktop",
  "publisher": "CN=00000000-0000-0000-0000-000000000000",
  "publisherDisplayName": "Your Publisher Display Name"
}
```

Here's where each value comes from:

1. Go to [Partner Center](https://partner.microsoft.com/dashboard) and
   sign in (this requires a one-time developer account registration —
   there's an individual account fee, currently a single small
   one-time charge, no subscription).
2. Under **Apps and games**, click **New product → MSIX or PWA app**
   and reserve an app name. This generates your app's identity.
3. In the product's **Product identity** page, Partner Center shows
   you the exact `Package/Identity/Name` and
   `Package/Identity/Publisher` values (the publisher value looks like
   `CN=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`, a GUID tied to your
   account — this is normal and not something you invent yourself).
4. Copy those two values into `identityName` and `publisher` in
   `package.json` exactly as shown, commit, and push — the next
   Actions run will produce a package with the matching identity.

Without this step, the workflow will still successfully build an
`.appx` file (useful for local testing/sideloading), but Partner
Center will reject it on upload because the identity won't match your
reservation.

## Submitting to the Microsoft Store

Once you have a build with the correct identity values:

1. In Partner Center, open your reserved product → **Packages**.
2. Upload the `.appx` file downloaded from the GitHub Actions artifact.
3. Fill out the required Store listing fields: description,
   screenshots (at least one, 1366×768 or similar), age rating
   questionnaire, and privacy policy URL (required even for simple
   apps — a one-page static site explaining you don't collect data
   beyond what Google's own site does is sufficient).
4. Submit for certification. Review typically takes 1–3 days. See the
   [policy risk section](#before-you-spend-time-on-this-microsoft-store-policy-risk)
   above for what might come back as a rejection reason.

Note: **you don't need to code-sign the package yourself** for a Store
submission — Microsoft signs it during certification. Signing only
matters for the sideloading path below.

## Sideloading the MSIX without the Store

If you just want the MSIX to install on your own PC (or share with a
few people) without going through Store review at all:

1. Build the MSIX via GitHub Actions (identity values can stay as
   placeholders for this — they just need to be internally consistent,
   not match a real Partner Center reservation).
2. The package needs to be signed with a certificate trusted by the
   installing machine. For personal use, a self-signed cert works:

   ```powershell
   # On Windows, in an elevated PowerShell prompt:
   New-SelfSignedCertificate -Type Custom -Subject "CN=00000000-0000-0000-0000-000000000000" `
     -KeyUsage DigitalSignature -FriendlyName "GCal Desktop Test Cert" `
     -CertStoreLocation "Cert:\CurrentUser\My" `
     -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}")

   $cert = Get-ChildItem -Path Cert:\CurrentUser\My -CodeSigningCert | Select-Object -First 1
   Export-Certificate -Cert $cert -FilePath GCalTestCert.cer
   Import-Certificate -FilePath GCalTestCert.cer -CertStoreLocation Cert:\LocalMachine\Root

   & "C:\Program Files (x86)\Windows Kits\10\bin\<version>\x64\signtool.exe" sign /fd SHA256 /a /f GCalTestCert.cer YourApp.appx
   ```

   (`signtool.exe` ships with the Windows SDK — install it from
   [here](https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/)
   if you don't have it. The `Subject` CN must exactly match the
   `publisher` value in `package.json`.)

3. Double-click the signed `.appx` to install it directly — no Store
   involved.

## Customizing the app

- **Change the landing view**: edit the `GCAL_URL` constant at the top
  of `main.js` — e.g. `.../r/week` for week view, `.../r/day` for day
  view.
- **Change the icon design**: edit `iconTemplate.js` (colors, shape,
  font) — it's the single source of truth for both the live runtime
  icon and the static Store tile, so changes there apply everywhere
  after you re-run `npm run build-icons`.
- **Add notifications**: Electron's
  [`Notification`](https://www.electronjs.org/docs/latest/api/notification)
  API can surface native Windows toasts — this would also help with
  the Store policy concern above.
- **Window size on launch**: adjust `width`/`height` in the
  `BrowserWindow` constructor in `main.js`.

## Troubleshooting

**The Actions run fails at "Build MSIX" with a signing-related error.**
Placeholder `publisher` values are fine for build (they don't require a
real certificate to produce the `.appx` file) — if you see a signing
failure, check that you haven't accidentally added a `certificateFile`
option under `build.win` without also providing the certificate as a
repo secret. This template doesn't sign during CI on purpose (Store
handles signing on submission).

**"No .appx or .msix file was produced" in the Actions log.**
Check the "Build MSIX" step's full output above it — this usually means
an electron-builder config error (e.g. invalid `identityName` format
with disallowed characters; it must be alphanumeric plus periods, no
spaces).

**Partner Center rejects the upload with an identity mismatch.**
Your `identityName` and `publisher` in `package.json` must be an exact
character-for-character match with the values shown on your product's
Product identity page in Partner Center — regenerate and push again
after correcting them.

**The taskbar icon doesn't update / stays on the placeholder number.**
Check DevTools (`Alt` → View → Toggle DevTools) and the terminal
output for a "Failed to update daily icon" message. This almost always
means `icon-render.html` and/or `iconTemplate.js` didn't ship inside
the packaged app — confirm both are listed under `build.files` in
`package.json`, since electron-builder only bundles files explicitly
listed there.
