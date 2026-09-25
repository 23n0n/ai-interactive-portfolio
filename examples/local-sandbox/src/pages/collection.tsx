import { useParams, Link } from 'react-router-dom'
import { getCollection, getDoc, resolveRelated, type ContentBlock } from '@/data/content'
import { AiChat } from '@/components/ai-chat'

/** Renders typed content blocks (data, not JSX) per the skill. */
export function CollectionDocPage() {
  const { collectionSlug, docSlug } = useParams()
  const doc = getDoc(collectionSlug ?? '', docSlug ?? '')
  const related = doc ? resolveRelated(doc) : []

  if (!doc) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-3xl text-ink">Document not found</h1>
        <p className="mt-3 text-ink-soft">That page does not exist or was moved.</p>
        <Link className="mt-6 inline-block font-semibold text-primary-700" to="/">← Back home</Link>
      </div>
    )
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <nav className="mb-6 text-sm text-ink-soft" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-primary-700">Home</Link>
        <span aria-hidden> / </span>
        <Link to={`/${doc.collection}`} className="capitalize hover:text-primary-700">{doc.collection}</Link>
        <span aria-hidden> / </span>
        <span className="text-ink">{doc.title}</span>
      </nav>

      <header>
        <div className="flex flex-wrap gap-2">
          {doc.tags.map((t) => (
            <span key={t} className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-800">
              {t}
            </span>
          ))}
        </div>
        <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-ink">{doc.title}</h1>
        <p className="mt-4 text-lg text-ink-soft">{doc.description}</p>
        <p className="mt-3 text-ink-soft">{doc.intro}</p>
      </header>

      <div className="mt-8 space-y-5">
        {doc.blocks.map((block, i) => renderBlock(block, i))}
      </div>

      {related.length > 0 && (
        <aside className="mt-12 rounded-2xl border border-primary-100 bg-white p-6">
          <h2 className="font-display text-xl font-semibold text-ink">Related</h2>
          <ul className="mt-4 space-y-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link to={`/${r.collection}/${r.slug}`} className="text-primary-700 hover:text-primary-800 hover:underline">
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}

      <div className="mt-12">
        <AiChat />
      </div>
    </article>
  )
}

function renderBlock(block: ContentBlock, key: number) {
  switch (block.type) {
    case 'p':
      return <p key={key} className="text-lg leading-relaxed text-ink-soft">{block.text}</p>
    case 'h2':
      return <h2 key={key} className="pt-4 font-display text-2xl font-semibold text-ink">{block.text}</h2>
    case 'h3':
      return <h3 key={key} className="pt-2 text-xl font-semibold text-ink">{block.text}</h3>
    case 'list':
      return block.ordered ? (
        <ol key={key} className="list-decimal space-y-1 pl-6 text-ink-soft">{block.items.map((i: string) => <li key={i}>{i}</li>)}</ol>
      ) : (
        <ul key={key} className="list-disc space-y-1 pl-6 text-ink-soft">{block.items.map((i: string) => <li key={i}>{i}</li>)}</ul>
      )
    case 'checklist':
      return (
        <ul key={key} className="space-y-2">
          {block.items.map((i: string) => (
            <li key={i} className="flex items-start gap-2 text-ink-soft">
              <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded bg-primary-100 text-primary-700">✓</span>
              <span>{i}</span>
            </li>
          ))}
        </ul>
      )
    case 'callout': {
      const tones: Record<string, string> = {
        info: 'border-primary-300 bg-primary-50 text-ink',
        warn: 'border-amber-acc/60 bg-amber-50 text-ink',
        ai: 'border-ai-500 bg-ai-50 text-ink',
      }
      return (
        <div key={key} className={`rounded-xl border-l-4 p-4 ${tones[block.tone] ?? tones.info}`}>
          {block.title && <p className="mb-1 font-semibold">{block.title}</p>}
          <p>{block.text}</p>
        </div>
      )
    }
    default:
      return null
  }
}

// Collection hub page
export function CollectionPage() {
  const { collectionSlug } = useParams()
  const collection = getCollection(collectionSlug ?? '')

  if (!collection) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-3xl text-ink">Collection not found</h1>
        <Link className="mt-6 inline-block font-semibold text-primary-700" to="/">← Back home</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <nav className="mb-6 text-sm text-ink-soft" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-primary-700">Home</Link>
        <span aria-hidden> / </span>
        <span className="capitalize text-ink">{collection.title}</span>
      </nav>
      <h1 className="font-display text-4xl font-semibold text-ink">{collection.title}</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-soft">{collection.description}</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {collection.docs.map((doc) => (
          <Link
            key={doc.slug}
            to={`/${collection.slug}/${doc.slug}`}
            className="group rounded-2xl border border-primary-100 bg-white p-6 transition-colors hover:border-primary-300 hover:bg-primary-50/50"
          >
            <h2 className="font-display text-xl font-semibold text-primary-800 group-hover:text-primary-900">{doc.title}</h2>
            <p className="mt-2 text-ink-soft">{doc.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {doc.tags.map((t) => (
                <span key={t} className="rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-700">{t}</span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
