import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const app = await readFile('src/App.jsx', 'utf8')
const vercel = JSON.parse(await readFile('vercel.json', 'utf8'))

const protectedRoutes = [...app.matchAll(/<Route path="([^"]+)" element={<Protected>/g)].map((match) => match[1])
const rewriteRoutes = new Set(vercel.rewrites.map((rewrite) => rewrite.source))

test('Vercel rewrites every protected SPA route', () => {
  for (const route of protectedRoutes) {
    assert.ok(rewriteRoutes.has(route), `missing Vercel rewrite for ${route}`)
  }
})

test('Vercel headers preserve the Supabase client connection requirements', () => {
  const headers = vercel.headers.flatMap((entry) => entry.headers)
  const values = Object.fromEntries(headers.map((header) => [header.key, header.value]))
  assert.match(values['Content-Security-Policy'], /connect-src[^;]*https:\/\/\*\.supabase\.co/)
  assert.match(values['Content-Security-Policy'], /wss:\/\/\*\.supabase\.co/)
  assert.equal(values['X-Content-Type-Options'], 'nosniff')
  assert.equal(values['Referrer-Policy'], 'strict-origin-when-cross-origin')
})
