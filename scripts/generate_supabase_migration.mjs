import { readFile, mkdir, writeFile } from 'node:fs/promises'

const tablesPayload = JSON.parse(await readFile('backend/supabase/metadata/tables.json', 'utf8'))
const catalogPayload = JSON.parse(await readFile('backend/supabase/metadata/catalog.json', 'utf8'))
const tables = tablesPayload.tables || []

function parseCatalog(payload) {
  const text = payload.result || ''
  const markers = [...text.matchAll(/<untrusted-data-([a-f0-9-]+)>/gi)]
  const marker = markers[1] || markers[0]
  if (!marker) throw new Error('Catalog payload boundary not found')
  const closing = `</untrusted-data-${marker[1]}>`
  const start = marker.index + marker[0].length
  const end = text.indexOf(closing, start)
  if (end < 0) throw new Error('Catalog closing boundary not found')
  const rows = JSON.parse(text.slice(start, end).trim())
  return rows[0]?.backend_catalog || {}
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

function sqlIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`
}

function sqlType(column) {
  if (column.data_type === 'USER-DEFINED') return column.format || 'text'
  return column.data_type
}

function columnSql(column) {
  const parts = [`  ${JSON.stringify(column.name)} ${sqlType(column)}`]
  if (column.default_value) parts.push(`DEFAULT ${column.default_value}`)
  if (!column.options?.includes('nullable')) parts.push('NOT NULL')
  return parts.join(' ')
}

const sections = []
sections.push('-- Generated from the live Datakwest Supabase project inventory.')
sections.push('-- This migration is a reviewable source artifact. It has not been applied automatically.')
sections.push('-- Secrets, production rows, auth provider settings, and storage objects are intentionally excluded.')
sections.push('')
sections.push('create extension if not exists pgcrypto;')
sections.push('')

for (const table of tables) {
  const tableName = table.name.replace(/^public\./, '')
  const lines = (table.columns || []).map(columnSql)
  const primaryKey = table.primary_keys?.length ? `,\n  primary key (${table.primary_keys.map(name => JSON.stringify(name)).join(', ')})` : ''
  sections.push(`create table if not exists public.${JSON.stringify(tableName)} (\n${lines.join(',\n')}${primaryKey}\n);`)
  sections.push(`alter table public.${JSON.stringify(tableName)} enable row level security;`)
  for (const fk of table.foreign_key_constraints || []) {
    const sourceTable = fk.source_table.replace(/^public\./, '')
    const targetTable = fk.target_table.replace(/^public\./, '')
    const constraintName = fk.name.replaceAll(/[^a-zA-Z0-9_]/g, '_')
    sections.push(`do $$ begin\n  alter table public.${JSON.stringify(sourceTable)} add constraint ${JSON.stringify(constraintName)} foreign key (${fk.source_columns.map(name => JSON.stringify(name)).join(', ')}) references ${targetTable.includes('.') ? targetTable : `public.${JSON.stringify(targetTable)}`} (${fk.target_columns.map(name => JSON.stringify(name)).join(', ')});\nexception when duplicate_object then null; end $$;`)
  }
  sections.push('')
}

const catalog = parseCatalog(catalogPayload)
for (const index of catalog.indexes || []) {
  sections.push(`${index.indexdef};`)
}
sections.push('')

for (const fn of catalog.functions || []) {
  sections.push(fn.definition.replaceAll('\r', '').trimEnd() + ';')
  sections.push('')
}

for (const policy of catalog.policies || []) {
  const tableName = policy.tablename.replaceAll(/[^a-zA-Z0-9_]/g, '_')
  const policyName = sqlIdentifier(policy.policyname)
  const roles = (policy.roles || ['public']).map(role => role === 'public' ? 'public' : JSON.stringify(role)).join(', ')
  const using = policy.qual ? ` using (${policy.qual})` : ''
  const check = policy.with_check ? ` with check (${policy.with_check})` : ''
  sections.push(`drop policy if exists ${policyName} on public.${JSON.stringify(tableName)};`)
  sections.push(`create policy ${policyName} on public.${JSON.stringify(tableName)} as ${policy.permissive.toLowerCase()} for ${policy.cmd.toLowerCase()} to ${roles}${using}${check};`)
}
sections.push('')
sections.push('-- Review required: the live project contains broad client UPDATE/ALL policies on user-owned data.')
sections.push('-- Before production launch, move authoritative XP, streak, score, usage, and readiness mutations into trusted RPC/Edge Function paths.')

await mkdir('backend/supabase/migrations', { recursive: true })
await writeFile('backend/supabase/migrations/0001_live_schema_snapshot.sql', sections.join('\n') + '\n')
console.log(`Generated migration for ${tables.length} tables.`)
