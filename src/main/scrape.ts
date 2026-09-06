import axios from 'axios'

// Bypasses the Steam age/mature-content gate so guide pages render fully.
// Birthdate is computed (30 years ago) instead of a hardcoded 1988 stamp so the
// cookie always reads as an adult and doesn't fingerprint every install identically.
function getSteamCookies(): string {
  const birthtime = Math.floor(Date.now() / 1000) - 30 * 365 * 24 * 3600
  const checkDate = new Date(birthtime * 1000).toUTCString().replace(/^\w+, /, '')
  return `wants_mature_content=1; birthtime=${birthtime}; lastagecheckage=${checkDate}; mature_content=1`
}

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

/** Cloudflare / WAF / error pages — never real guide content (e.g. Error 1014 CNAME Cross-User Banned) */
const ERROR_PAGE_RES = [
  /error\s*1014/i,
  /cname.*cross-user banned/i,
  /cross-user.*banned/i,
  /cloudflare.*ray id/i,
  /ray id:\s*[0-9a-f]+/i,
  /just a moment.*checking your browser/i,
  /verify you are human/i,
  /attention required.*cloudflare/i,
  /access denied.*reference #/i,
  /403 forbidden.*cloudflare/i
]

function isErrorPage(html: string): boolean {
  if (!html || html.length < 500) return false
  let hits = 0
  for (const re of ERROR_PAGE_RES) {
    if (re.test(html) && ++hits >= 1) return true
  }
  // Generic Cloudflare challenge shell without readable article
  if (/cdn-cgi\/challenge-platform/i.test(html) && !/subSectionDesc|article|guide/i.test(html)) return true
  return false
}

export interface GuideFetchResult {
  success: boolean
  content: string
  error?: string
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
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(parseInt(d, 10)))
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
  // Convert block-level tags to newlines BEFORE stripping, so structure survives
  return decodeEntities(clean
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|li|tr|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<h[1-6][^>]*>/gi, '\n## ')
    .replace(/<[^>]+>/g, ' ')
    // Collapse spaces/tabs but PRESERVE newlines (they carry the structure)
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n'))
    .replace(/\r\n?/g, '\n')
    .split('\n')
    // Drop empty-bullet lines (nav/list wrappers) and blank-line runs
    .map((l) => l.trim())
    .filter((l) => l && !/^[\s•]+$/.test(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function getHtml(url: string): Promise<string> {
  const doGet = () => axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
      ...(url.includes('steamcommunity.com') ? { Cookie: getSteamCookies() } : {})
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

/** Fetch a guide page and reduce it to readable text around the achievement mention.
 *  Never throws and never retries in a loop: a single attempt, then { success:false, error } so the
 *  renderer can notify instead of spinning forever. */
export async function fetchGuideContent(
  url: string,
  achievementName: string,
  full = false
): Promise<GuideFetchResult> {
  try {
    const html: string = await getHtml(url)
    // Blocked / challenge pages (Cloudflare 1014, captcha, etc.) are not guide content
    if (isErrorPage(html)) {
      console.warn(`[scrape] blocked error page for ${url}`)
      return { success: false, content: '', error: 'blocked' }
    }
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
      if (!structured) return { success: false, content: '', error: 'empty' }
    }

    // Generic fallback for non-Steam sites
    if (!text) text = extractGenericContent(html)

    // Junk guard: nav/boilerplate means the page had no readable guide content
    if (!structured && looksLikeJunk(text)) {
      return { success: false, content: '', error: 'empty' }
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

    if (!text) return { success: false, content: '', error: 'empty' }
    return { success: true, content: text }
  } catch (err: any) {
    const status = err?.response?.status
    const code = err?.code ?? ''
    let error = 'network'
    if (status === 404) error = 'not-found'
    else if (status === 403 || status === 401) error = 'forbidden'
    else if (status === 429) error = 'rate-limited'
    else if (code === 'ECONNABORTED' || /timeout/i.test(err?.message ?? '')) error = 'timeout'
    else if (/1014|cname|cloudflare/i.test(String(err?.message ?? ''))) error = 'blocked'
    console.warn(`[scrape] fetch failed ${url} status=${status ?? code} error=${error}`)
    return { success: false, content: '', error }
  }
}
