import { defineNuxtConfig } from 'nuxt/config'
import { cpSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
export default defineNuxtConfig({ ssr:false, modules:['@unocss/nuxt'], css:['~/assets/main.css'], hooks:{ 'nitro:config'(nitro){ const src=resolve(process.cwd(),'../../levels'); const dst=resolve(process.cwd(),'public/levels'); if(existsSync(src)) cpSync(src,dst,{recursive:true}); nitro.publicAssets=nitro.publicAssets||[] } }, vite:{ define:{ __VUE_PROD_DEVTOOLS__:false } } })
