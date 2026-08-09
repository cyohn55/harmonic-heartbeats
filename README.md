# Harmonic Heartbeats 🎵

A daily music trivia & art web app, styled as a phone with a simulated SMS chat.
Pick an artist to play a trivia quiz (confetti on a perfect score!), then browse the
digital art gallery.

## Live site

Published via GitHub Pages — see the repository's **Settings → Pages** for the URL.

## Running locally

It's a single self-contained file. Just open `index.html` in any modern browser,
or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Project layout

- `index.html` — the deployed app (served by GitHub Pages from the repo root).
- `Working/index.html` — development copy; edit here, then copy to the root to publish.
- `.nojekyll` — tells GitHub Pages to serve files as-is (no Jekyll processing).

## Tech

React 18, Tailwind CSS, Font Awesome, and canvas-confetti — all loaded from CDNs,
with JSX transpiled in the browser. No build step required.
