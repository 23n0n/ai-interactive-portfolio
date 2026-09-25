import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { person, collections, skillGroups, experiences, testimonials } from '@/data/content'
import { Typewriter } from '@/components/typewriter'
import { LinkButton } from '@/components/ui/link-button'
import { Reveal } from '@/components/reveal'

export function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* HERO */}
      <section className="grid items-center gap-10 py-20 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-800">
            <Sparkles className="h-3.5 w-3.5" /> Available for freelance &amp; consulting (placeholder)
          </p>
          <h1 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl lg:text-6xl">
            Hi, I&apos;m {person.firstName}. I build warm software and chatty little AIs.
          </h1>
          <p className="mt-6 min-h-[2.5rem] font-mono text-lg text-primary-700 sm:text-xl">
            <Typewriter text={person.role} />
          </p>
          <p className="mt-4 max-w-xl text-lg text-ink-soft">{person.about}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton to="/contact" variant="ai" size="lg">
              Ask AI about me <ArrowRight className="h-4 w-4" />
            </LinkButton>
            <LinkButton to="/services" variant="outline" size="lg">
              See what I do
            </LinkButton>
            <LinkButton to="/cv" variant="cream" size="lg">
              View CV
            </LinkButton>
          </div>
          <p className="mt-6 text-sm italic text-ink-soft">{person.tagline}</p>
        </div>

        {/* Portrait placeholder / illustration */}
        <div className="hidden justify-center md:flex" aria-hidden>
          <div className="relative">
            <div className="h-72 w-64 rounded-3xl bg-gradient-to-br from-primary-300 via-primary-400 to-primary-600 p-1 shadow-xl">
              <div className="grid h-full w-full place-items-center rounded-[1.35rem] bg-white">
                <span className="font-display text-6xl text-primary-700">{person.initials}</span>
              </div>
            </div>
            <span className="absolute -right-3 -top-3 rounded-full bg-ai-400 px-3 py-1 text-xs font-bold text-white shadow">
              AI-powered
            </span>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <Reveal>
        <section className="rounded-3xl border border-primary-100 bg-white p-8 sm:p-10">
          <h2 className="font-display text-3xl font-semibold text-ink">A little about me</h2>
          <p className="mt-4 max-w-3xl text-lg text-ink-soft">{person.about}</p>
          <p className="mt-3 max-w-3xl text-lg text-ink-soft">{person.tagline}</p>
        </section>
      </Reveal>

      {/* SKILLS */}
      <Reveal>
        <section className="py-16" aria-labelledby="skills">
          <div className="flex items-center justify-between">
            <h2 id="skills" className="font-display text-3xl font-semibold text-ink">
              Skills — the honest version
            </h2>
            <Link to="/technologies" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:text-primary-800">
              Technologies <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {skillGroups.map((g) => (
              <div key={g.label} className="rounded-2xl border border-primary-100 bg-white p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-primary-700">{g.title}</h3>
                <ul className="mt-4 space-y-2 text-ink">
                  {g.skills.map((s) => (
                    <li key={s} className="flex items-start gap-2">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-400" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* EXPERIENCE */}
      <Reveal>
        <section className="py-4" aria-labelledby="experience">
          <h2 id="experience" className="font-display text-3xl font-semibold text-ink">Experience</h2>
          <div className="mt-8 space-y-4">
            {experiences.map((e) => (
              <article key={e.role} className="rounded-2xl border border-primary-100 bg-white p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-lg font-semibold text-ink">{e.role}</h3>
                  <span className="text-sm font-medium text-primary-700">{e.period}</span>
                </div>
                <p className="text-sm font-medium text-ink-soft">{e.company}</p>
                <p className="mt-2 text-ink-soft">{e.summary}</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-soft">
                  {e.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </Reveal>

      {/* COLLECTIONS PREVIEW */}
      <Reveal>
        <section className="py-16" aria-labelledby="catalog">
          <h2 id="catalog" className="font-display text-3xl font-semibold text-ink">Collections</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {collections.map((c) => (
              <Link key={c.slug} to={`/${c.slug}`} className="group rounded-2xl border border-primary-100 bg-white p-6 transition-colors hover:border-primary-300 hover:bg-primary-50/50">
                <h3 className="font-display text-xl font-semibold text-primary-800 group-hover:text-primary-900">
                  {c.title}
                </h3>
                <p className="mt-2 text-ink-soft">{c.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-700">
                  {c.docs.length} {c.docs.length === 1 ? 'item' : 'items'} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      </Reveal>

      {/* TESTIMONIALS */}
      <Reveal>
        <section className="pb-16" aria-labelledby="testimonials">
          <h2 id="testimonials" className="font-display text-3xl font-semibold text-ink">Testimonials</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.name} className="rounded-2xl border border-primary-100 bg-white p-6">
                <blockquote className="text-ink-soft">“{t.quote}”</blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-semibold text-ink">{t.name}</span>
                  <span className="block text-ink-soft">{t.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      </Reveal>
    </div>
  )
}
