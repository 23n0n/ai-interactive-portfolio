import { Mail, Code, Globe } from 'lucide-react'
import { AiChat } from '@/components/ai-chat'
import { person } from '@/data/content'

export function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl font-semibold text-ink">Talk to me (or my demo AI)</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-soft">
        Prefer a robot? Ask the assistant below. Prefer a human? Email or find me on social —
        both point at placeholders in this demo.
      </p>

      <div className="mt-10">
        <AiChat />
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <a href={`mailto:${person.email}`} className="flex items-center gap-3 rounded-2xl border border-primary-100 bg-white p-5 hover:border-primary-300 hover:bg-primary-50/50">
          <Mail className="h-5 w-5 text-primary-700" />
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-soft">Email</p>
            <p className="text-sm font-medium text-ink">{person.email}</p>
          </div>
        </a>
        <a href={person.socials.github} className="flex items-center gap-3 rounded-2xl border border-primary-100 bg-white p-5 hover:border-primary-300 hover:bg-primary-50/50">
          <Code className="h-5 w-5 text-primary-700" />
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-soft">GitHub</p>
            <p className="text-sm font-medium text-ink">placeholder</p>
          </div>
        </a>
        <a href={person.socials.linkedin} className="flex items-center gap-3 rounded-2xl border border-primary-100 bg-white p-5 hover:border-primary-300 hover:bg-primary-50/50">
          <Globe className="h-5 w-5 text-primary-700" />
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-soft">LinkedIn</p>
            <p className="text-sm font-medium text-ink">placeholder</p>
          </div>
        </a>
      </div>

      <div className="mt-10 rounded-2xl border border-amber-acc/40 bg-amber-50 p-5 text-sm text-ink">
        <strong>Placeholder notice:</strong> {person.fullName} is a fictional persona used to demo the
        interactive-portfolio skill. Email, socials and testimonials are placeholders to be replaced before
        a real launch.
      </div>
    </div>
  )
}
