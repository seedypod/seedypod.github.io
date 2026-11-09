// Compose the overview video: original chapter typography around the unchanged
// recordings from scripts/capture-overview.mjs. Writes public/media/seedypod-overview.{mp4,png},
// their capture/manifest.json entries, and capture/overview.json (scenes and timeline).
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

const dir = '.capture/overview'
const meta = JSON.parse(await readFile(dir + '/capture.json', 'utf8'))
if (meta.errors.length) throw new Error('Review browser errors before rendering')
const chapters = [
  {
    scene: 'tower',
    kicker: '01 / YOUR TOWER',
    title: ['Every pod,', 'at a glance.'],
    body: ['Turn the tower in 3D.', 'Each plant drawn at its stage.', 'Flags show what needs you.'],
  },
  {
    scene: 'zones',
    kicker: '02 / LIGHT ZONES',
    title: ['Plant where', 'it grows best.'],
    body: [
      'Gardyn’s light zones, on the tower.',
      'Home and Studio each mapped.',
      'High, medium and low light.',
    ],
  },
  {
    scene: 'grow',
    kicker: '03 / GROW',
    title: ['Watch it', 'grow.'],
    body: [
      'Scrub from seedling to harvest.',
      'See where a plant would do better.',
      'Leaf cover from the cameras.',
    ],
  },
  {
    scene: 'light',
    kicker: '04 / LIGHT',
    title: ['Sun on', 'a curve.'],
    body: [
      'Ramp brightness between setpoints.',
      'A change holds for a while,',
      'then the curve takes over.',
    ],
  },
  {
    scene: 'water',
    kicker: '05 / WATER',
    title: ['Water,', 'within limits.'],
    body: ['Every pump run is bounded.', 'Cycles on a schedule.', 'Tank history at a glance.'],
  },
  {
    scene: 'autopilot',
    kicker: '06 / AUTOPILOT',
    title: ['Rules that', 'tend it for you.'],
    body: [
      'React to the tank, air or pH.',
      'Backtest a rule before it acts.',
      'Dry-run until you trust it.',
    ],
  },
  {
    scene: 'status',
    kicker: '07 / SYSTEM',
    title: ['Know it’s', 'healthy.'],
    body: ['Every part checked.', 'Today’s light, water and air.', 'All on your own network.'],
  },
]

// The seedypod palette (core's --lp-* tokens): warm near-black, cream text, sage green.
const C = {
  bg: '#11100c',
  glow: '#26301f',
  text: '#efe8da',
  soft: '#b8af9c',
  muted: '#847c6b',
  green: '#94b98a',
  frame: '#2a271f',
}
const logo = await readFile('public/brand/dark/horizontal-340.png')
const logoUri = 'data:image/png;base64,' + logo.toString('base64')
const esc = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
function background(c, ending = false) {
  const font = 'font-family="Helvetica"'
  return `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="glow"><stop stop-color="${C.glow}"/><stop offset="1" stop-color="${C.bg}"/></radialGradient></defs><rect width="1920" height="1080" fill="${C.bg}"/><ellipse cx="100" cy="30" rx="760" ry="650" fill="url(#glow)"/><image href="${logoUri}" x="52" y="40" width="227" height="80"/><path d="M60 140H390" stroke="${C.green}" stroke-width="2"/><text x="60" y="212" fill="${C.green}" font-size="15" letter-spacing="2" ${font}>${esc(c.kicker)}</text>${c.title.map((t, i) => `<text x="60" y="${320 + i * 65}" fill="${C.text}" font-size="48" font-weight="600" ${font}>${esc(t)}</text>`).join('')}${c.body.map((t, i) => `<text x="60" y="${520 + i * 36}" fill="${C.soft}" font-size="22" ${font}>${esc(t)}</text>`).join('')}<text x="60" y="970" fill="${C.soft}" font-size="18" ${font}>${ending ? 'seedypod.github.io' : 'seedypod core · real interface'}</text><text x="60" y="1002" fill="${C.muted}" font-size="17" ${font}>Simulated tower · demo data · silent tour</text><rect x="457" y="37" width="1446" height="1006" rx="3" fill="${C.frame}"/></svg>`
}

const ff = (args) =>
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    stdio: 'inherit',
  })
const probe = (file) =>
  JSON.parse(
    execFileSync(
      'ffprobe',
      ['-v', 'quiet', '-print_format', 'json', '-show_streams', '-show_format', file],
      {
        encoding: 'utf8',
      },
    ),
  )
const enc = [
  '-an',
  '-r',
  '25',
  '-c:v',
  'libx264',
  '-preset',
  'medium',
  '-crf',
  '28',
  '-pix_fmt',
  'yuv420p',
  '-movflags',
  '+faststart',
]

await mkdir(dir + '/render', { recursive: true })
const segments = []
const timeline = []
let at = 0
function advance(name, file) {
  const duration = Number(probe(file).format.duration)
  segments.push(name)
  timeline.push({ chapter: name, start: at, duration })
  at = Math.round((at + duration) * 1000) / 1000
}

