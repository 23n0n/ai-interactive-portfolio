import { Link } from 'react-router-dom'
import { Code, Globe, Mail } from 'lucide-react'
import { person, collections } from '@/data/content'

export function Footer() {
  return (
    <footer className="border-t border-primary-100 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-lg font-semibold text-ink">{person.fullName}</p>
          <p className="mt-2 max-w-xs text-sm text-ink-soft">{person.brand}</p>
          <div className="mt-4 flex gap-2">
            <a href={person.socials.github} aria-label="Code (placeholder for GitHub)" className="rounded-lg p-2 text-ink-soft hover:bg-primary-50 hover:text-primary-700">
              <Code className="h-5 w-5" />
            </a>
            <a href={person.socials.linkedin} aria-label="Social (placeholder for LinkedIn)" className="rounded-lg p-2 text-ink-soft hover:bg-primary-50 hover:text-primary-700">
              <Globe className="h-5 w-5" />
            </a>
            <a href={`mailto:${person.email}`} aria-label="Email" className="rounded-lg p-2 text-ink-soft hover:bg-primary-50 hover:text-primary-700">
              <Mail className="h-5 w-5" />
            </a>
          </div>
        </div>

        <nav aria-label="Footer">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Explore</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="text-ink-soft hover:text-primary-700" to="/">Home</Link></li>
            <li><Link className="text-ink-soft hover:text-primary-700" to="/cv">CV</Link></li>
            <li><Link className="text-ink-soft hover:text-primary-700" to="/contact">Ask AI about me</Link></li>
            {collections.map((c) => (
              <li key={c.slug}>
                <Link className="text-ink-soft hover:text-primary-700" to={`/${c.slug}`}>
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Fine print</p>
          <p className="mt-3 text-xs leading-relaxed text-ink-soft">
            This is an interactive-portfolio <strong>demo</strong> using placeholder data
            (identity, testimonials, roles are fictional). All content is for
            demonstration. No real email or phone is shown here.
          </p>
        </div>
      </div>
      <div className="border-t border-primary-100 py-4 text-center text-xs text-ink-soft">
        © {new Date().getFullYear()} {person.fullName}. Built with the interactive-portfolio skill.
      </div>
    </footer>
  )
}
