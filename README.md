# seedypod product and documentation site

Nextra + Next.js static export, served at https://seedypod.github.io/. Modeled on [sleepypod.github.io](https://github.com/sleepypod/sleepypod.github.io).

The pin map has been checked against the stock Gardyn 3.0 firmware but not yet probed on a board. Pages must not present hardware behaviour that hasn't been probed on a unit as verified.

## Develop

Use Node 24 and pnpm 10.34.5. The logo and icon PNGs in `public/brand/` are stored with [Git LFS](https://git-lfs.com), so install it before cloning (`brew install git-lfs`, then `git lfs install` once per machine). In a clone made without it, run `git lfs pull`, or the images are text pointer files and the browser checks fail on the broken logo.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

## Validate the production output

```sh
pnpm exec playwright install chromium
pnpm check
```

`pnpm check` verifies media, builds `out/`, creates its Pagefind index and `out/search-index.json`, checks TypeScript, and runs desktop/mobile browser tests (every route, every internal link and fragment, search, sidebar, API reference, Mermaid, 404) against a static file server. Set `PORT` for `scripts/serve.mjs` and `SITE_URL` for Playwright if port 4173 is taken.

`scripts/build-search-index.mjs` writes `/search-index.json` for the core web app's command palette: one entry per visible guide with its path, title, section, description, h2/h3 anchors read from the built HTML, and frontmatter `keywords`. Set `searchable: false` in a page's frontmatter to leave it out.

## Content sources

[seedypod/core](https://github.com/seedypod/core)'s `docs/` folder is the source of truth. Imported pages pin the core commit they were imported from (currently `8781ac82e6a3549d5c7684ab33ac66f3c79e5ba2` on `dev`); hand-written pages cite `a2f6b4c98085d6729f8c2f315237f87f759518e2` (the `chore/rename-seedypod` branch).

- **Imported pages** (`content/developers/adr/`, `hal`, `hardware`, `deployment`, `testing`, `implementation-plan`, `handoff`) are generated from core's OKF documents. Do not edit them here; change core, then re-import:

  ```sh
  CORE_DOCS=/path/to/core/docs CORE_COMMIT=<sha> pnpm docs:import && pnpm format
  ```

  OKF `title`/`description` become Nextra frontmatter, `status: draft` becomes a warning callout, `sources` becomes a footer, and `type`/`generated` are dropped. Links between docs are rewritten to site routes; other repository links point at the pinned commit on GitHub.

- **Hand-written pages** (`getting-started`, `core/*`, `ios`, `developers/index`, `architecture`, `hal-contract`, `api`, `about`) are written from core's docs and source and cite them.

- **API reference**: `public/openapi.json` is a snapshot of core's spec, rendered by `components/OpenApiReference.tsx`. To refresh it, build core (`pnpm build`), run `DATA_DIR=$(mktemp -d) CI=1 node server/dist/index.js`, and save `GET http://localhost:3000/api/openapi.json`.

## Media

`public/brand/` holds the seedypod icon (favicon and apple-touch icon) and the horizontal logo in light and dark variants, resized from the brand asset set; they are stored in Git LFS. `public/media/` holds real web UI screenshots captured from core's demo build (`VITE_DEMO=1`, simulated tower). The `ios-*.png` screenshots come from [seedypod/ios](https://github.com/seedypod/ios)'s demo mode in the iPhone 17 Pro simulator, resized to 552x1200 with `sips -Z 1200`. `capture/manifest.json` records the source commit, method, dimensions and SHA-256 of each file; `pnpm media:verify` checks them. To recapture:

```sh
# in a core checkout at the pinned commit
VITE_DEMO=1 npx vite build --config web/vite.config.ts --outDir /tmp/seedypod-demo
# here
DEMO_DIST=/tmp/seedypod-demo CORE_COMMIT=<sha> pnpm media:capture
```

The homepage overview video (`public/media/seedypod-overview.mp4` and its poster) is recorded from the same demo build, one Playwright video per scene with real pointer and keyboard input, then framed with chapter titles by ffmpeg. `capture/overview.json` records the scenes, what each verified, and the timeline. It needs `ffmpeg` and a GPU for WebGL (Metal on a Mac; set `CAPTURE_GL` otherwise, see the script):

```sh
DEMO_DIST=/tmp/seedypod-demo CORE_COMMIT=<sha> node scripts/capture-overview.mjs
node scripts/render-overview.mjs
```

## CI and publishing

Pull requests run **Build and browser checks**. The Pages workflow repeats the production checks and deploys `out/` on pushes to `main`. In GitHub Settings → Pages, the build source is **GitHub Actions**.

After deployment, verify against production:

```sh
SITE_URL=https://seedypod.github.io pnpm test
```

## Dependency patch

`patches/nextra-theme-docs@4.6.1.patch` marks the layout schema's `children` optional because Nextra removes it before validating the remaining theme props. This is the upstream [Nextra #5036](https://github.com/shuding/nextra/issues/5036) defect. pnpm applies the patch on every locked install; remove it once an upstream release fixes the schema.

## License

Site content documents AGPL-3.0 software from seedypod/core; screenshots originate from that repository.
