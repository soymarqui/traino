// Aplica un archivo SQL a Supabase via Management API.
// Uso: node scripts/migrate.mjs <archivo.sql>
import { readFileSync } from 'node:fs'

const PROJECT_REF = 'kezmmygyeovmuripgssl'
const token = readFileSync(new URL('../.supabase_pat', import.meta.url), 'utf8').trim()
const file = process.argv[2]
if (!file) {
  console.error('Falta el path del .sql')
  process.exit(1)
}
const sql = readFileSync(file, 'utf8')

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  }
)
const text = await res.text()
console.log(res.status, text.slice(0, 500))
process.exit(res.ok ? 0 : 1)
