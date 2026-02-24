#!/usr/bin/env node
/**
 * Upload IIIF tiles to Cloudflare R2 bucket.
 * Uses locally installed wrangler for fast subprocess spawning.
 *
 * Usage: node scripts/upload-tiles-r2.mjs
 */

import { exec } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { join, relative, extname, resolve } from 'node:path'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

const BUCKET = 'portfolio-tiles'
const LOCAL_ROOT = 'public/iiif'
const REMOTE_PREFIX = 'iiif'
const CONCURRENCY = 12
const CACHE_CONTROL = 'public, max-age=31536000, immutable'

// Local wrangler binary (avoids npx resolution overhead)
const WRANGLER = resolve('node_modules/.bin/wrangler')

const CONTENT_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.json': 'application/json',
}

async function walk(dir) {
  const files = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)))
    } else {
      if (entry.name === 'vips-properties.xml') continue
      files.push(fullPath)
    }
  }
  return files
}

async function uploadFile(localPath, remotePath, contentType) {
  const cmd = `"${WRANGLER}" r2 object put "${BUCKET}/${remotePath}" --file "${localPath}" --content-type "${contentType}" --cache-control "${CACHE_CONTROL}" --remote`
  await execAsync(cmd, { timeout: 30000 })
}

async function main() {
  const files = await walk(LOCAL_ROOT)
  console.log(`Found ${files.length} files to upload\n`)

  let completed = 0
  let failed = 0
  const total = files.length
  const startTime = Date.now()

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY)
    const promises = batch.map(async (localPath) => {
      const rel = relative(LOCAL_ROOT, localPath).replace(/\\/g, '/')
      const remotePath = `${REMOTE_PREFIX}/${rel}`
      const ext = extname(localPath).toLowerCase()
      const contentType = CONTENT_TYPES[ext] || 'application/octet-stream'

      try {
        await uploadFile(localPath, remotePath, contentType)
        completed++
        if (completed % 50 === 0 || completed === total) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
          const rate = (completed / (Date.now() - startTime) * 1000).toFixed(1)
          console.log(`  ${completed}/${total} uploaded (${elapsed}s, ${rate}/s)`)
        }
      } catch (err) {
        failed++
        console.error(`  FAILED: ${remotePath}`)
      }
    })
    await Promise.all(promises)
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
  console.log(`\nDone in ${elapsed}s! ${completed} uploaded, ${failed} failed`)
  console.log(`Public base: https://pub-353ce2e688594af988f5a6d3ea0f27f9.r2.dev/${REMOTE_PREFIX}/`)
}

main()
