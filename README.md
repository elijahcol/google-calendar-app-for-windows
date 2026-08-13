# Google Calendar Desktop

A minimal Windows desktop wrapper for Google Calendar, built with
[Electron](https://www.electronjs.org/). It opens `calendar.google.com`
in its own native window — its own taskbar icon, its own title bar, no
browser tabs, no PWA install banner.

## Download

Grab the latest build from the
**[Releases page](../../releases/latest)** — download
`GoogleCalendar-Windows.zip`, unzip it anywhere, and run
`GoogleCalendar.exe`. No installer, no admin rights needed.

A GitHub Actions workflow rebuilds this automatically on every push to
`main`, so the Releases page always has a current version.

## What this actually is

`main.js` creates a single window that loads
`https://calendar.google.com/calendar/u/0/r`. That's the entire app —
a native window frame around the same website you'd see in a browser,
with a few extras:

- **A persistent login session**, stored locally, so you stay signed
  in between launches.
- **External links** (account switcher, help center, etc.) open in
  your default browser instead of inside the app window.
- **A hidden menu bar** — press `Alt` to reveal Reload / Zoom / DevTools.
- **A taskbar icon that shows today's actual date**, the way Google's
  own Calendar app icon does — see [Live day icon](#live-day-icon)
  below.

## Project structure

```
.
├── main.js                        # Electron main process — creates the window,
│                                   #   drives the live day icon
├── iconTemplate.js                # SVG icon generator, parameterized by day number
├── icon-render.html               # Hidden page main.js uses to render the SVG
│                                   #   via Chromium and capture it as an image
├── scripts/
│   └── build-icons.js             # Regenerates the static icon.ico / icon1024.png
├── package.json                   # App metadata + electron-packager config
├── icon.ico                       # Static window/taskbar icon (fallback before
│                                   #   the first live capture, and the .exe's
│                                   #   embedded icon)
├── icon1024.png                   # Source icon used to regenerate icon.ico
├── .github/
│   └── workflows/
│       └── build-release.yml      # Builds the .exe and publishes it as a
│                                   #   GitHub Release on every push to main
└── .gitignore
```

## Live day icon

The app's window and taskbar icon shows the actual current day of the
month — a "31" on the 31st, a "5" on the 5th, and so on, the same way
Google's own Calendar app icon works. Here's how:

1. `iconTemplate.js` exports `renderIconSVG(day)`, which returns the
   calendar icon as an SVG string with the given number drawn on it.
2. On launch, `main.js` opens a hidden, invisible window pointed at
   `icon-render.html`, which calls `renderIconSVG(new Date().getDate())`
   and injects the result into the page.
3. Once that hidden window finishes rendering, `main.js` captures it as
   an image and applies it as the window/taskbar icon.
4. A timer recalculates this at the next local midnight, then every 24
   hours after that, so the icon flips over automatically if you leave
   the app running overnight.

This uses Electron's own Chromium to rasterize the SVG, so there's no
extra native dependency at runtime.

**Limitation**: this only updates the icon *while the app is running*.
A taskbar shortcut pinned while the app is closed shows whatever's
baked into the `.exe` at build time (see below) — there's no way for a
plain desktop app to rewrite its own icon file on disk from outside a
running process.

**Regenerating the static icon** (`icon.ico` / `icon1024.png`, used as
the fallback before the first live capture and as the `.exe`'s
embedded resource) from the same template:

```bash
npm install                 # pulls in sharp + png-to-ico (dev-only, not bundled into the app)
npm run build-icons         # defaults to today's date
npm run build-icons -- 15   # or pass a specific day
```

Commit the regenerated `icon.ico` / `icon1024.png` before pushing if
you run this.

## Running it locally (for development)

You need [Node.js](https://nodejs.org/) 18+ installed.

```bash
npm install
npm start
```

This opens the app without packaging anything — useful for testing
changes to `main.js` quickly.

## Building the .exe yourself

Normally you don't need to do this — GitHub Actions does it for every
push (see [Download](#download) above). But if you want a local build:

```bash
npm install
npm run package-win
```

This produces `dist/GoogleCalendar-win32-x64/GoogleCalendar.exe` plus
its supporting files. Note that packaging a *Windows* app only reliably
works from a Windows machine (or the GitHub Actions Windows runner) —
running `npm run package-win` on macOS/Linux may fail unless you have
Wine installed.

## Customizing the app

- **Change the landing view**: edit the `GCAL_URL` constant at the top
  of `main.js` — e.g. `.../r/week` for week view, `.../r/day` for day
  view.
- **Change the icon design**: edit `iconTemplate.js` (colors, shape,
  font) — it's the single source of truth for both the live runtime
  icon and the static fallback, so changes apply everywhere after you
  re-run `npm run build-icons`.
- **Add notifications**: Electron's
  [`Notification`](https://www.electronjs.org/docs/latest/api/notification)
  API can surface native Windows toasts for upcoming events.
- **Window size on launch**: adjust `width`/`height` in the window
  constructor in `main.js`.

## Troubleshooting

**The Releases page has no builds yet / the zip is missing.**
Check the **Actions** tab — the first run needs to finish (a few
minutes) before a Release appears. If a run failed, its log will show
which step broke.

**The taskbar icon doesn't update / stays on the placeholder number.**
Open DevTools (`Alt` → View → Toggle DevTools) and check the console,
plus the terminal if running via `npm start`, for a "Failed to update
daily icon" message.

**`npm run package-win` fails locally on macOS/Linux.**
This is expected without Wine installed — packaging Windows apps needs
either a Windows machine or Wine for the icon/metadata embedding step.
Easiest fix: let the GitHub Actions workflow build it instead (it runs
on real Windows).
