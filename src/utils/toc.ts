/**
 * Table of Contents (TOC) Utility Functions
 * Extracts headings from HTML and generates unique IDs
 */

export interface TocItem {
  id: string
  text: string
  level: number // 2 or 3 (H2 or H3)
}

/**
 * Generate URL-safe ID from text
 * Handles both Korean and English text
 */
export function generateIdFromText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove special characters except hyphens and Korean/English/numbers
    .replace(/[^\w\가-\힣-]/g, '')
    // Replace multiple hyphens with single hyphen
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-|-$/g, '')
}

/**
 * Extract TOC items from HTML content
 * Returns H2 and H3 headings with auto-generated IDs
 */
export function generateTocFromHTML(html: string): TocItem[] {
  if (!html) return []

  const tocItems: TocItem[] = []

  // Create a temporary DOM parser (works in browser)
  if (typeof window === 'undefined') {
    // Server-side: use simple regex matching
    const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi
    const h3Regex = /<h3[^>]*>(.*?)<\/h3>/gi

    let match
    const allHeadings: Array<{ text: string; level: number; index: number }> = []

    // Find all H2
    while ((match = h2Regex.exec(html)) !== null) {
      allHeadings.push({
        text: match[1].replace(/<[^>]+>/g, '').trim(),
        level: 2,
        index: match.index
      })
    }

    // Find all H3
    while ((match = h3Regex.exec(html)) !== null) {
      allHeadings.push({
        text: match[1].replace(/<[^>]+>/g, '').trim(),
        level: 3,
        index: match.index
      })
    }

    // Sort by position in HTML
    allHeadings.sort((a, b) => a.index - b.index)

    // Generate IDs
    allHeadings.forEach((heading) => {
      if (heading.text) {
        tocItems.push({
          id: generateIdFromText(heading.text),
          text: heading.text,
          level: heading.level
        })
      }
    })
  } else {
    // Client-side: use DOM parser
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const headings = doc.querySelectorAll('h2, h3')

    headings.forEach((heading) => {
      const text = heading.textContent?.trim() || ''
      if (text) {
        tocItems.push({
          id: generateIdFromText(text),
          text: text,
          level: parseInt(heading.tagName.substring(1)) // H2 -> 2, H3 -> 3
        })
      }
    })
  }

  return tocItems
}

/**
 * Inject IDs into HTML headings that don't have them
 * This ensures anchor links work correctly
 */
export function injectIdsToHeadings(html: string, tocItems: TocItem[]): string {
  if (!html || tocItems.length === 0) return html

  let modifiedHtml = html

  tocItems.forEach((item) => {
    // Match heading tags without ID attributes
    const h2Pattern = new RegExp(
      `<h${item.level}([^>]*)>\\s*${escapeRegExp(item.text)}\\s*</h${item.level}>`,
      'gi'
    )

    modifiedHtml = modifiedHtml.replace(h2Pattern, (match, attributes) => {
      // Check if ID already exists
      if (attributes && attributes.includes('id=')) {
        return match
      }

      // Add ID to heading
      return `<h${item.level}${attributes} id="${item.id}">${item.text}</h${item.level}>`
    })
  })

  return modifiedHtml
}

/**
 * Escape special characters for RegExp
 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Calculate scroll offset for smooth scrolling
 * Takes into account fixed headers
 */
export function getScrollOffset(): number {
  // Header height + some padding
  return 100
}

/**
 * Smooth scroll to element by ID
 */
export function scrollToElement(id: string): void {
  const element = document.getElementById(id)
  if (!element) return

  const offset = getScrollOffset()
  const elementPosition = element.getBoundingClientRect().top + window.scrollY
  const offsetPosition = elementPosition - offset

  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth'
  })
}