/** A title card: the chapter typography beside a still of the interface. */
async function still(name, c, seconds, image, ending = false) {
  const bg = await sharp(Buffer.from(background(c, ending)))
    .png()
    .toBuffer()
  const screen = await sharp(dir + '/' + image)
    .resize(1440, 1000, { fit: 'contain', background: C.bg })
    .png()
    .toBuffer()
  const file = `${dir}/render/${name}.png`
  await sharp(bg)
    .composite([{ input: screen, left: 460, top: 40 }])
    .png()
    .toFile(file)
  const out = `${dir}/render/${name}.mp4`
  ff([
    '-loop',
    '1',
    '-i',
    file,
    '-t',
    String(seconds),
    '-vf',
    `fade=t=in:st=0:d=0.35,fade=t=out:st=${seconds - 0.35}:d=0.35`,
    ...enc,
    out,
  ])
  advance(name, out)
}

await still(
  'intro',
  {
    kicker: 'A TOUR OF SEEDYPOD',
    title: ['Your garden,', 'your rules.'],
    body: [
      'Lights, water, sensors and grow',
      'reminders, on your own network.',
      'No account. No cloud.',
    ],
  },
  3,
  'tower-start.png',
)
for (const c of chapters) {
  const clip = meta.clips.find((x) => x.scene === c.scene)
  if (!clip) throw new Error('Missing scene ' + c.scene)
  const bg = `${dir}/render/${c.scene}.png`
  await sharp(Buffer.from(background(c)))
    .png()
    .toFile(bg)
  const out = `${dir}/render/${c.scene}.mp4`
  const length = clip.duration
  ff([
    '-loop',
    '1',
    '-i',
    bg,
    '-ss',
    String(clip.start),
    '-i',
    clip.file,
    '-t',
    String(length),
    '-filter_complex',
    `[1:v]scale=1440:1000,fps=25,setpts=PTS-STARTPTS[s];[0:v][s]overlay=460:40:shortest=1,fade=t=in:st=0:d=0.25,fade=t=out:st=${length - 0.25}:d=0.25[v]`,
    '-map',
    '[v]',
    ...enc,
    out,
  ])
  advance(c.scene, out)
}
await still(
  'outro',
  {
    kicker: 'BRING YOUR TOWER HOME',
    title: ['Try it.', 'Grow your own.'],
    body: ['Explore the live demo.', 'Read the install guide.', 'seedypod.github.io'],
  },
  4,
  'grow-start.png',
  true,
)
await writeFile(
  `${dir}/render/concat.txt`,
  segments.map((s) => `file '${s}.mp4'`).join('\n') + '\n',
)
ff([
  '-f',
  'concat',
  '-safe',
  '0',
  '-i',
  `${dir}/render/concat.txt`,
  '-c',
  'copy',
  '-movflags',
  '+faststart',
  `${dir}/seedypod-overview.mp4`,
])
await sharp(`${dir}/render/intro.png`)
  .png({ compressionLevel: 9 })
  .toFile(`${dir}/seedypod-overview.png`)

const manifest = JSON.parse(await readFile('capture/manifest.json', 'utf8'))
for (const output of ['seedypod-overview.mp4', 'seedypod-overview.png']) {
  const bytes = await readFile(`${dir}/${output}`)
  let dimensions
  if (output.endsWith('.png')) {
    const m = await sharp(bytes).metadata()
    dimensions = { width: m.width, height: m.height }
  } else {
    const p = probe(`${dir}/${output}`)
    const v = p.streams.find((s) => s.codec_type === 'video')
    dimensions = { width: v.width, height: v.height, durationSeconds: Number(p.format.duration) }
  }
  const asset = {
    repository: 'seedypod/core',
    commit: meta.sourceCommit,
    source: 'web demo build (VITE_DEMO=1), overview tour',
    output,
    method:
      'scripts/capture-overview.mjs + scripts/render-overview.mjs; ' +
      meta.method +
      '; original chapter typography and the repository seedypod logo around unchanged UI recordings',
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.length,
    ...dimensions,
  }
  const i = manifest.assets.findIndex((a) => a.output === output)
  if (i < 0) manifest.assets.push(asset)
  else manifest.assets[i] = asset
  await writeFile('public/media/' + output, bytes)
}
await writeFile('capture/manifest.json', JSON.stringify(manifest, null, 2) + '\n')
await writeFile(
  'capture/overview.json',
  JSON.stringify(
    {
      sourceCommit: meta.sourceCommit,
      capturedTime: meta.capturedTime,
      method: meta.method,
      clips: meta.clips.map(({ file, ...c }) => c),
      chapters: chapters.map(({ scene, kicker }) => ({ scene, kicker })),
      timeline,
      durationSeconds: at,
    },
    null,
    2,
  ) + '\n',
)
console.log('rendered overview', at, 'seconds')
