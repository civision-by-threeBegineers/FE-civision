// Diagnostic page to check if the ONNX model loads correctly in production.
// Visit /model-diagnostic to see the result.
import { useEffect, useState } from 'react'
import { YOLO_CONFIG } from '../services/yolo/config'
import { ensureModelReady, getActiveBackend } from '../services/yolo/yoloInference'

export default function ModelDiagnostic() {
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking')
  const [backend, setBackend] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function check() {
      try {
        // 1. Check if model file exists and get its size
        const res = await fetch(YOLO_CONFIG.modelPath)
        if (!res.ok) {
          throw new Error(`Model file not found (HTTP ${res.status})`)
        }
        const blob = await res.blob()
        setFileSize(blob.size)

        // Check if it's actually an ONNX file (not HTML fallback)
        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('text/html')) {
          throw new Error('Server returned HTML instead of ONNX file')
        }

        // 2. Try to load the model
        const loadedBackend = await ensureModelReady()
        setBackend(loadedBackend)
        setStatus('success')
      } catch (err) {
        setError((err as Error).message)
        setStatus('error')
      }
    }
    check()
  }, [])

  const expectedSize = 9.34 * 1024 * 1024 // 9.34 MB
  const sizeMB = fileSize ? (fileSize / (1024 * 1024)).toFixed(2) : '?'
  const sizeOk = fileSize ? Math.abs(fileSize - expectedSize) < 100000 : false

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 600 }}>
      <h1>Model Diagnostic</h1>
      <p>Checking if <code>{YOLO_CONFIG.modelPath}</code> loads correctly...</p>

      <div style={{ marginTop: 24, padding: 16, background: status === 'success' ? '#d4edda' : status === 'error' ? '#f8d7da' : '#fff3cd', borderRadius: 8 }}>
        <strong>Status:</strong> {status === 'checking' ? '⏳ Checking...' : status === 'success' ? '✅ OK' : '❌ Error'}
      </div>

      <table style={{ marginTop: 24, width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ padding: 8, border: '1px solid #ddd' }}><strong>Model Path</strong></td>
            <td style={{ padding: 8, border: '1px solid #ddd' }}><code>{YOLO_CONFIG.modelPath}</code></td>
          </tr>
          <tr>
            <td style={{ padding: 8, border: '1px solid #ddd' }}><strong>File Size</strong></td>
            <td style={{ padding: 8, border: '1px solid #ddd' }}>
              {sizeMB} MB {fileSize && (sizeOk ? '✅' : `⚠️ Expected ~9.34 MB`)}
            </td>
          </tr>
          <tr>
            <td style={{ padding: 8, border: '1px solid #ddd' }}><strong>Backend</strong></td>
            <td style={{ padding: 8, border: '1px solid #ddd' }}>{backend || '—'}</td>
          </tr>
          <tr>
            <td style={{ padding: 8, border: '1px solid #ddd' }}><strong>Input Size</strong></td>
            <td style={{ padding: 8, border: '1px solid #ddd' }}>{YOLO_CONFIG.inputWidth} x {YOLO_CONFIG.inputHeight}</td>
          </tr>
          <tr>
            <td style={{ padding: 8, border: '1px solid #ddd' }}><strong>Confidence Threshold</strong></td>
            <td style={{ padding: 8, border: '1px solid #ddd' }}>{YOLO_CONFIG.confidenceThreshold}</td>
          </tr>
          <tr>
            <td style={{ padding: 8, border: '1px solid #ddd' }}><strong>NMS IoU Threshold</strong></td>
            <td style={{ padding: 8, border: '1px solid #ddd' }}>{YOLO_CONFIG.nmsIoUThreshold}</td>
          </tr>
        </tbody>
      </table>

      {error && (
        <div style={{ marginTop: 24, padding: 16, background: '#f8d7da', borderRadius: 8, color: '#721c24' }}>
          <strong>Error:</strong><br />
          <code>{error}</code>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <strong>What to check if error:</strong>
        <ol>
          <li>File size should be ~9.34 MB (not 0 or very small)</li>
          <li>If size is wrong, re-deploy with the correct best.onnx</li>
          <li>Clear browser cache and try again</li>
          <li>Check browser console for additional errors</li>
        </ol>
      </div>
    </div>
  )
}
