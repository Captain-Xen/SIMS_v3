// Theme engine — converts a SchoolSettings accent string ("r,g,b|r,g,b|r,g,b")
// into two CSS custom properties on <html>: --brand-base and --brand-strong-base.
// Every brand-derived token in globals.css (--brand, --brand-strong, --primary,
// --ring, --sidebar-primary, --accent tint, …) cascades from those two values,
// so this single call re-skins the entire app, live, in both light and dark mode.

export const DEFAULT_ACCENT = '5,150,105|4,120,87|16,185,129' // emerald-600 | emerald-700 | emerald-500

function parseRgbTriplet(s: string | undefined): string | null {
  if (!s) return null
  const parts = s.trim().split(',').map((n) => Number(n))
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return null
  return `rgb(${parts[0]} ${parts[1]} ${parts[2]})`
}

/** Apply the saved accent color to the document. Safe to call on every settings update. */
export function applyAccentVars(accent?: string | null) {
  if (typeof document === 'undefined') return
  const raw = accent && accent.trim() ? accent.trim() : DEFAULT_ACCENT
  const [primaryRaw = '', , strongRaw = ''] = raw.split('|')
  const primary = parseRgbTriplet(primaryRaw) ?? parseRgbTriplet(DEFAULT_ACCENT.split('|')[0])!
  const strong =
    parseRgbTriplet(strongRaw) ?? parseRgbTriplet(DEFAULT_ACCENT.split('|')[2])! ?? primary
  const root = document.documentElement
  root.style.setProperty('--brand-base', primary)
  root.style.setProperty('--brand-strong-base', strong)
}
