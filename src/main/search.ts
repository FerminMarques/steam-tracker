import axios from 'axios'
import type { Guide } from '../shared/types'
import { store } from './store'

const SEARCH_SUFFIX: Record<string, string> = {
  english: 'achievement guide',
  spanish: 'logro guía',
  french: 'succès guide',
  german: 'Erfolg Anleitung',
  italian: 'achievement guida',
  portuguese: 'conquista guia',
  brazilian: 'conquista guia',
  russian: 'достижение гайд',
  japanese: '実績 ガイド',
  korean: '업적 가이드',
  schinese: '成就 攻略',
  tchinese: '成就 攻略'
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '&')
    .replace(/&gt;/g, '&gt;')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
}

// --- 100% guide memory (per game) ---
// Once a 100% guide is found for any achievement, surface it in every search
const BEST_LIMIT = 5

function getBestGuides(appId: string): Guide[] {
  try {
    const parsed = JSON.parse(store.get(`bestguides_${appId}`, '[]'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export { getBestGuides }

function rememberBestGuides(appId: string, guides: Guide[]): void {
  const byUrl = new Map(getBestGuides(appId).map((g) => [g.url, g]))
  for (const g of guides) if (g.is100Percent) byUrl.set(g.url, g)
  store.set(`bestguides_${appId}`, JSON.stringify([...byUrl.values()].slice(0, BEST_LIMIT)))
}

/** Best-effort DuckDuckGo scrape; always appends reliable fallback links. */
export async function searchWeb(appId: string, gameName: string, achievementName: string): Promise<Guide[]> {
  const lang = store.get('language', 'english') as string
  const suffix = SEARCH_SUFFIX[lang] || 'achievement guide'
  const results: Guide[] = []

  try {
    const query = `${gameName} ${achievementName} ${suffix}`
    let html = ''
    // Try html endpoint first, then lite as fallback
    let matchedEndpoint = ''
    for (const endpoint of ['https://html.duckduckgo.com/html/', 'https://lite.duckduckgo.com/lite/']) {
      try {
        const res = await axios.get(endpoint, {
          params: { q: query },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
            'Accept-Language': 'en-US,en;q=0.5',
          },
          timeout: 8000
        })
        html = res.data
        if (html.includes('result__a') || html.includes('result-link')) {
          matchedEndpoint = endpoint
          break
        }
      } catch {
        continue
      }
    }
    if (html && !matchedEndpoint) {
      console.warn(`[search] DDG markup changed (no result__a/result-link) for query="${query}" htmlLen=${html.length}`)
    }
    if (html) {
      // Build a map of snippets by position
      const snippetRe = /<a\s[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g
      const snippets: string[] = []
      let sm: RegExpExecArray | null
      while ((sm = snippetRe.exec(html)) !== null) {
        snippets.push(decodeEntities(sm[1].replace(/<[^>]+>/g, '')).trim())
      }

      const aTagRe = /<a\s[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/g
      let i = 0, si = 0
      let m: RegExpExecArray | null
      while ((m = aTagRe.exec(html)) !== null && i < 6) {
        const hrefMatch = m[0].match(/href="([^"]+)"/)
        if (!hrefMatch) continue
        const uddgMatch = hrefMatch[1].match(/uddg=([^&"]+)/)
        if (!uddgMatch) continue
        const realUrl = decodeURIComponent(uddgMatch[1].replace(/&amp;/g, '&'))
        const title = decodeEntities(m[1].replace(/<[^>]+>/g, '')).trim()
        if (!title || !realUrl.startsWith('http') || realUrl.includes('duckduckgo.com/y.js')) {
          si++
          continue
        }
        const domain = (realUrl.match(/^https?:\/\/(?:www\.)?([^/]+)/) ?? [])[1] ?? ''
        results.push({
          id: `w${i}`,
          title,
          url: realUrl,
          shortDescription: snippets[si] || '',
          domain,
          is100Percent: /100\s*%/i.test(title),
          votesUp: 0
        })
        i++; si++
      }
    }
  } catch (err: any) {
    console.error('DDG search error:', err.message)
  }

  // Surface known 100% guides in every achievement search of this game
  const best = getBestGuides(appId)
  if (best.length) {
    const known = new Set(results.map((r) => r.url))
    const missing = best.filter((g) => !known.has(g.url))
    results.unshift(...missing)
  }
  // Remember any 100% guides found (for other achievements and future sessions)
  if (results.some((r) => r.is100Percent)) rememberBestGuides(appId, results)

  // Always include reliable fallback links (visible even if DDG fails)
  results.push({
    id: 'sc',
    title: `${achievementName} — Steam Community Guides`,
    url: `https://steamcommunity.com/app/${appId}/guides/?searchText=${encodeURIComponent(achievementName)}`,
    shortDescription: 'Search Steam Community guides',
    domain: 'steamcommunity.com',
    is100Percent: false,
    votesUp: 0
  })
  results.push({
    id: 'yt',
    title: `YouTube: ${gameName} — ${achievementName}`,
    url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${gameName} ${achievementName} achievement guide`)}`,
    shortDescription: 'Search on YouTube',
    domain: 'youtube.com',
    is100Percent: false,
    votesUp: 0
  })
  return results
}
