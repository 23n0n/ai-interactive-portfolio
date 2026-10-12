import '@testing-library/jest-dom/vitest'

// jsdom lacks these browser APIs our components use.
// Guard against "prefers-reduced-motion" and lazy/perception observers.

class MockIntersectionObserver {
  readonly root: Element | null = null
  readonly rootMargin = ''
  readonly thresholds: number[] = [0]
  private cb: IntersectionObserverCallback

  constructor(cb: IntersectionObserverCallback) {
    this.cb = cb
  }

  observe(el: Element): void {
    // Report as intersecting immediately so reveal/typewriter start.
    this.cb(
      [{ isIntersecting: true, target: el } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    )
  }
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

const g = globalThis as unknown as { IntersectionObserver?: typeof IntersectionObserver }
g.IntersectionObserver =
  g.IntersectionObserver ?? (MockIntersectionObserver as unknown as typeof IntersectionObserver)

// jsdom has no matchMedia
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

// window.print not implemented in jsdom
if (typeof window !== 'undefined') {
  window.print = () => {}
  window.scrollTo = () => {}
}
