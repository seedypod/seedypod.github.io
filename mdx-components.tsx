import { slug } from 'github-slugger'
import { isValidElement, type ComponentProps, type ReactNode } from 'react'
import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'
import { BrowserFrame, Demo, PhoneFrame } from './components/media'
import { OpenApiReference } from './components/OpenApiReference'

const textOf = (node: ReactNode): string =>
  typeof node === 'string' || typeof node === 'number'
    ? String(node)
    : Array.isArray(node)
      ? node.map(textOf).join('')
      : isValidElement<{ children?: ReactNode }>(node)
        ? textOf(node.props.children)
        : ''

export function useMDXComponents(components = {}) {
  const docs = getDocsMDXComponents({
    BrowserFrame,
    Demo,
    PhoneFrame,
    OpenApiReference,
    ...components,
  })
  const H1 = docs.h1!
  return {
    ...docs,
    // Nextra gives h1 no id, but GitHub anchors it, and core cites a note's title
    // section with GitHub's slug (#gardyn-feeding-guidance), so keep that target.
    h1: ({ children, ...props }: ComponentProps<'h1'>) => (
      <H1 {...props}>
        <span id={slug(textOf(children))} />
        {children}
      </H1>
    ),
  }
}
