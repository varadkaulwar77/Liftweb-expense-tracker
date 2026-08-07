// Shared building blocks used by both invoice.js (Advance Invoice) and
// receipt.js (Final Receipt) — colors, currency formatting, and loading
// the real LiftWEB Studio logo. The actual document layouts live in
// their own separate files so each one only contains its own code.
import logoUrl from '../assets/logo-transparent.png'

export const INK = [17, 17, 24]
export const MUTED = [130, 130, 145]
export const PURPLE = [76, 42, 156]
export const PURPLE_LIGHT = [124, 92, 255]
export const PANEL = [246, 245, 250]
export const WHITE = [255, 255, 255]

// Real logo aspect ratio (529 x 178 px, icon + wordmark side by side)
export const LOGO_ASPECT = 529 / 178

let cachedLogoDataUrl = null
export async function loadLogoDataUrl() {
  if (cachedLogoDataUrl) return cachedLogoDataUrl
  try {
    const response = await fetch(logoUrl)
    const blob = await response.blob()
    cachedLogoDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    return cachedLogoDataUrl
  } catch {
    return null
  }
}

export function money(n) {
  return `INR ${Math.round(Number(n || 0)).toLocaleString('en-IN')}`
}