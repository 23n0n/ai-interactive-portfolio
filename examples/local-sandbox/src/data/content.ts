// ============================================================
// LOCAL DATA LAYER (demo)
// Deviation from reference stack (Supabase): data lives in TS
// modules behind a typed repository interface so a Supabase
// adapter can replace it later. See adr/ADR-0001.md.
// ============================================================

export type ContentBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'list'; ordered?: boolean; items: string[] }
  | { type: 'callout'; tone: 'info' | 'warn' | 'ai'; title?: string; text: string }
  | { type: 'checklist'; items: string[] }

export interface ContentDoc {
  slug: string
  collection: string
  title: string
  description: string
  intro: string
  tags: string[]
  relatedSlugs?: string[]
  blocks: ContentBlock[]
}

export interface Collection {
  slug: string
  title: string
  description: string
  docs: ContentDoc[]
}

// ---------- Person ----------
export interface ExperienceItem {
  role: string
  company: string
  period: string
  summary: string
  highlights: string[]
}

export interface SkillGroup {
  label: 'strong' | 'moderate' | 'gap'
  title: string
  skills: string[]
}

export interface Testimonial {
  name: string
  role: string
  quote: string
}

export const person = {
  firstName: 'Zygfryd',
  lastName: 'Niewiadomski-Nieśmiałek',
  fullName: 'Zygfryd Niewiadomski-Nieśmiałek',
  initials: 'ZN',
  role: 'Full-Stack Tinkerer & Friendly AI Enthusiast',
  brand:
    'I turn vague ideas into working software and teach AI to introduce me before I do.',
  about:
    'A self-described professional generalist with a soft spot for clean code, warm design and chatbots that do not judge you. I have spent years bridging the gap between "it works on my machine" and "it works for everyone."',
  tagline:
    'Recruiters remember me because I once explained microservices to a grandmother. Clients remember me because the thing shipped.',
  location: 'Warsaw, Poland (placeholder)',
  email: 'hello@placeholder.example',
  socials: {
    github: 'https://github.com/',
    linkedin: 'https://linkedin.com/',
  },
}

export const profileHeadline =
  'Hi, I am Zygfryd — I build warm software and chatty little AIs.'

export const experiences: ExperienceItem[] = [
  {
    role: 'Lead Software Engineer (placeholder)',
    company: 'Somewhere Good',
    period: '2022 — present',
    summary: 'Leading a small team building an internal AI assistant nobody fears.',
    highlights: [
      'Cut onboarding time 40% with an internal knowledge-base chatbot.',
      'Drove the team to 95% test coverage without anyone crying.',
    ],
  },
  {
    role: 'Senior Developer (placeholder)',
    company: 'Another Fine Place',
    period: '2019 — 2022',
    summary: 'Full-stack work across React, TypeScript and a stubborn legacy API.',
    highlights: [
      'Rewrote a painful checkout flow; conversion went up, cursing went down.',
      'Introduced code review habits that outlived me (probably).',
    ],
  },
  {
    role: 'Junior Developer (placeholder)',
    company: 'First Steps Ltd.',
    period: '2017 — 2019',
    summary: 'Where I learned that "it works" and "it is done" are different things.',
    highlights: [
      'Fixed 200+ bugs, most of them my own. Progress.',
      'Built the internal tool everyone actually used.',
    ],
  },
]

export const skillGroups: SkillGroup[] = [
  {
    label: 'strong',
    title: 'Strong',
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Tailwind CSS'],
  },
  {
    label: 'moderate',
    title: 'Moderate',
    skills: ['Python', 'Docker', 'GraphQL', 'Cloudflare Workers', 'Vue'],
  },
  {
    label: 'gap',
    title: 'Honest gaps',
    skills: ['Rust (learning)', 'Kubernetes (respecting from a distance)', 'Figma magic'],
  },
]

export const testimonials: Testimonial[] = [
  {
    name: 'A. Recruiter (placeholder)',
    role: 'Talent Partner',
    quote:
      'Zygfryd explained our stack better in five minutes than some candidates in an hour. Instant yes.',
  },
  {
    name: 'B. Client (placeholder)',
    role: 'Product Owner',
    quote:
      'The chatbot actually sounds like a person. Our users stopped emailing us for basics. Win.',
  },
  {
    name: 'C. Colleague (placeholder)',
    role: 'Engineer',
    quote: 'Code reviews with Zygfryd are the only ones that end with us both laughing.',
  },
]

