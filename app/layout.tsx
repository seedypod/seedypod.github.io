import type { Metadata } from 'next'
import { Head } from 'nextra/components'
import 'nextra-theme-docs/style.css'
import './global.css'
export const metadata: Metadata = {
  metadataBase: new URL('https://seedypod.github.io'),
  title: { default: 'seedypod — Truly own your Gardyn.', template: '%s — seedypod' },
  description:
    'Local, cloud-free control for Gardyn hydroponic towers: a Rust hardware daemon, a tRPC/REST/MCP server, a web UI, and Home Assistant.',
  openGraph: { siteName: 'seedypod', type: 'website' },
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head color={{ hue: 145, saturation: 52, lightness: { light: 32, dark: 58 } }} />
      <body>{children}</body>
    </html>
  )
}
