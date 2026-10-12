import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Nav } from '@/components/nav'
import { Footer } from '@/components/footer'

/**
 * Owns scroll behaviour for every navigation.
 *
 * A hash deep link (`/#skills`) must land on the section the hash names, so the
 * hash is routed through the element itself. Sections may mount after this
 * effect (a deferred/lazy section), so a missing target is retried on the next
 * frame before falling back to the top of the page — never the other way round,
 * or the fallback would fight the anchor (the "hash navigation broken on first
 * load" trap).
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'auto' })
      return
    }

    const id = decodeURIComponent(hash.slice(1))
    const scrollToAnchor = () => {
      const target = document.getElementById(id)
      if (!target || typeof target.scrollIntoView !== 'function') return false
      target.scrollIntoView({ block: 'start' })
      return true
    }

    if (scrollToAnchor()) return

    const raf =
      typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame(() => {
            if (!scrollToAnchor()) window.scrollTo({ top: 0, behavior: 'auto' })
          })
        : 0

    return () => {
      if (raf && typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(raf)
    }
  }, [pathname, hash])

  return null
}

export function Layout() {
  const mainRef = useRef<HTMLElement>(null)

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary-700 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Nav />
      <main ref={mainRef} id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
