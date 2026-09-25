import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Mock } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { router } from '@/router'

function renderAt(path: string) {
  const mem = createMemoryRouter(router.routes, { initialEntries: [path] })
  return render(<RouterProvider router={mem} />)
}

/**
 * The home page advertises section anchors (`#skills`, `#experience`, `#catalog`,
 * `#testimonials`) and the layout owns the scroll behaviour, so a deep link such as
 * `/#skills` must land on that section — not be overridden by the layout's
 * scroll-to-top. Regression guard for the "hash navigation broken on first load"
 * trap the build procedure warns about.
 */
describe('hash deep links land on the advertised section', () => {
  let scrollTo: Mock
  let scrollIntoView: Mock

  beforeEach(() => {
    scrollTo = vi.fn()
    scrollIntoView = vi.fn()
    vi.stubGlobal('scrollTo', scrollTo)
    Element.prototype.scrollIntoView = scrollIntoView as unknown as () => void
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('scrolls the section named in the hash into view instead of jumping to the top', () => {
    renderAt('/#skills')

    const skills = document.getElementById('skills')
    expect(skills).not.toBeNull()
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView.mock.instances[0]).toBe(skills)
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('scrolls to the top on a route without a hash', () => {
    renderAt('/services')

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('falls back to the top when the hash has no target on the page', async () => {
    renderAt('/#not-a-section')

    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' }))
    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})
