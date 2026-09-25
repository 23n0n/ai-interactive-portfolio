import { Printer } from 'lucide-react'
import { Link } from 'react-router-dom'
import { person, experiences, skillGroups, collections, cv } from '@/data/content'

export function CvPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <nav aria-label="Breadcrumb" className="text-sm text-ink-soft">
          <Link to="/" className="hover:text-primary-700">Home</Link>
          <span aria-hidden> / </span>
          <span className="text-ink">CV</span>
        </nav>
        <button
          onClick={() => window.print()}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary-700 px-5 text-sm font-semibold text-white hover:bg-primary-800 cursor-pointer"
        >
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>

      <article className="rounded-3xl border border-primary-100 bg-white p-8 sm:p-10 print:rounded-none print:border-0 print:p-0">
        {/* Header */}
        <header className="border-b border-primary-100 pb-6 print:border-ink">
          <h1 className="font-display text-4xl font-semibold text-ink">{person.fullName}</h1>
          <p className="mt-1 font-mono text-primary-700">{cv.headline}</p>
          <p className="mt-3 text-ink-soft">{cv.summary}</p>
          <p className="mt-3 text-sm text-ink-soft">
            {person.location} · {person.email}
          </p>
        </header>

        {/* Skills */}
        <section className="mt-6">
          <h2 className="font-display text-xl font-semibold text-ink">Skills</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {skillGroups.map((g) => (
              <div key={g.label}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-primary-700">{g.title}</h3>
                <ul className="mt-2 list-disc pl-5 text-ink">
                  {g.skills.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Experience */}
        <section className="mt-6">
          <h2 className="font-display text-xl font-semibold text-ink">Experience</h2>
          <div className="mt-3 space-y-4">
            {experiences.map((e) => (
              <div key={e.role} className="break-inside-avoid">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-ink">{e.role}</h3>
                  <span className="text-sm font-medium text-primary-700">{e.period}</span>
                </div>
                <p className="text-sm text-ink-soft">{e.company} · {e.summary}</p>
                <ul className="mt-1.5 list-disc pl-5 text-ink-soft">
                  {e.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Certifications */}
        <section className="mt-6">
          <h2 className="font-display text-xl font-semibold text-ink">Certifications</h2>
          <ul className="mt-2 list-disc pl-5 text-ink-soft">
            {cv.certifications.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>

        {/* Education */}
        <section className="mt-6">
          <h2 className="font-display text-xl font-semibold text-ink">Education</h2>
          <div className="mt-2 space-y-2">
            {cv.education.map((ed) => (
              <div key={ed.degree} className="flex flex-wrap justify-between gap-2">
                <span className="font-medium text-ink">{ed.degree} — {ed.school}</span>
                <span className="text-sm text-ink-soft">{ed.period}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Offerings */}
        <section className="mt-6">
          <h2 className="font-display text-xl font-semibold text-ink">What I offer</h2>
          <ul className="mt-2 list-disc pl-5 text-ink-soft">
            {collections
              .find((c) => c.slug === 'services')
              ?.docs.map((d) => (
                <li key={d.slug}>{d.title}</li>
              ))}
          </ul>
        </section>

        <footer className="mt-8 border-t border-primary-100 pt-4 text-xs text-ink-soft print:border-ink">
          <strong>Placeholder:</strong> {cv.notes} Identity is the demo persona {person.fullName}.
        </footer>
      </article>
    </div>
  )
}
