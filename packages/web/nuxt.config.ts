import { cpSync, existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { defineNuxtConfig } from 'nuxt/config'

function levelRoutes(root: string): string[] {
  if (!existsSync(root)) return []
  return readdirSync(root, { withFileTypes: true }).flatMap((chapter) => {
    if (!chapter.isDirectory()) return []
    const chapterRoot = join(root, chapter.name)
    return readdirSync(chapterRoot, { withFileTypes: true })
      .filter((level) => level.isFile() && !level.name.startsWith('.'))
      .map((level) => `/play/${chapter.name}/${level.name}`)
  })
}

export default defineNuxtConfig({
  ssr: false,
  modules: ['@unocss/nuxt'],
  css: ['~/assets/main.css'],
  hooks: {
    'nitro:config'(nitro) {
      const root = resolve(process.cwd(), '../../levels')
      const publicRoot = resolve(process.cwd(), 'public/levels')
      if (existsSync(root)) cpSync(root, publicRoot, { recursive: true })
      nitro.publicAssets = nitro.publicAssets || []
      nitro.prerender = nitro.prerender || {}
      nitro.prerender.routes = [...new Set([...(nitro.prerender.routes || []), ...levelRoutes(root)])]
    },
  },
  vite: { define: { __VUE_PROD_DEVTOOLS__: false } },
})
