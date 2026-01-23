'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global app error:', error)
  }, [error])

  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-neutral-900 antialiased">
        <main className="container-fw pt-12 pb-20">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h1 className="text-xl font-bold">Something went wrong</h1>

            <pre className="mt-4 whitespace-pre-wrap break-words rounded-xl border bg-gray-50 p-4 text-xs text-gray-800">
              {String(error?.message || error)}
              {error?.digest ? `\n\ndigest: ${error.digest}` : ''}
            </pre>

            <button
              onClick={() => reset()}
              className="mt-4 rounded-xl border px-4 py-2 hover:bg-gray-50"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
