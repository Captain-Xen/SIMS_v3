// Feature flags: admin-controlled visibility of app modules.
// Stored on SchoolSettings.features as a JSON string of { viewId: boolean }.
// A missing key means the feature is ENABLED — admins only store explicit "false".

/**
 * Parse the stored JSON string into a safe Record<viewId, boolean>.
 * Tolerates corrupt/legacy values; drops non-boolean entries.
 */
export function parseFeatures(raw?: string | null): Record<string, boolean> {
  if (!raw) return {}
  try {
    const obj = JSON.parse(raw)
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {}
    const out: Record<string, boolean> = {}
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'boolean') out[k] = v
    }
    return out
  } catch {
    return {}
  }
}

/** Serialize a features map for storage, dropping noisy "true" entries. */
export function stringifyFeatures(f: Record<string, boolean>): string {
  const out: Record<string, boolean> = {}
  for (const [k, v] of Object.entries(f)) {
    if (typeof v === 'boolean') out[k] = v
  }
  return JSON.stringify(out)
}

/** A feature is visible unless the map explicitly says false. */
export function isFeatureEnabled(features: Record<string, boolean> | undefined, id: string): boolean {
  return features?.[id] !== false
}
