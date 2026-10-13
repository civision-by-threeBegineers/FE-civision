import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/AppLayout'
import { Icon } from '../../components/Icons'
import {
  DetectionResult,
  type BackendAnalysis,
  type Detection,
  type DetectionItem,
} from './DetectionResult'
import { ensureModelReady, detectObjects, ModelLoadError } from '../../services/yolo/yoloInference'
import { sendPhotoToBackend } from '../../services/upload/uploadPhotos'
import './UploadPage.css'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png']
const ACCEPTED_EXTENSIONS = /\.(jpe?g|png)$/i
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

type Status = 'idle' | 'predicting' | 'uploading' | 'success'

// A photo that best.onnx has already predicted.
interface Prediction {
  file: File
  url: string
  imageSize: { width: number; height: number }
  detections: Detection[]
  inferenceMs: number
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Splits the picked/dropped files into accepted files and error messages for the rest.
function checkFiles(fileList: FileList) {
  const accepted: File[] = []
  const errors: string[] = []

  for (const file of fileList) {
    const isJpgOrPng = ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.test(file.name)

    if (!isJpgOrPng) {
      errors.push(`${file.name}: only JPG and PNG files are allowed.`)
    } else if (file.size > MAX_FILE_SIZE) {
      errors.push(`${file.name}: file is larger than 10MB.`)
    } else {
      accepted.push(file)
    }
  }

  return { accepted, errors }
}

const isSameFile = (a: File, b: File) => {
  a.name === b.name && 
  a.size === b.size && 
  a.lastModified === b.lastModified
}

// Loads a File into an <img> element the model can read.
function loadImageElement(file: File) {
  return new Promise<{ img: HTMLImageElement; url: string }>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ img, url })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('tidak bisa dibaca sebagai gambar.'))
    }
    img.src = url
  })
}

// Turns a thrown error into a short, user-friendly message (no stack traces).
function friendlyError(err: unknown): string {
  if (err instanceof ModelLoadError) {
    return err.kind === 'not-found'
      ? 'Model AI tidak ditemukan. Pastikan best.onnx ada di public/models/.'
      : 'Model AI tidak bisa dimuat di browser ini.'
  }
  return (err as { message?: string } | null | undefined)?.message || 'terjadi kesalahan.'
}

