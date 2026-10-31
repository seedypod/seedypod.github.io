import { BrandLogo } from '../components/BrandLogo'
import { GitHubIcon } from 'nextra/icons'
import Link from 'next/link'
import { LinkArrow } from '../components/LinkArrow'
import { BrowserFrame } from '../components/media'
export default function Home() {
  return (
    <div className="home">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="home-nav">
        <Link className="wordmark" href="/">
          <BrandLogo />
          seedypod
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/getting-started/">Documentation</Link>
          <a href="https://seedypod.vercel.app">Live demo</a>
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
              Truly own
              <br />
              <em>your Gardyn.</em>
            </h1>
            <p className="hero-description">
              A Gardyn is a good piece of hardware with a Raspberry Pi inside and a cloud account in
              front of it. seedypod replaces the cloud with software that runs on that Pi: lights,
              watering, sensors, cameras and grow reminders, all on your own network.
            </p>
            <div className="actions">
              <Link className="button primary" href="/getting-started/">
                Get started <LinkArrow />
              </Link>
              <a className="button secondary" href="https://seedypod.vercel.app">
                Try the live demo <LinkArrow direction="external" />
              </a>
            </div>
            <p className="hero-note">Open source · AGPL-3.0 · Sibling of sleepypod</p>
          </div>
          <div className="hero-media">
            <BrowserFrame
              src="/media/core-dashboard.png"
              alt="seedypod web UI home screen with grow light, water and environment readings"
              caption="The real seedypod web UI, running against the simulated tower."
            />
          </div>
        </section>
        <p className="status-banner" role="note">
          <strong>Pre-hardware.</strong> The software is built and tested against a simulator, but
          nothing has run on a real Gardyn yet. The pin map comes from upstream research and is
          unverified. Back up your stock microSD card before you try anything.{' '}
          <Link href="/about/#project-status">Read the project status</Link>.
        </p>
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
              alt="Grow light screen with a brightness slider and a daily light curve"
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
            <p>Both run on the Pi already inside your Gardyn, or core can live on any LAN box.</p>
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
                hald publishes MQTT discovery, so Home Assistant sees the light, pump and sensors
                with nothing else installed. Core adds grow reminders and a water-now button.
              </p>
              <span className="card-link">Connect Home Assistant</span>
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
          <BrandLogo />
          seedypod
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
          <Link href="/core/privacy/">Privacy</Link>
        </nav>
      </footer>
    </div>
  )
}
