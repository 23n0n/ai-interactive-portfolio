import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { router } from '@/router'

function renderAt(path: string) {
  const mem = createMemoryRouter(router.routes, { initialEntries: [path] })
  return render(<RouterProvider router={mem} />)
}

describe('demo-portfolio routes render', () => {
  it('renders the home hero headline', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: /Hi, I'?m Zygfryd/i })).toBeInTheDocument()
  })

  it('home links to Services, Technologies, CV and Ask AI', () => {
    renderAt('/')
    // Services/Technologies appear in both nav and the collections preview
    expect(screen.getAllByRole('link', { name: /Services/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /Technologies/i }).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /View CV/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Ask AI about me/i }).length).toBeGreaterThan(0)
  })

  it('renders the Services hub', () => {
    renderAt('/services')
    expect(screen.getByRole('heading', { name: /Services/i })).toBeInTheDocument()
    expect(screen.getByText(/AI Chatbot Embedding/i)).toBeInTheDocument()
  })

  it('renders a service document with its title', () => {
    renderAt('/services/ai-chatbot-embedding')
    expect(screen.getByRole('heading', { name: /Friendly AI Chatbot Embedding/i })).toBeInTheDocument()
  })

  it('renders the Technologies hub', () => {
    renderAt('/technologies')
    expect(screen.getByRole('heading', { name: /Technologies/i })).toBeInTheDocument()
  })

  it('renders a technology document', () => {
    renderAt('/technologies/supabase')
    expect(screen.getByRole('heading', { name: /Supabase/i })).toBeInTheDocument()
  })

  it('renders the contact page with the AI chat', () => {
    renderAt('/contact')
    expect(screen.getByText(/Talk to me/i)).toBeInTheDocument()
    expect(screen.getByText(/friendly demo assistant/i)).toBeInTheDocument()
  })

  it('renders the CV page (English)', () => {
    renderAt('/cv')
    expect(screen.getByRole('heading', { name: /Niewiadomski-Nieśmiałek/i })).toBeInTheDocument()
    expect(screen.getByText(/Experience/i)).toBeInTheDocument()
  })

  it('shows a 404 for unknown routes', () => {
    // A deep unknown path avoids the single-segment :collectionSlug catch-all
    renderAt('/some/deep/unknown/path')
    expect(screen.getByText(/404/)).toBeInTheDocument()
  })

  it('allows asking the dummy AI about skills', async () => {
    const user = (await import('@testing-library/user-event')).default
    renderAt('/contact')
    const input = screen.getByLabelText(/Chat message/i)
    await user.type(input, 'what are his skills')
    await user.click(screen.getByRole('button', { name: /Send/i }))
    // canned answer appears after the simulated latency
    expect(await screen.findByText(/TypeScript, React, Node.js/i)).toBeInTheDocument()
  })
})
