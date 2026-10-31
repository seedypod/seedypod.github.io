import { BrandLogo } from '../../components/BrandLogo'
import { LinkArrow } from '../../components/LinkArrow'
import { Banner } from 'nextra/components'
import { Layout, Navbar, Footer } from 'nextra-theme-docs'
import { getPageMap } from 'nextra/page-map'
export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout
      banner={
        <Banner storageKey="seedypod-pre-hardware" dismissible={false}>
          Pre-hardware: nothing has run on a real Gardyn yet, and the pin map is unverified.
        </Banner>
      }
      navbar={
        <Navbar
          logo={
            <span className="wordmark">
              <BrandLogo />
              seedypod<span className="docs-label"> / docs</span>
            </span>
          }
          projectLink="https://github.com/seedypod"
        />
      }
      footer={
        <Footer>
          <span>
            seedypod · Truly own your Gardyn.{' '}
            <a href="/">
              Back to home <LinkArrow />
            </a>
          </span>
        </Footer>
      }
      pageMap={await getPageMap()}
      docsRepositoryBase="https://github.com/seedypod/seedypod.github.io/tree/main"
      feedback={{
        content: 'Found an issue?',
        link: 'https://github.com/seedypod/seedypod.github.io/issues',
      }}
      nextThemes={{ defaultTheme: 'dark' }}
    >
      {children}
    </Layout>
  )
}
