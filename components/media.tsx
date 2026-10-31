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
