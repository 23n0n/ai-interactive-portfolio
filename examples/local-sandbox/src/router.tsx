import { createBrowserRouter } from 'react-router-dom'
import { Layout } from '@/components/layout'
import { HomePage } from '@/pages/home'
import { CollectionPage, CollectionDocPage } from '@/pages/collection'
import { ContactPage } from '@/pages/contact'
import { CvPage } from '@/pages/cv'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'cv', element: <CvPage /> },
      { path: ':collectionSlug', element: <CollectionPage /> },
      { path: ':collectionSlug/:docSlug', element: <CollectionDocPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
      <p className="font-mono text-6xl text-primary-300">404</p>
      <h1 className="mt-4 font-display text-3xl text-ink">This page wandered off</h1>
      <p className="mt-3 text-ink-soft">Even the demo AI does not know where it went.</p>
      <a href="/" className="mt-6 inline-block font-semibold text-primary-700 hover:underline">← Back home</a>
    </div>
  )
}
