# Product media

Screenshots in `public/media/` are the real seedypod web UI from a demo build of seedypod/core (`VITE_DEMO=1`), which runs against an in-browser simulated tower with seeded history. No hardware, network or personal data is involved. `scripts/capture-core.mjs` serves the build, captures each route at 1440×1000 @2x in dark mode, and rewrites `manifest.json`. See the repository README for the commands.

The overview video is recorded from the same kind of build by `scripts/capture-overview.mjs` (one video per scene, real input, a fixed midday clock so the grow light is on) and framed by `scripts/render-overview.mjs`, which adds the chapter titles and the seedypod logo around the unchanged recordings. `overview.json` records each scene, what it verified, and the timeline; its source commit is newer than the screenshots'.

## Installation screenshots

`install-imager-device.png`, `install-imager-os.png` and `install-ssh-login.png` are original screenshots supplied by the owner on November 7, 2026, captured November 6 local time. They show Raspberry Pi Imager 2.0.12 and a real SSH login with seedypod development build `531ca8b`. They are copied unchanged, not generated or recaptured from the web demo. Their dimensions, byte counts and SHA-256 checksums are recorded in `manifest.json`. Preserve these entries and files when refreshing demo captures; `capture-core.mjs` rewrites the manifest for its own captures.
