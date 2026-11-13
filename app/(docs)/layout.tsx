import { BrandLogo } from '../../components/BrandLogo'
import { LinkArrow } from '../../components/LinkArrow'
import { Layout, Navbar, Footer } from 'nextra-theme-docs'
import { getPageMap } from 'nextra/page-map'
export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout
      navbar={
        <Navbar
          logo={
            <span className="wordmark">
              <BrandLogo />
              <span className="docs-label">/ docs</span>
            </span>
          }
          projectLink="https://github.com/seedypod"
          chatLink="https://discord.gg/UMmv5R6MXa"
        />
      }
      footer={
        <Footer>
          <span>
            seedypod · Your garden, your rules.{' '}
            <a href="/">
              Back to home <LinkArrow />
            </a>
            {' · '}
            <a href="https://sleepypod.github.io/">
              Sibling project: sleepypod <LinkArrow direction="external" />
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
