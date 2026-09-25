import { describe, it, expect } from 'vitest'
import {
  collections,
  getCollection,
  getDoc,
  resolveRelated,
  person,
} from '@/data/content'

describe('data layer — collections', () => {
  it('has Services and Technologies collections', () => {
    expect(getCollection('services')).toBeDefined()
    expect(getCollection('technologies')).toBeDefined()
    expect(getCollection('does-not-exist')).toBeUndefined()
  })

  it('every doc belongs to its declared collection', () => {
    for (const c of collections) {
      for (const d of c.docs) {
        expect(d.collection).toBe(c.slug)
        expect(getDoc(c.slug, d.slug)).toBe(d)
      }
    }
  })

  it('returns undefined for unknown docs', () => {
    expect(getDoc('services', 'nope')).toBeUndefined()
  })

  it('docs are unique by slug across the whole catalog', () => {
    const all = collections.flatMap((c) => c.docs)
    const slugs = all.map((d) => d.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})

describe('data layer — related links', () => {
  it('resolves explicit related refs', () => {
    const doc = getDoc('services', 'ai-chatbot-embedding')!
    const related = resolveRelated(doc)
    const slugs = related.map((d) => d.slug)
    expect(slugs).toContain('fullstack-consulting')
    expect(slugs).toContain('react-typescript')
  })

  it('never returns the doc itself', () => {
    for (const c of collections) {
      for (const d of c.docs) {
        expect(resolveRelated(d).map((r) => r.slug)).not.toContain(d.slug)
      }
    }
  })

  it('is bounded to at most 6 results', () => {
    for (const c of collections) {
      for (const d of c.docs) {
        expect(resolveRelated(d).length).toBeLessThanOrEqual(6)
      }
    }
  })
})

describe('data layer — person + cv', () => {
  it('exposes the demo placeholder identity', () => {
    expect(person.fullName).toContain('Zygfryd')
    expect(person.lastName).toContain('Niewiadomski')
  })
})
