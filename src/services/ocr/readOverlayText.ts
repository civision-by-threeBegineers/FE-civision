// Reads the Timemark coordinate overlay text in the browser (tesseract.js).
//
// OCR runs here, not on the backend: on Vercel (serverless) tesseract hangs while
// loading its language file, so /api/analysis timed out with 504. The backend only
// parses the text we send. Any failure returns null, and the backend falls back
// to manual input.
import { createWorker } from 'tesseract.js'

type OcrWorker = Awaited<ReturnType<typeof createWorker>>

// tesseract.js swallows language-load errors, so a failed load would wait forever.
const LOAD_TIMEOUT_MS = 30_000
// Timemark prints the coordinates in the bottom third of the photo. Reading the
// whole (busy) photo returns garbage, so only that strip is read.
const OVERLAY_TOP = 0.66

let workerPromise: Promise<OcrWorker> | null = null

// One worker for every photo, so the language file is downloaded only once.
function getWorker(): Promise<OcrWorker> {
  if (!workerPromise) {
    let timer: ReturnType<typeof setTimeout> | undefined
    workerPromise = Promise.race([
      createWorker('eng', undefined, { errorHandler: (e: unknown) => console.warn('[ocr] worker error:', e) }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`OCR not ready after ${LOAD_TIMEOUT_MS} ms`)), LOAD_TIMEOUT_MS)
      }),
    ])
      .finally(() => clearTimeout(timer))
      .catch((err) => {
        workerPromise = null // allow a retry on the next photo
        throw err
      })
  }
  return workerPromise
}

// Returns the overlay text, or null if OCR could not run.
export async function readOverlayText(file: File): Promise<string | null> {
  try {
    const worker = await getWorker()
    const bitmap = await createImageBitmap(file)
    const top = Math.floor(bitmap.height * OVERLAY_TOP)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height - top
    canvas.getContext('2d')!.drawImage(bitmap, 0, top, bitmap.width, canvas.height, 0, 0, bitmap.width, canvas.height)
    bitmap.close?.()
    const { data } = await worker.recognize(canvas)
    return data.text?.trim() || null
  } catch (err) {
    console.warn('[ocr] could not read the coordinate overlay:', err)
    return null
  }
}