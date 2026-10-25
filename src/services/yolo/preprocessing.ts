// Preprocessing: turn an image into the tensor the model expects.
//
//   Original image
//     -> letterbox (keep aspect ratio, pad to 640x640 with value 114)
//     -> RGB, pixel / 255
//     -> float32 NCHW [1, 3, 640, 640]
//
// We also return the letterbox metadata (scale + padding) so postprocessing can
// map 640-space boxes back to the original image.
import { ort } from './session'
import { YOLO_CONFIG } from './config'

// Anything that can be drawn onto a canvas: <img>, <canvas>, <video> frame.
export type ImageSource = HTMLImageElement | HTMLCanvasElement | HTMLVideoElement

// Letterbox transform, used by postprocessing to map boxes back.
export interface LetterboxMeta {
  srcW: number
  srcH: number
  scale: number
  padX: number
  padY: number
  inputW: number
  inputH: number
}

// Draws the source image onto a 640x640 canvas, scaled to fit while keeping its
// aspect ratio, with the leftover area filled with the padding colour (114).
// Returns the canvas 2D context's pixel data plus the transform metadata.
function letterbox(source: ImageSource, targetW: number, targetH: number, padValue: number) {
  const s = source as Partial<HTMLImageElement & HTMLVideoElement & HTMLCanvasElement>
  const srcW = (s.naturalWidth || s.videoWidth || s.width) as number
  const srcH = (s.naturalHeight || s.videoHeight || s.height) as number

  if (!srcW || !srcH) {
    throw new Error('gambar belum selesai dimuat, coba lagi.')
  }

  // Single scale factor for both axes keeps the aspect ratio.
  const scale = Math.min(targetW / srcW, targetH / srcH)
  const drawW = Math.round(srcW * scale)
  const drawH = Math.round(srcH * scale)
  // Centre the image; this is the padding on the left and top.
  const padX = Math.floor((targetW - drawW) / 2)
  const padY = Math.floor((targetH - drawH) / 2)

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!

  // Fill the whole canvas with the grey padding colour first.
  ctx.fillStyle = `rgb(${padValue}, ${padValue}, ${padValue})`
  ctx.fillRect(0, 0, targetW, targetH)
  // Then draw the resized image centred on top.
  ctx.drawImage(source, 0, 0, srcW, srcH, padX, padY, drawW, drawH)

  const { data } = ctx.getImageData(0, 0, targetW, targetH) // RGBA, row-major

  const meta: LetterboxMeta = { srcW, srcH, scale, padX, padY, inputW: targetW, inputH: targetH }
  return {
    rgba: data,
    meta,
  }
}

// Converts the RGBA pixel array into a planar float32 NCHW tensor, normalised /255.
function rgbaToTensor(rgba: Uint8ClampedArray, width: number, height: number) {
  const pixelCount = width * height
  const chw = new Float32Array(pixelCount * 3) // [R-plane, G-plane, B-plane]

  const rOffset = 0
  const gOffset = pixelCount
  const bOffset = pixelCount * 2

  for (let i = 0; i < pixelCount; i++) {
    const base = i * 4 // RGBA stride
    chw[rOffset + i] = rgba[base] / 255
    chw[gOffset + i] = rgba[base + 1] / 255
    chw[bOffset + i] = rgba[base + 2] / 255
    // alpha (rgba[base + 3]) is ignored
  }

  return new ort.Tensor('float32', chw, [1, 3, height, width])
}

// Public entry point. Accepts an HTMLImageElement / canvas / video frame.
export function preprocess(source: ImageSource) {
  const { inputWidth, inputHeight, paddingValue } = YOLO_CONFIG
  const { rgba, meta } = letterbox(source, inputWidth, inputHeight, paddingValue)
  const tensor = rgbaToTensor(rgba, inputWidth, inputHeight)
  return { tensor, meta }
}
