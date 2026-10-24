// Diagnostic page to check if the ONNX model loads correctly in production.
// Visit /model-diagnostic to see the result.
//
// This page calls ONNX Runtime DIRECTLY (not through session.ts) so it can show
// the REAL error from InferenceSession.create() instead of the friendly
// "Model AI tidak bisa dimuat" message. It tries WebGPU and WASM separately so
// we can see which backend fails and why.
import { useEffect, useState } from 'react'
import * as ort from 'onnxruntime-web/webgpu'
import mjsSimd from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url'
import wasmJsep from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm?url'
import mjsJsep from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs?url'
import wasmAsync from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url'
import mjsAsync from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url'
import { YOLO_CONFIG } from '../services/yolo/config'

ort.env.wasm.wasmPaths = {
  'ort-wasm-simd-threaded.mjs': mjsSimd,
  'ort-wasm-simd-threaded.jsep.wasm': wasmJsep,
  'ort-wasm-simd-threaded.jsep.mjs': mjsJsep,
  'ort-wasm-simd-threaded.asyncify.wasm': wasmAsync,
  'ort-wasm-simd-threaded.asyncify.mjs': mjsAsync,
} as unknown as typeof ort.env.wasm.wasmPaths

type GpuNavigator = Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }

// Pull out every nested message from an Error chain (err.cause.cause...).
function describeError(err: unknown): string {
  const parts: string[] = []
  let current: unknown = err
  let depth = 0
  while (current && depth < 6) {
    if (current instanceof Error) {
      parts.push(`${current.name}: ${current.message}`)
      current = (current as { cause?: unknown }).cause
    } else {
      parts.push(String(current))
      break
    }
    depth++
  }
  return parts.join('\n  ↳ caused by: ')
}

interface BackendResult {
  backend: string
  ok: boolean
  detail: string
  inputNames?: string
  outputNames?: string
}

