#!/usr/bin/env node
import { readdir, readFile, stat } from 'fs/promises'
import path from 'path'

const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve('src')
const TARGET = /[\u2026]/g
const matches = []

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(entryPath)
      continue
    }

    if (!entry.name.match(/\.(js|jsx|ts|tsx|json|css|md|txt)$/i)) {
      continue
    }

    const content = await readFile(entryPath, 'utf8')
    let match
    while ((match = TARGET.exec(content)) !== null) {
      const before = content.slice(0, match.index)
      const line = before.split(/\r?\n/).length
      matches.push({ file: entryPath, line })
    }
  }
}

try {
  const rootStats = await stat(ROOT)
  if (!rootStats.isDirectory()) {
    console.error(`Provided path is not a directory: ${ROOT}`)
    process.exit(1)
  }
  await walk(ROOT)
} catch (error) {
  console.error('Failed to scan for unicode ellipsis characters (…):')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}

if (matches.length === 0) {
  console.log('No unicode ellipsis characters (… U+2026) found.')
  process.exit(0)
}

console.error('Found unicode ellipsis characters (… U+2026) in the following locations:')
for (const { file, line } of matches) {
  console.error(`  ${path.relative(process.cwd(), file)}:${line}`)
}
console.error('\nReplace them with three ASCII dots (...) or the intended code.')
process.exit(1)
