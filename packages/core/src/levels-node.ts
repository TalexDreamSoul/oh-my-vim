import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { parseLevel, type Level } from './level.js'

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

/** Node-only loader for CI/content tooling; keep fs out of the browser entry. */
export function parseLevels(dir: string): Level[] {
  const levels: Level[] = []
  let chapters: string[]
  try {
    chapters = readdirSync(dir).filter((name) => /^\d+$/.test(name)).sort((a, b) => Number(a) - Number(b))
  } catch {
    return levels
  }

  for (const chapter of chapters) {
    const chapterDir = join(dir, chapter)
    let files: string[]
    try {
      files = readdirSync(chapterDir)
        .filter((name) => !name.startsWith('.') && statSync(join(chapterDir, name)).isFile())
        .sort(naturalCompare)
    } catch {
      continue
    }
    for (const file of files) {
      const level = parseLevel(readFileSync(join(chapterDir, file), 'utf8'))
      level.id = `${chapter}/${file}`
      levels.push(level)
    }
  }
  return levels
}
