// Lightweight fetch helper with JSON + error handling
export async function api<T = any>(
  path: string,
  options: { method?: string; body?: any; query?: Record<string, string | undefined> } = {}
): Promise<T> {
  const { method = 'GET', body, query } = options
  let url = path
  if (query) {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) if (v != null) params.set(k, v)
    const qs = params.toString()
    if (qs) url += `?${qs}`
  }
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  })
  const text = await res.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { data = { raw: text } }
  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
  return data as T
}

// Convert a File to a base64 data URL (client-side)
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Downscale + compress an image file client-side before uploading (avatars,
// school logo). Stored data URLs ride along inside API payloads, so keeping
// them tiny matters. Prefers WebP; falls back to PNG when the browser can't
// encode it (e.g. older Safari). Static first frame for animated GIFs.
export function resizeImageToDataUrl(file: File, maxDim = 256, quality = 0.9): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    const cleanup = () => URL.revokeObjectURL(url)
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas is not supported in this browser')
        ctx.drawImage(img, 0, 0, w, h)
        cleanup()
        const webp = canvas.toDataURL('image/webp', quality)
        resolve(webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png'))
      } catch (err) {
        cleanup()
        reject(err instanceof Error ? err : new Error('Could not process image'))
      }
    }
    img.onerror = () => {
      cleanup()
      reject(new Error('That file could not be read as an image'))
    }
    img.src = url
  })
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('')
}

export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime()
  const diff = Date.now() - d
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(iso).toLocaleDateString()
}

export function gradeToForm(grade: number | null): string {
  if (!grade) return '-'
  const map: Record<number, string> = { 7: '1st Form', 8: '2nd Form', 9: '3rd Form', 10: '4th Form', 11: '5th Form', 12: 'Lower 6th', 13: 'Upper 6th' }
  return map[grade] ?? `${grade}th`
}

export function scoreToLetter(score: number): string {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 75) return 'A-'
  if (score >= 70) return 'B+'
  if (score >= 65) return 'B'
  if (score >= 60) return 'B-'
  if (score >= 55) return 'C+'
  if (score >= 50) return 'C'
  if (score >= 45) return 'C-'
  if (score >= 40) return 'D'
  return 'F'
}
