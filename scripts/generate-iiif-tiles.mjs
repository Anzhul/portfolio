import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const SOURCE_DIR = path.join(ROOT, 'public', 'in_the_desert')
const OUTPUT_DIR = path.join(ROOT, 'public', 'iiif', 'in_the_desert')

// Tile size — matches IIIFTileManager default expectations
const TILE_SIZE = 512
const JPEG_QUALITY = 85

async function generateTiles(inputPath, imageName) {
  const outputPath = path.join(OUTPUT_DIR, imageName)

  // Clean previous output if it exists
  if (fs.existsSync(outputPath)) {
    fs.rmSync(outputPath, { recursive: true })
  }

  const meta = await sharp(inputPath).metadata()
  console.log(`  ${meta.width}x${meta.height} ${meta.format} → ${outputPath}`)

  await sharp(inputPath)
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .tile({
      size: TILE_SIZE,
      layout: 'iiif3',
      id: imageName,
    })
    .toFile(outputPath)

  // Patch info.json: sharp writes the `id` field as-is, but we need
  // the runtime base URL to be relative so it works from any origin.
  // Our IIIFTileManager uses manifest.baseUrl (from info.id) to build
  // tile URLs, so set it to the path the tiles will be served from.
  const infoPath = path.join(outputPath, 'info.json')
  const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'))
  info.id = `/iiif/in_the_desert/${imageName}`
  fs.writeFileSync(infoPath, JSON.stringify(info, null, 2))

  // Count generated tiles
  let tileCount = 0
  function countFiles(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) countFiles(path.join(dir, entry.name))
      else if (entry.name === 'default.jpg') tileCount++
    }
  }
  countFiles(outputPath)
  console.log(`  → ${tileCount} tiles generated`)
}

async function main() {
  console.log(`Source: ${SOURCE_DIR}`)
  console.log(`Output: ${OUTPUT_DIR}`)
  console.log()

  // Ensure output parent exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const files = fs.readdirSync(SOURCE_DIR)
    .filter(f => /\.(webp|png|tif|tiff|jpg|jpeg)$/i.test(f))
    .sort()

  console.log(`Found ${files.length} images to process\n`)

  for (const file of files) {
    const name = path.parse(file).name
    console.log(`Processing ${file}...`)
    await generateTiles(path.join(SOURCE_DIR, file), name)
    console.log()
  }

  console.log('Done!')
}

main().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})
