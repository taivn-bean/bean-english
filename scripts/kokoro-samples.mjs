#!/usr/bin/env node
// Render the same sample lines with several Kokoro voices to compare them.
// Usage: node scripts/kokoro-samples.mjs <outDir> [voice1,voice2,...]
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { KokoroTTS } from 'kokoro-js'

const outDir = process.argv[2] ?? 'kokoro-samples'
const voices = (process.argv[3] ?? 'af_heart,af_bella,af_sarah,am_michael,am_adam').split(',')
const SAMPLE = 'Good morning, sweetie! Are you hungry? Do you want some milk? Time for a bath! Sweet dreams.'

mkdirSync(outDir, { recursive: true })
let t = Date.now()
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' })
console.log(`model loaded in ${((Date.now() - t) / 1000).toFixed(1)}s`)

for (const voice of voices) {
  t = Date.now()
  const audio = await tts.generate(SAMPLE, { voice })
  audio.save(join(outDir, `${voice}.wav`))
  console.log(`${voice}: ${((Date.now() - t) / 1000).toFixed(1)}s`)
}
