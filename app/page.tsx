import { BrandLogo } from '../components/BrandLogo'
import { DiscordIcon, GitHubIcon } from 'nextra/icons'
import Link from 'next/link'
import { LinkArrow } from '../components/LinkArrow'
import { BrowserFrame, Demo } from '../components/media'
export default function Home() {
  return (
    <div className="home">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="home-nav">
        <Link className="wordmark" href="/">
          <BrandLogo tone="dark" />
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/getting-started/">Documentation</Link>
          <a href="https://seedypod.vercel.app">Live demo</a>
          <a className="github-link" href="https://discord.gg/UMmv5R6MXa" aria-label="Discord">
            <DiscordIcon aria-hidden="true" focusable="false" />
            <span className="link-label">Discord</span>
          </a>
          <a className="github-link" href="https://github.com/seedypod" aria-label="GitHub">
            <GitHubIcon aria-hidden="true" focusable="false" />
            <span className="link-label">GitHub</span>
          </a>
        </nav>
      </header>
      <main id="main" data-pagefind-body>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span /> LOCAL CONTROL. NO SUBSCRIPTION.
            </p>
            <h1>
              Your garden,
              <br />
              <em>your rules.</em>
            </h1>
            <p className="hero-description">
              A Gardyn is a good tower with a Raspberry Pi inside and a cloud account in front of
              it. seedypod replaces the cloud with software on that Pi: light, water, sensors and
              cameras on your own network, Autopilot and camera growth analysis, an MCP server so AI
              agents can plan your pods, and HomeKit and Home Assistant built in.
            </p>
            <div className="actions">
              <Link className="button primary" href="/getting-started/">
                Get started <LinkArrow />
              </Link>
              <a className="button secondary" href="https://seedypod.vercel.app">
                Try the live demo <LinkArrow direction="external" />
              </a>
            </div>
            <p className="hero-note">
              Open source · AGPL-3.0 · Sibling of{' '}
              <a href="https://sleepypod.github.io/">sleepypod</a>
            </p>
          </div>
          <div className="hero-media">
            <BrowserFrame
              src="/media/core-home.webp"
              alt="seedypod web UI home screen: the tower in 3D under its lit grow light, on day 19 of a grow with 19 pods ready to harvest"
              caption="The seedypod web UI with the demo's simulated tower. The same software runs on a real Gardyn 3.0."
            />
          </div>
        </section>
        <section className="web-showcase" aria-labelledby="tour-heading">
          <div className="section-heading">
            <p className="eyebrow">A ONE-MINUTE TOUR.</p>
            <h2 id="tour-heading">Meet your tower.</h2>
            <p>
              Turn the tower in 3D, see Gardyn&apos;s light zones, scrub a plant from seedling to
              harvest, and check the whole system at a glance, all in the real web UI.
            </p>
            <Link className="text-link" href="/core/web-ui/">
              Tour the web UI screen by screen <LinkArrow />
            </Link>
          </div>
          <Demo
            src="/media/seedypod-overview.mp4"
            poster="/media/seedypod-overview.png"
            title="Your garden, your rules."
            wide
          >
            A silent tour of the seedypod web UI, recorded from the demo build against a simulated
            tower.
          </Demo>
        </section>
        <section className="web-showcase" aria-labelledby="web-heading">
          <div className="section-heading">
            <p className="eyebrow">IN YOUR BROWSER. ON YOUR NETWORK.</p>
            <h2 id="web-heading">Your whole tower, in view.</h2>
            <p>
              Dim the grow light on a curve, run a bounded watering cycle, track all 30 pods through
              a grow cycle, and scrub through camera timelapses. No account required.
            </p>
            <div className="showcase-links">
              <a className="text-link" href="https://seedypod.vercel.app">
                Try the live demo <LinkArrow direction="external" />
              </a>
              <Link className="text-link" href="/core/web-ui/">
                Tour the web UI <LinkArrow />
              </Link>
            </div>
          </div>
          <div className="screen-grid">
            <BrowserFrame
              src="/media/core-light.png"
              alt="Grow light screen with a stepped Auto, Off, 25, 50, 75 and 100 slider and a daily light curve"
              caption="Light curves ramp brightness between setpoints."
            />
            <BrowserFrame
              src="/media/core-grow.png"
              alt="Grow screen on day 19 of a cycle with a 30-pod grid"
              caption="Thirty pods, one grow cycle, timed reminders."
            />
          </div>
        </section>
        <div className="principles">
          <div>
            <span>01 / LOCAL</span>
            <p>No account. No telemetry.</p>
          </div>
          <div>
            <span>02 / SAFE</span>
            <p>Every pump run is bounded.</p>
          </div>
          <div>
            <span>03 / OPEN</span>
            <p>REST, MCP and MQTT.</p>
          </div>
        </div>
        <section id="ecosystem" className="ecosystem">
          <div className="section-heading">
            <p className="eyebrow">TWO TIERS, ONE CONTRACT</p>
            <h2>A daemon for the hardware. A core for everything else.</h2>
            <p>
              Both run on the Pi already inside your Gardyn, or core can live on any LAN box. Use
              them from a browser, Home Assistant or the iPhone app.
            </p>
          </div>
          <div className="product-grid">
            <Link className="product-card" href="/developers/hal/">
              <span className="card-number">01 — THE HARDWARE</span>
              <h3>
                hald <LinkArrow />
              </h3>
              <p>
                A small Rust daemon that owns the pins and buses. Every pump command passes a safety
                guard: bounded runs, dry-run interlock, over-temperature cutoff, latched faults.
              </p>
              <span className="card-link">Read the HAL reference</span>
            </Link>
            <Link className="product-card" href="/core/">
              <span className="card-number">02 — THE BRAINS</span>
              <h3>
                seedypod core <LinkArrow />
              </h3>
              <p>
                Hono, tRPC and SQLite. Schedules, grow cycles, alerts, camera captures, and the
                React web UI, with an OpenAPI REST facade and an MCP endpoint.
              </p>
              <span className="card-link">Open the user guide</span>
            </Link>
            <Link className="product-card" href="/core/home-assistant/">
              <span className="card-number">03 — YOUR HOME</span>
              <h3>
                Home Assistant <LinkArrow />
              </h3>
              <p>
                hald publishes MQTT discovery, so Home Assistant sees the light, pump, sensors and
                tank level with nothing else installed. Core adds grow reminders, a water-now button
                and both cameras as snapshots.
              </p>
              <span className="card-link">Connect Home Assistant</span>
            </Link>
            <Link className="product-card" href="/ios/">
              <span className="card-number">04 — YOUR POCKET</span>
              <h3>
                iPhone app <LinkArrow />
              </h3>
              <p>
                Your tower in 3D on your phone. Tap a pod to harvest or plant it, set the light, run
                a bounded watering, and clear alerts. Finds your unit with Bonjour; no account.
              </p>
              <span className="card-link">Get the iPhone app</span>
            </Link>
            <Link className="product-card" href="/core/mcp/#plan-from-an-order">
              <span className="card-number">05 — YOUR AGENT</span>
              <h3>
                Autopilot and AI agents <LinkArrow />
              </h3>
              <p>
                Autopilot rules act on live readings, and the cameras score each pod&apos;s leaf
                cover. Over MCP an agent can plan your pods, turning a pasted seed order into a
                layout.
              </p>
              <pre className="card-snippet" aria-label="An example prompt">
                {`use the seedypod mcp to plan
Order summary:
1 x Basil
1 x Italian Parsley
1 x Chives
1 x Catnip
…`}
              </pre>
              <span className="card-link">See it plan a real order</span>
            </Link>
            <Link className="product-card" href="/core/homekit/">
              <span className="card-number">06 — APPLE HOME</span>
              <h3>
                HomeKit <LinkArrow />
              </h3>
              <p>
                Add the tower to the Home app: the light, a bounded watering, air temperature and
                humidity, a tank-low sensor, and both cameras as snapshots. No bridge to install.
              </p>
              <span className="card-link">Pair it with Home</span>
            </Link>
          </div>
          <div className="build-invitation">
            <div>
              <p className="eyebrow">BUILD ON IT</p>
              <h3>Your agent, your dashboard, your script.</h3>
              <p>
                Every capability is a tRPC procedure first, then generated as REST and exposed as
                MCP tools with declared limits. The safety guard applies no matter which door you
                come in through.
              </p>
            </div>
            <div className="integration-links">
              <Link href="/developers/api/">
                REST API reference <LinkArrow />
              </Link>
              <Link href="/core/mcp/">
                MCP for agents <LinkArrow />
              </Link>
              <Link href="/developers/hal-contract/">
                HAL contract <LinkArrow />
              </Link>
              <Link href="/developers/architecture/">
                Architecture <LinkArrow />
              </Link>
            </div>
          </div>
        </section>
        <section className="start-section">
          <p className="eyebrow">YOUR NEXT HARVEST STARTS HERE</p>
          <h2>Bring your tower home.</h2>
          <p>Try the demo, then follow the install guide when you are ready to open the base.</p>
          <Link className="button primary" href="/getting-started/">
            Get started <LinkArrow />
          </Link>
          <div className="quick-links">
            <a href="https://seedypod.vercel.app">Live demo</a>
            <Link href="/core/debugging/">Debugging</Link>
            <Link href="/developers/">Developer reference</Link>
            <Link href="/about/">About the project</Link>
          </div>
        </section>
      </main>
      <footer className="home-footer">
        <Link className="wordmark" href="/">
          <BrandLogo tone="dark" />
        </Link>
        <p>
          Independent, community-built software for Gardyn hydroponic towers.
          <br />
          Not affiliated with Gardyn.
        </p>
        <nav className="footer-links" aria-label="Community">
          <a href="https://github.com/seedypod">
            Made in the open <LinkArrow direction="external" />
          </a>
          <a href="https://discord.gg/UMmv5R6MXa">
            Chat on Discord <LinkArrow direction="external" />
          </a>
          <a href="https://sleepypod.github.io/">
            Sibling project: sleepypod <LinkArrow direction="external" />
          </a>
          <Link href="/core/privacy/">Privacy</Link>
        </nav>
      </footer>
    </div>
  )
}
