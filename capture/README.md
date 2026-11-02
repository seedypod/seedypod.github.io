# Product media

Screenshots in `public/media/` are the real seedypod web UI from a demo build of seedypod/core (`VITE_DEMO=1`), which runs against an in-browser simulated tower with seeded history. No hardware, network or personal data is involved. `scripts/capture-core.mjs` serves the build, captures each route at 1440×1000 @2x in dark mode, and rewrites `manifest.json`. See the repository README for the commands.

The overview video is recorded from the same kind of build by `scripts/capture-overview.mjs` (one video per scene, real input, a fixed midday clock so the grow light is on) and framed by `scripts/render-overview.mjs`, which adds the chapter titles and the seedypod logo around the unchanged recordings. `overview.json` records each scene, what it verified, and the timeline; its source commit is newer than the screenshots'.
