const logo = (tone: 'light' | 'dark') => (
  <img
    className={`brand-logo-${tone}`}
    src={`/brand/${tone}/horizontal-340.png`}
    alt="seedypod"
    width="340"
    height="120"
  />
)

// By default both variants render and app/global.css shows the one matching Nextra's
// theme (`dark` on <html>). The home page is always dark with no theme switch, so it
// passes tone="dark".
export function BrandLogo({ tone }: { tone?: 'dark' }) {
  return (
    <span className="brand-logo">
      {tone === 'dark' ? (
        <img src="/brand/dark/horizontal-340.png" alt="seedypod" width="340" height="120" />
      ) : (
        <>
          {logo('light')}
          {logo('dark')}
        </>
      )}
    </span>
  )
}
