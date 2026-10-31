import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'
import { BrowserFrame } from './components/media'
import { OpenApiReference } from './components/OpenApiReference'
export function useMDXComponents(components = {}) {
  return getDocsMDXComponents({
    BrowserFrame,
    OpenApiReference,
    ...components,
  })
}
