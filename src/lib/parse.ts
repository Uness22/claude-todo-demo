// ============================================================
// parse.ts — Lecture Parser: extract plain text from uploaded files
// PDF   → pdfjs-dist
// DOCX  → jszip + word/document.xml  (<w:t>)
// PPTX  → jszip + ppt/slides/*.xml   (<a:t>)
// TXT/MD → as-is
// Images → no reliable in-browser OCR; caller falls back to paste
// ============================================================

import JSZip from 'jszip'

export type ParseResult =
  | { ok: true; text: string; note: string }
  | { ok: false; error: string }

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, '&')
}

/** Extract text runs from an OOXML document part, preserving paragraph breaks. */
function xmlToText(xml: string, paraTag: string, runTag: string): string {
  const paras = xml.split(new RegExp(`</${paraTag}>`, 'g'))
  const out: string[] = []
  for (const p of paras) {
    const runs = [...p.matchAll(new RegExp(`<${runTag}[^>]*>([\\s\\S]*?)</${runTag}>`, 'g'))]
    const line = runs.map((m) => m[1]).join('')
    if (line.trim()) out.push(decodeXmlEntities(line).trim())
  }
  return out.join('\n')
}

async function fromZip(file: File, kind: 'docx' | 'pptx'): Promise<ParseResult> {
  try {
    const zip = await JSZip.loadAsync(await file.arrayBuffer())
    let text = ''
    if (kind === 'docx') {
      const doc = zip.file('word/document.xml')
      if (!doc) return { ok: false, error: 'word/document.xml not found' }
      text = xmlToText(await doc.async('string'), 'w:p', 'w:t')
    } else {
      const slides = Object.keys(zip.files)
        .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
        .sort((a, b) => (Number(a.match(/\d+/)![0]) || 0) - (Number(b.match(/\d+/)![0]) || 0))
      const parts: string[] = []
      for (const name of slides) {
        const xml = await zip.file(name)!.async('string')
        const t = xmlToText(xml, 'a:p', 'a:t')
        if (t.trim()) parts.push(`--- Slide ${slides.indexOf(name) + 1} ---\n${t}`)
      }
      text = parts.join('\n\n')
    }
    text = text.replace(/\n{3,}/g, '\n\n').trim()
    if (!text) return { ok: false, error: 'No text found in file' }
    return { ok: true, text, note: `Text extracted from ${kind.toUpperCase()} (JSZip)` }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to read archive' }
  }
}

async function fromPdf(file: File): Promise<ParseResult> {
  try {
    const pdfjs = await import('pdfjs-dist')
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
    const data = new Uint8Array(await file.arrayBuffer())
    const doc = await pdfjs.getDocument({ data }).promise
    const pages: string[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      let line = ''
      let lastY: number | null = null
      const lines: string[] = []
      for (const item of content.items as Array<Record<string, unknown>>) {
        const str = String(item.str ?? '')
        const y = item.transform ? (item.transform as number[])[5] : null
        if (lastY !== null && y !== null && Math.abs((y as number) - lastY) > 4) {
          if (line.trim()) lines.push(line.trim())
          line = ''
        }
        line += str
        if (item.hasEOL) {
          if (line.trim()) lines.push(line.trim())
          line = ''
        }
        if (y !== null) lastY = y as number
      }
      if (line.trim()) lines.push(line.trim())
      pages.push(lines.join('\n'))
      page.cleanup()
    }
    const text = pages.join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
    if (!text) return { ok: false, error: 'PDF appears to be image-based (no text layer)' }
    return { ok: true, text, note: `Text extracted from PDF (${doc.numPages} pages)` }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to read PDF' }
  }
}

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp|avif)$/i

export async function extractText(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase()
  if (IMAGE_EXT.test(name)) {
    return {
      ok: false,
      error: 'Image OCR is not available offline — please paste the lecture text instead.',
    }
  }
  if (name.endsWith('.pdf')) return fromPdf(file)
  if (name.endsWith('.docx')) return fromZip(file, 'docx')
  if (name.endsWith('.pptx') || name.endsWith('.ppt')) return fromZip(file, 'pptx')
  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.markdown')) {
    const text = (await file.text()).trim()
    if (!text) return { ok: false, error: 'File is empty' }
    return { ok: true, text, note: 'Text file loaded' }
  }
  // last resort: try as text
  try {
    const text = (await file.text()).trim()
    // oxlint-disable-next-line no-control-regex -- intentional: reject binary files whose first bytes are control chars
    if (text && !/[\u0000-\u0008]/.test(text.slice(0, 500))) {
      return { ok: true, text, note: 'Loaded as plain text' }
    }
  } catch {
    /* fallthrough */
  }
  return { ok: false, error: `Unsupported file type: ${file.name}` }
}

/** Heuristic title from raw text: first meaningful heading-ish line or first sentence. */
export function deriveTitle(text: string, fileName?: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/[#*•\-–]+/g, '').trim())
    .filter((l) => l.length > 2)
  for (const l of lines.slice(0, 12)) {
    if (l.length <= 90 && l.split(/\s+/).length <= 14) {
      // A short standalone line looks like a title
      const clean = l.replace(/[:.]+$/, '')
      if (!/^\d+$/.test(clean)) return clean
    }
  }
  if (fileName) return fileName.replace(/\.[^.]+$/, '').slice(0, 80)
  const first = lines[0] || 'Untitled lecture'
  return first.split(/(?<=[.!?])\s/)[0].slice(0, 90)
}