// ---------- Collections ----------
export const collections: Collection[] = [
  {
    slug: 'services',
    title: 'Services',
    description:
      'The useful things I do for teams and clients — each described honestly, with no surprise fine print.',
    docs: [
      {
        slug: 'ai-chatbot-embedding',
        collection: 'services',
        title: 'Friendly AI Chatbot Embedding',
        description: 'I add a helpful, on-brand chatbot to your site without the robot vibes.',
        intro:
          'A support or "ask me anything" bot that sounds like your brand, not a call center from 2009.',
        tags: ['ai', 'chat', 'react'],
        relatedSlugs: ['fullstack-consulting', 'react-typescript'],
        blocks: [
          { type: 'p', text: 'The internet is full of chatbots that feel like talking to a tax form. I build the other kind.' },
          { type: 'h2', text: 'What you get' },
          {
            type: 'list',
            items: [
              'A chatbot grounded in your real content, not vibes',
              'Clear "I do not know" answers instead of confident nonsense',
              'A design that matches your brand and accessibility needs',
              'Usage analytics so you know it is helping',
            ],
          },
          { type: 'callout', tone: 'ai', title: 'Honest note', text: 'It will not pretend to be human. Humans find that less creepy.' },
          {
            type: 'checklist',
            items: ['Scope & content mapping', 'Design + copy', 'Integration & training', 'Handover docs'],
          },
        ],
      },
      {
        slug: 'react-typescript',
        collection: 'services',
        title: 'React + TypeScript Builds',
        description: 'Modern, typed, testable front-ends that do not rot in six months.',
        intro: 'Interfaces people actually enjoy using, written in a language that keeps bugs out.',
        tags: ['react', 'typescript', 'frontend'],
        relatedSlugs: ['ai-chatbot-embedding', 'fullstack-consulting'],
        blocks: [
          { type: 'p', text: 'I build and rescue React applications with TypeScript, Tailwind and a lot of care for the edges.' },
          { type: 'h2', text: 'Approach' },
          {
            type: 'list',
            items: [
              'Typed data from day one — no surprise "undefined" crashes',
              'Accessible by default, animated only when it helps',
              'Performance budgets we actually measure',
            ],
          },
        ],
      },
      {
        slug: 'fullstack-consulting',
        collection: 'services',
        title: 'Full-Stack Consulting',
        description: 'A friendly second pair of eyes on architecture, security and "why is this slow".',
        intro: 'You have a product and a gnawing feeling something is off. I help find what, and fix it.',
        tags: ['consulting', 'architecture', 'security'],
        relatedSlugs: ['react-typescript', 'ai-chatbot-embedding'],
        blocks: [
          { type: 'p', text: 'Sometimes you need an outsider who is on your side. I review codebases, architecture and roadmaps.' },
          { type: 'h2', text: 'Common wins' },
          {
            type: 'list',
            items: ['Found the real bottleneck (rarely the one you guessed)', 'Harden auth and data access', 'Turn a painful API into a calm one'],
          },
          { type: 'callout', tone: 'warn', title: 'My bias', text: 'I will tell you when something should be simpler. That is the job.' },
        ],
      },
    ],
  },
  {
    slug: 'technologies',
    title: 'Technologies',
    description:
      'Tools I reach for and the honest level of comfort I have with each. No proficiency-bars theater.',
    docs: [
      {
        slug: 'typescript',
        collection: 'technologies',
        title: 'TypeScript',
        description: 'My default language for anything that lives longer than a weekend.',
        intro: 'TypeScript is the seatbelt I stopped noticing — until a codebase without it throws me.',
        tags: ['language', 'frontend', 'backend'],
        relatedSlugs: ['react', 'postgresql'],
        blocks: [
          { type: 'p', text: 'I have written TypeScript daily for years across front-ends, APIs and scripts.' },
          { type: 'h2', text: 'Where I use it' },
          {
            type: 'list',
            items: ['Large React applications', 'Node.js services', 'Shared type packages between teams'],
          },
        ],
      },
      {
        slug: 'react',
        collection: 'technologies',
        title: 'React',
        description: 'Components, hooks and the discipline to keep them boring where it counts.',
        intro: 'React rewards restraint. I bring the restraint, and the components.',
        tags: ['framework', 'frontend'],
        relatedSlugs: ['typescript', 'postgresql'],
        blocks: [
          { type: 'p', text: 'Deep experience with React 18/19, Server Components and ecosystem tooling.' },
        ],
      },
      {
        slug: 'postgresql',
        collection: 'technologies',
        title: 'PostgreSQL',
        description: 'Row-level security, views and data that is treated like the asset it is.',
        intro: 'I care about data safety as much as I care about a pretty UI — more, actually.',
        tags: ['database', 'backend', 'security'],
        relatedSlugs: ['typescript', 'supabase'],
        blocks: [
          { type: 'p', text: 'Schema design, queries, and securing data at the database layer with RLS.' },
        ],
      },
      {
        slug: 'supabase',
        collection: 'technologies',
        title: 'Supabase',
        description: 'Postgres + Auth + Storage that removes the boring parts of building.',
        intro: 'The reference architecture for this very demo is built on a Supabase-shaped mental model.',
        tags: ['backend', 'baas', 'security'],
        relatedSlugs: ['postgresql', 'typescript'],
        blocks: [
          { type: 'p', text: 'A demo note: this local build uses a file-backed data layer, but the data model mirrors a Supabase schema.' },
          { type: 'callout', tone: 'info', title: 'Why', text: 'Same shapes, same boundaries — swapping in a real backend later is mechanical.' },
        ],
      },
    ],
  },
]

