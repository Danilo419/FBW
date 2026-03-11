'use client'

import { useEffect } from 'react'

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Logs in the browser console
    console.error('Account page error:', error)
  }, [error])

  return (
    <main className="container-fw pt-12 pb-20">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold">Account page crashed</h1>

        <p className="mt-2 text-sm text-gray-600">
          This is the real error message from the browser:
        </p>

        <pre className="mt-4 whitespace-pre-wrap break-words rounded-xl border bg-gray-50 p-4 text-xs text-gray-800">
          {String(error?.message || error)}
          {error?.digest ? `\n\ndigest: ${error.digest}` : ''}
        </pre>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => reset()}
            className="rounded-xl border px-4 py-2 hover:bg-gray-50"
          >
            Try again
          </button>

          <a
            href="/"
            className="rounded-xl border px-4 py-2 hover:bg-gray-50"
          >
            Go home
          </a>
        </div>
      </div>
    </main>
  )
}