export default function ModelDiagnostic() {
  const [status, setStatus] = useState<'checking' | 'done'>('checking')
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [magicBytes, setMagicBytes] = useState<string | null>(null)
  const [webgpuAvailable, setWebgpuAvailable] = useState<boolean | null>(null)
  const [results, setResults] = useState<BackendResult[]>([])

  useEffect(() => {
    async function check() {
      let modelBytes: Uint8Array | null = null

      // 1. Download the model file and inspect it.
      try {
        const res = await fetch(YOLO_CONFIG.modelPath)
        if (!res.ok) {
          setFileError(`HTTP ${res.status} fetching ${YOLO_CONFIG.modelPath}`)
          setStatus('done')
          return
        }
        const contentType = res.headers.get('content-type') || ''
        const buf = new Uint8Array(await res.arrayBuffer())
        modelBytes = buf
        setFileSize(buf.length)

        // First bytes, as hex. A valid ONNX (protobuf) starts with 0x08.
        // An HTML fallback page starts with 0x3c ('<').
        const hex = Array.from(buf.slice(0, 8))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(' ')
        setMagicBytes(`${hex}  (content-type: ${contentType || 'none'})`)

        if (buf[0] === 0x3c) {
          setFileError('File starts with "<" — server returned HTML, not an ONNX model.')
          setStatus('done')
          return
        }
      } catch (err) {
        setFileError(describeError(err))
        setStatus('done')
        return
      }

      // 2. Is WebGPU even available?
      let gpuOk = false
      try {
        const nav = navigator as GpuNavigator
        if (nav.gpu) {
          const adapter = await nav.gpu.requestAdapter()
          gpuOk = Boolean(adapter)
        }
      } catch {
        gpuOk = false
      }
      setWebgpuAvailable(gpuOk)

      // 3. Try each backend separately and record the real error.
      const backendsToTry: Array<'webgpu' | 'wasm'> = gpuOk ? ['webgpu', 'wasm'] : ['wasm']
      const collected: BackendResult[] = []

      for (const backend of backendsToTry) {
        try {
          const session = await ort.InferenceSession.create(modelBytes, {
            executionProviders: [backend],
            graphOptimizationLevel: 'all',
          })
          collected.push({
            backend,
            ok: true,
            detail: 'Session created successfully.',
            inputNames: session.inputNames.join(', '),
            outputNames: session.outputNames.join(', '),
          })
          // Found one that works; still record the rest were not tried.
          setResults([...collected])
          break
        } catch (err) {
          collected.push({ backend, ok: false, detail: describeError(err) })
          setResults([...collected])
        }
      }

      setStatus('done')
    }
    check()
  }, [])

  const sizeMB = fileSize ? (fileSize / (1024 * 1024)).toFixed(2) : '?'
  const anyOk = results.some((r) => r.ok)
  const cell: React.CSSProperties = { padding: 8, border: '1px solid #ddd', verticalAlign: 'top' }
  const pre: React.CSSProperties = { whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'monospace', fontSize: 12 }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 720 }}>
      <h1>Model Diagnostic</h1>
      <p>Loads <code>{YOLO_CONFIG.modelPath}</code> directly through ONNX Runtime and shows the raw error.</p>

      <div style={{ marginTop: 16, padding: 16, borderRadius: 8, background: status === 'checking' ? '#fff3cd' : anyOk ? '#d4edda' : '#f8d7da' }}>
        <strong>Status:</strong>{' '}
        {status === 'checking' ? '⏳ Checking...' : anyOk ? '✅ Model loaded' : '❌ Model failed to load'}
      </div>

      <table style={{ marginTop: 24, width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={cell}><strong>File size</strong></td>
            <td style={cell}>{sizeMB} MB</td>
          </tr>
          <tr>
            <td style={cell}><strong>First bytes</strong></td>
            <td style={cell}><code>{magicBytes || '—'}</code></td>
          </tr>
          <tr>
            <td style={cell}><strong>WebGPU available</strong></td>
            <td style={cell}>{webgpuAvailable === null ? '—' : webgpuAvailable ? 'yes' : 'no'}</td>
          </tr>
          <tr>
            <td style={cell}><strong>Expected input name</strong></td>
            <td style={cell}><code>{YOLO_CONFIG.inputName}</code> ({YOLO_CONFIG.inputWidth}x{YOLO_CONFIG.inputHeight})</td>
          </tr>
        </tbody>
      </table>

      {fileError && (
        <div style={{ marginTop: 24, padding: 16, background: '#f8d7da', borderRadius: 8, color: '#721c24' }}>
          <strong>File error:</strong>
          <pre style={pre}>{fileError}</pre>
        </div>
      )}

      {results.length > 0 && (
        <>
          <h2 style={{ marginTop: 24 }}>Backend attempts</h2>
          {results.map((r) => (
            <div
              key={r.backend}
              style={{ marginTop: 12, padding: 16, borderRadius: 8, background: r.ok ? '#d4edda' : '#f8d7da' }}
            >
              <strong>{r.backend.toUpperCase()}:</strong> {r.ok ? '✅ ok' : '❌ failed'}
              <pre style={pre}>{r.detail}</pre>
              {r.ok && (
                <pre style={pre}>
                  inputNames: {r.inputNames}
                  {'\n'}outputNames: {r.outputNames}
                </pre>
              )}
            </div>
          ))}
        </>
      )}

      <div style={{ marginTop: 24, fontSize: 14, color: '#555' }}>
        <strong>How to read this:</strong>
        <ul>
          <li><code>First bytes</code> should start with <code>08</code> (valid ONNX). <code>3c</code> means HTML (wrong file).</li>
          <li>If the error mentions <code>opset</code>, the model was exported with an opset too new for onnxruntime-web.</li>
          <li>If it mentions an operator <code>is not implemented</code>, that op isn't supported on this backend.</li>
          <li>If it mentions <code>protobuf</code> / <code>parse</code>, the file is corrupt (re-export / re-upload best.onnx).</li>
        </ul>
      </div>
    </div>
  )
}