export function getCollection(slug: string): Collection | undefined {
  return collections.find((c) => c.slug === slug)
}

export function getDoc(collectionSlug: string, docSlug: string): ContentDoc | undefined {
  return getCollection(collectionSlug)?.docs.find((d) => d.slug === docSlug)
}

export function resolveRelated(doc: ContentDoc): ContentDoc[] {
  const explicit = (doc.relatedSlugs ?? [])
    .map((s) => collections.flatMap((c) => c.docs).find((d) => d.slug === s))
    .filter((d): d is ContentDoc => Boolean(d))
  // Backlinks + tag matches
  const all = collections.flatMap((c) => c.docs)
  const backlinks = all.filter((d) => (d.relatedSlugs ?? []).includes(doc.slug))
  const tagMatch = all.filter(
    (d) => d.slug !== doc.slug && d.tags.some((t) => doc.tags.includes(t)),
  )
  const seen = new Set<string>()
  const merged = [...explicit, ...backlinks, ...tagMatch]
    .filter((d) => d.slug !== doc.slug)
    .filter((d) => (seen.has(d.slug) ? false : seen.add(d.slug) ?? true))
  return merged.slice(0, 6)
}

// ---------- Fun links / misc ----------
export interface FunLink {
  label: string
  url: string
  note: string
}

export const funLinks: FunLink[] = [
  { label: 'Blog', url: '#', note: 'Very occasional, always heartfelt' },
  { label: 'Talks', url: '#', note: 'Once a year, to stay humble' },
  { label: 'Maps', url: '#', note: 'An old hobby I refuse to retire' },
]

// ---------- CV (English) ----------
export interface CvSection {
  heading: string
  items: string[]
}

export interface CvEducation {
  degree: string
  school: string
  period: string
}

export const cv = {
  headline: 'Full-Stack Developer · Friendly AI Specialist',
  summary:
    'Practical full-stack developer who ships warm, accessible interfaces and pragmatic AI tools. Known for clear communication, honest estimates and code reviews that do not hurt.',
  certifications: [
    'AWS Cloud Practitioner (placeholder)',
    'TypeScript / React certification (placeholder)',
  ],
  education: [
    {
      degree: 'MSc Computer Science (placeholder)',
      school: 'A Fine University',
      period: '2013 – 2017',
    },
  ] as CvEducation[],
  notes: 'Placeholder CV. Replace achievements and links before a real application.',
}