export default function UploadPage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const dashboardBtnRef = useRef<HTMLButtonElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [analysisResults, setAnalysisResults] = useState<DetectionItem[]>([]) // DetectionResult items
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null) // { done, total }

  // Start loading best.onnx as soon as the page opens, so Submit doesn't wait
  // for the download. Errors are ignored here; Submit retries and reports them.
  useEffect(() => { ensureModelReady().catch(() => {})}, [])

  // Move keyboard focus into the popup when it opens
  useEffect(() => {
    if (status === 'success') dashboardBtnRef.current?.focus()
  }, [status])

  // Free the preview URLs when the results are replaced or the page closes.
  useEffect(() => {
    return () => {
      analysisResults.forEach((r) => URL.revokeObjectURL(r.url))
    }
  }, [analysisResults])

  // Submit:
  //   1. Predict every photo with best.onnx in the browser. All results are kept
  //      in one variable, `predictions`.
  //   2. Send each photo + its detections to the backend, which reads the
  //      coordinates (EXIF / OCR) and saves the analysis.
  //   3. Show the predictions together with the backend's response.
  const handleSubmit = async () => {
    setErrors([])
    setAnalysisResults([])
    const newErrors: string[] = []

    // ---------- 1. Predict with best.onnx ----------
    setStatus('predicting')
    setProgress({ done: 0, total: files.length })

    try {
      await ensureModelReady()
    } catch (err) {
      setStatus('idle')
      setProgress(null)
      setErrors([friendlyError(err)])
      return
    }

    // One entry per photo that was predicted successfully:
    // { file, url, imageSize, detections, inferenceMs }
    const predictions: Prediction[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const { img, url } = await loadImageElement(file)
        const { detections, inferenceMs } = await detectObjects(img)
        predictions.push({
          file,
          url,
          imageSize: { width: img.naturalWidth, height: img.naturalHeight },
          detections,
          inferenceMs,
        })
      } catch (err) {
        newErrors.push(`${file.name}: ${friendlyError(err)}`)
      }
      setProgress({ done: i + 1, total: files.length })
    }

    // ---------- 2. Send to the backend ----------
    setStatus('uploading')
    setProgress({ done: 0, total: predictions.length })

    const results: DetectionItem[] = []
    for (let i = 0; i < predictions.length; i++) {
      const prediction = predictions[i]
      let backend: BackendAnalysis | null = null
      let backendError: string | null = null
      try {
        backend = await sendPhotoToBackend(prediction.file, prediction.detections)
      } catch (err) {
        backendError = friendlyError(err)
        newErrors.push(`${prediction.file.name}: ${backendError}`)
      }

      results.push({
        fileName: prediction.file.name,
        url: prediction.url,
        imageSize: prediction.imageSize,
        result: {
          detections: prediction.detections.map((d) => ({ ...d, isViolation: false })),
          violationCount: backend?.totalViolations ?? 0,
        },
        backend,
        backendError,
      })
      setProgress({ done: i + 1, total: predictions.length })
    }

    setProgress(null)
    setAnalysisResults(results)
    setErrors(newErrors)

    if (!results.some((r) => r.backend)) {
      // Nothing reached the backend (server down, every photo rejected, ...):
      // back to the form so the user can read the errors and try again.
      setStatus('idle')
      return
    }

    // Saved: clear the selection so the same photos aren't sent twice.
    setFiles([])
    setStatus('success')
  }

  const addFiles = (fileList: FileList) => {
    const { accepted, errors: newErrors } = checkFiles(fileList)
    setErrors(newErrors)
    // Skip files that are already in the list
    setFiles((current) => [
      ...current,
      ...accepted.filter((file) => !current.some((f) => isSameFile(f, file))),
    ])
  }

  const removeFile = (fileToRemove: File) => {
    setFiles((current) => current.filter((file) => file !== fileToRemove))
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault() // required, otherwise the browser doesn't allow dropping here
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    // Moving between elements inside the drop zone also fires dragleave, so ignore those
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault() // stops the browser from opening the photo in the tab
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files!)
    e.target.value = '' // lets the same file be picked again after it's removed
  }

  const totalDetections = analysisResults.reduce((sum, r) => sum + r.result.detections.length, 0)
  const savedCount = analysisResults.filter((r) => r.backend).length
  const failedCount = errors.length
  const isBusy = status === 'predicting' || status === 'uploading'

  return (
    <AppLayout title="Upload Media">
      <section className="upload-page">
        <div
          className={`upload-dropzone${isDragging ? ' upload-dropzone--dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Icon.Folder />
          <h2 className="upload-dropzone__title">Drop Your Photos!</h2>
          <p className="upload-dropzone__hint">*Accepted formats: JPG, PNG (Max 10MB per file)</p>

          <button
            type="button"
            className="upload-dropzone__btn"
            onClick={() => inputRef.current!.click()}
          >
            <Icon.Plus />
            Add Files
          </button>
          {/* Hidden file picker, opened by the Add Files button */}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            hidden
            onChange={handleInputChange}
          />

          {errors.length > 0 && (
            <ul className="upload-errors" role="alert">
              {errors.map((message, i) => (
                <li key={i}>{message}</li>
              ))}
            </ul>
          )}

          {files.length > 0 && (
            <ul className="upload-files" aria-label="Selected files">
              {files.map((file) => (
                <li key={`${file.name}-${file.size}-${file.lastModified}`} className="upload-file">
                  <span className="upload-file__name">{file.name}</span>
                  <span className="upload-file__size">{formatSize(file.size)}</span>
                  <button
                    type="button"
                    className="upload-file__remove"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => removeFile(file)}
                  >
                    <Icon.Close />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Only shown once at least one photo has been added */}
          {files.length > 0 && (
            <button
              type="button"
              className="upload-submit"
              onClick={handleSubmit}
              disabled={isBusy}
            >
              Submit
            </button>
          )}

          {/* <div className="upload-officer" aria-hidden="true">
            <img src={officerImg} alt="" />
          </div> */}
        </div>

        {/* Detection results appear below the dropzone after analysis */}
        {analysisResults.length > 0 && (
          <div className="upload-results">
            <div className="upload-results__head">
              <h3 className="upload-results__title">Detection Results</h3>
              <span className="upload-results__count">
                {totalDetections} total detection{totalDetections === 1 ? '' : 's'}
              </span>
            </div>
            <div className="upload-results__grid">
              {analysisResults.map((item) => (
                <DetectionResult key={item.url} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* <div className="upload-officer" aria-hidden="true">
          <img src={officerImg} alt="" />
        </div> */}
      </section>

      {/* Rendered straight into <body> so it covers the sidebar and topbar too */}
      {status !== 'idle' &&
        createPortal(
          <div className="upload-overlay">
            {isBusy && (
              <div className="upload-loading" role="status" aria-live="polite">
                <span className="upload-spinner" aria-hidden="true" />
                <p>
                  {status === 'predicting' ? 'Mendeteksi gerobak' : 'Mengirim ke server'}
                  {progress && progress.total > 1
                    ? ` ${Math.min(progress.done + 1, progress.total)}/${progress.total}...`
                    : '...'}
                </p>
              </div>
            )}

            {status === 'success' && (
              <div
                className="upload-success"
                role="dialog"
                aria-modal="true"
                aria-labelledby="upload-success-title"
              >
                <div className="upload-success__check" aria-hidden="true">
                  <Icon.Check />
                </div>
                <h2 id="upload-success-title" className="upload-success__title">
                  Upload berhasil
                </h2>
                <p className="upload-success__subtitle">
                  {totalDetections > 0
                    ? `${totalDetections} gerobak terdeteksi, ${savedCount} foto tersimpan.`
                    : `${savedCount} foto tersimpan. Tidak ada gerobak terdeteksi.`}
                  {failedCount > 0 && ` ${failedCount} foto gagal, lihat detail di halaman.`}
                </p>
                <div className="upload-success__actions">
                  <button
                    ref={dashboardBtnRef}
                    type="button"
                    className="upload-success__btn upload-success__btn--secondary"
                    onClick={() => setStatus('idle')}
                  >
                    Lihat Hasil
                  </button>
                  <button
                    type="button"
                    className="upload-success__btn upload-success__btn--primary"
                    onClick={() => navigate('/report')}
                  >
                    Lihat Report
                  </button>
                </div>
              </div>
            )}
          </div>,
          document.body,
        )}
    </AppLayout>
  )
}
