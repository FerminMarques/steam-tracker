import axios from 'axios'

// Bypasses the Steam age/mature-content gate so guide pages render fully
const STEAM_COOKIES = 'wants_mature_content=1; birthtime=568022400; lastagecheckage=1-January-1988; mature_content=1'

/** Boilerplate/nav markers — if enough show up, extraction yielded junk instead of guide content */
const BOILERPLATE_MARKERS = [
  /all trademarks are property of their respective owners/i,
  /view community hub/i,
  /sign in.*language/i,
  /©\s*(\d{4}|202\d)\s*google llc/i,
  /cómo funciona youtube/i,
  /condiciones privacidad pol[ií]ticas y seguridad/i,
  /privacy policy\s*\|\s*legal/i,
  /create an ad|about press copyright/i,
  /create your free account (today|to)/i,
  /sign in to (follow|continue)|subscribe to unlock/i
]

function looksLikeJunk(text: string): boolean {
  if (!text || text.trim().length < 150) return true
  let hits = 0
  for (const re of BOILERPLATE_MARKERS) {
    if (re.test(text) && ++hits >= 2) return true
  }
  return false
}

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, '')
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function extractSteamGuideSections(html: string): string {
  // Find real section containers — must not match subSectionTitle/subSectionDesc
  const openRe = /<div\s+class="subSection(?: [^"]*)?"[^>]*>/gi
  const opens: number[] = []
  let m: RegExpExecArray | null
  while ((m = openRe.exec(html)) !== null) opens.push(m.index)

  const sections: string[] = []
  for (let i = 0; i < opens.length; i++) {
    const chunk = html.substring(opens[i], i + 1 < opens.length ? opens[i + 1] : html.length)
      .replace(/<script[\s\S]*?<\/script>/gi, '')
    const titleM = chunk.match(/<div\s+class="subSectionTitle"[^>]*>([\s\S]*?)<\/div>/i)
    const title = titleM ? decodeEntities(titleM[1].replace(/<[^>]+>/g, '')).trim() : ''
    // Body runs from subSectionDesc up to the next section — nested divs are fine this way
    const descM = chunk.match(/<div\s+class="subSectionDesc"[^>]*>([\s\S]*)$/i)
    if (!descM) continue
    const body = decodeEntities(stripTags(descM[1]))
      .replace(/<\/h[1-6]>/gi, '\n')
      // Cut page-widget boilerplate that trails the last section
      .replace(/Share to your Steam activity feed[\s\S]*$/i, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .replace(/[\s\n]+$/, '')
    if (body) {
      sections.push(title ? `## ${title}\n${body}` : body)
    }
  }
  return sections.join('\n\n')
}

function extractSteamGuideFallback(html: string): string {
  const bodyMatch = html.match(/<div\s+class="guide subSections"[^>]*>([\s\S]*?)<div\s+class="rightbox"/i)
    ?? html.match(/<div\s+class="guide subSections"[^>]*>([\s\S]*)/i)
  if (!bodyMatch) return ''
  const text = decodeEntities(stripTags(bodyMatch[1])).replace(/\n{3,}/g, '\n\n').trim()
  // Only trust substantial content (the sidebar/section list is short)
  return text.length > 300 ? text : ''
}

function extractGenericContent(html: string): string {
  // Remove scripts, styles, nav, footer
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
  // Try to find article/main content
  const articleMatch = clean.match(/<(?:article|main)[^>]*>([\s\S]*?)<\/(?:article|main)>/i)
  if (articleMatch) clean = articleMatch[1]
  return decodeEntities(clean
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<h[1-6][^>]*>/gi, '\n## ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\n /g, '\n'))
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function getHtml(url: string): Promise<string> {
  const doGet = () => axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
      ...(url.includes('steamcommunity.com') ? { Cookie: STEAM_COOKIES } : {})
    },
    maxRedirects: 5
  })
  try {
    return (await doGet()).data
  } catch (err: any) {
    // Steam rate-limits aggressively (429) — wait briefly and retry once
    if (err?.response?.status === 429) {
      await new Promise((r) => setTimeout(r, 2000))
      return (await doGet()).data
    }
    throw err
  }
}

/** Fetch a guide page and reduce it to readable text around the achievement mention */
export async function fetchGuideContent(
  url: string,
  achievementName: string,
  full = false
): Promise<{ success: boolean; content: string }> {
  try {
    const html: string = await getHtml(url)
    let text = ''
    // True when we got structured guide content (not a generic HTML fallback)
    let structured = false

    if (url.includes('steamcommunity.com')) {
      text = extractSteamGuideSections(html)
      if (text) structured = true
      // Fallback: try extracting from guide body directly
      if (!structured) {
        text = extractSteamGuideFallback(html)
        if (text) structured = true
      }
      // Steam page chrome is never useful content — don't fall through to generic extraction
      if (!structured) return { success: false, content: '' }
    }

    // Generic fallback for non-Steam sites
    if (!text) text = extractGenericContent(html)

    // Junk guard: nav/boilerplate means the page had no readable guide content
    if (!structured && looksLikeJunk(text)) {
      return { success: false, content: '' }
    }

    // Full mode keeps the whole guide; otherwise trim to the relevant section and cap length
    if (!full) {
      if (achievementName && text.length > 800) {
        const lowerText = text.toLowerCase()
        const lowerName = achievementName.toLowerCase()
        const idx = lowerText.indexOf(lowerName)
        if (idx >= 0) {
          // Find section boundaries around the mention
          const before = text.lastIndexOf('\n\n', Math.max(0, idx - 300))
          const after = text.indexOf('\n\n', idx + lowerName.length + 500)
          const start = before >= 0 ? before : Math.max(0, idx - 300)
          const end = after >= 0 ? Math.min(text.length, after + 200) : Math.min(text.length, idx + 2000)
          text = text.substring(start, end).trim()
        } else if (text.length > 4000) {
          text = text.substring(0, 4000).trim()
        }
      }

      // Final length cap
      if (text.length > 5000) text = text.substring(0, 5000) + '…'
    }

    return { success: !!text, content: text }
  } catch {
    return { success: false, content: '' }
  }
}
