import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { person } from '@/data/content'
import { cn } from '@/lib/cn'

const links = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/technologies', label: 'Technologies' },
  { to: '/cv', label: 'CV' },
  { to: '/contact', label: 'Ask AI' },
]

export function Nav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-primary-100 bg-cream/85 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-600 font-mono text-xs font-bold text-white">
            {person.initials}
          </span>
          <span className="hidden sm:inline">{person.fullName}</span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary-100 text-primary-800' : 'text-ink-soft hover:bg-primary-50 hover:text-ink',
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        {/* Mobile toggle */}
        <button
          className="rounded-lg p-2 text-ink hover:bg-primary-50 md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile panel */}
      {open && (
        <div className="border-t border-primary-100 bg-cream px-4 py-3 md:hidden">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'block rounded-lg px-3 py-2 text-sm font-medium',
                  isActive ? 'bg-primary-100 text-primary-800' : 'text-ink-soft hover:bg-primary-50',
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  )
}
