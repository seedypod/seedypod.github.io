import { ImageZoom } from 'nextra/components'
type MediaProps = { src: string; alt: string; caption?: string }
export function BrowserFrame({
  src,
  alt,
  caption,
  address = 'seedypod.local:3000',
}: MediaProps & { address?: string }) {
  return (
    <figure className="browser-frame">
      <div className="browser-bar" aria-hidden="true">
        <span>← → ↻</span>
        <span>{address}</span>
        <span>•••</span>
      </div>
      <ImageZoom src={src} alt={alt} width={1440} height={1000} loading="lazy" />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}
export function Demo({
  src,
  poster,
  title,
  wide = false,
  children,
}: {
  src: string
  poster: string
  title: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <figure className={wide ? 'demo demo-wide' : 'demo'}>
      <video controls playsInline preload="metadata" poster={poster} aria-label={title}>
        <source src={src} type="video/mp4" />
      </video>
      <figcaption>
        <strong>{title}</strong> — {children}
      </figcaption>
    </figure>
  )
}
