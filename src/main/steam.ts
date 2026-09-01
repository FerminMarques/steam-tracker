import axios from 'axios'
import type { Achievement, ApiResult, SteamGame } from '../shared/types'
import { fail, ok } from '../shared/types'
import { store } from './store'

const STEAM_API = 'https://api.steampowered.com'

export async function getCurrentGame(): Promise<ApiResult<SteamGame>> {
  const apiKey = store.get('apiKey') as string
  const steamId = store.get('steamId') as string
  if (!apiKey || !steamId) return ok<SteamGame>(null)
  try {
    const res = await axios.get(`${STEAM_API}/ISteamUser/GetPlayerSummaries/v2/`, {
      params: { key: apiKey, steamids: steamId },
      timeout: 10000
    })
    const player = res.data?.response?.players?.[0]
    if (!player?.gameid) return ok<SteamGame>(null)
    return ok({ appId: player.gameid as string, name: (player.gameextrainfo as string) || 'Unknown Game' })
  } catch (err: any) {
    return fail(`Could not reach Steam: ${err?.message ?? 'unknown error'}`)
  }
}

export async function resolveVanity(
  apiKey: string,
  vanityUrl: string
): Promise<{ success: boolean; steamId?: string; error?: string }> {
  try {
    const res = await axios.get(`${STEAM_API}/ISteamUser/ResolveVanityURL/v1/`, {
      params: { key: apiKey, vanityurl: vanityUrl },
      timeout: 8000
    })
    if (res.data?.response?.success === 1) {
      return { success: true, steamId: res.data.response.steamid as string }
    }
    return { success: false, error: 'Username not found' }
  } catch {
    return { success: false, error: 'Failed to connect to Steam API' }
  }
}

// ---------------------------------------------------------------------------
// Achievements + progress heuristics
// ---------------------------------------------------------------------------

const STOP_TOKENS = new Set(['ach', 'stat', 'the', 'and', 'get', 'all', 'for', 'pct', 'float', 'dlc', 'num', 'total', 'new', 'achievement', 'count', 'number'])

/** Split on _ and camelCase, lowercase, filter noise */
function tokenize(name: string): string[] {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[_\s]+/)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length >= 3 && isNaN(Number(t)) && !STOP_TOKENS.has(t))
}

/** Largest "goal-like" number in a description */
function extractMax(desc: string): number | null {
  const nums = [...desc.matchAll(/\b(\d{1,6})\b/g)]
    .map((m) => parseInt(m[1], 10))
    .filter((n) => n >= 2 && n <= 100000)
  if (!nums.length) return null
  const significant = nums.filter((n) => n >= 5)
  return significant.length ? Math.max(...significant) : nums[nums.length - 1]
}

/** Strip common achievement prefixes to get the core name */
function stripAchPrefix(name: string): string {
  return name.replace(/^(ACH_|ACHIEVEMENT_|TROPHY_|NEW_ACHIEVEMENT_\d+_)/i, '').replace(/_\d+$/i, '')
}

/** Normalize: lowercase, strip prefix, underscores */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[_\s-]+/g, '')
}

interface ProgressContext {
  maxFromDesc: number | null
  stripped: string
  detectedStatPrefix: string | null
  statValueMap: Map<string, number>
  statNames: string[]
  schemaStatSet: Set<string>
  statTokenMap: StatEntry[]
}

interface StatEntry {
  name: string
  value: number
  tokens: string[]
}

function getStatVal(ctx: ProgressContext, name: string): number | null {
  const key = name.toLowerCase()
  if (ctx.statValueMap.has(key)) return ctx.statValueMap.get(key)!
  if (ctx.schemaStatSet.has(key)) return 0
  return null
}

/**
 * Conservative progress finder with balanced precision.
 * 1) Direct/exact stat name match after prefix stripping
 * 2) Exact normalized match (prefix-stripped on both sides)
 * 3) Token matching: 2+ overlap required at 0.4+ ratio, OR single unique long token
 * Ambiguity rejection: if top 2 matches score within 80%, skip
 */
function findProgress(ctx: ProgressContext, achApiName: string, achDisplayName: string): { current: number; max: number } | null {
  const maxFromDesc = ctx.maxFromDesc
  if (maxFromDesc === null) return null

  const stripped = ctx.stripped

  // Strategy 1: Direct stat name match
  const directPatterns = [stripped]
  if (ctx.detectedStatPrefix) {
    directPatterns.push(`${ctx.detectedStatPrefix}${stripped}`)
  }
  directPatterns.push(`stat_${stripped}`)

  for (const pattern of directPatterns) {
    const val = getStatVal(ctx, pattern)
    if (val !== null && val > 0) {
      return { current: Math.min(val, maxFromDesc), max: maxFromDesc }
    }
  }

  // Strategy 2: Exact normalized match
  const normStripped = normalize(stripped)
  if (normStripped.length >= 5) {
    for (const sName of ctx.statNames) {
      const normStat = normalize(sName)
      const normStatClean = ctx.detectedStatPrefix ? normStat.replace(normalize(ctx.detectedStatPrefix), '') : normStat
      if (normStatClean === normStripped) {
        const val = ctx.statValueMap.get(sName.toLowerCase())
        if (val !== undefined && val > 0) {
          return { current: Math.min(val, maxFromDesc), max: maxFromDesc }
        }
      }
    }
  }

  // Strategy 3: Token matching
  const achTokens = [...new Set([...tokenize(achApiName), ...tokenize(achDisplayName)])]
  if (achTokens.length === 0) return null

  interface Match {
    value: number
    score: number
    overlap: number
  }
  const matches: Match[] = []

  for (const entry of ctx.statTokenMap) {
    if (entry.tokens.length === 0 || entry.value <= 0) continue
    let overlap = 0
    for (const at of achTokens) {
      for (const st of entry.tokens) {
        // Exact match or prefix match (4+ chars on shorter side)
        if (at === st) {
          overlap++
          break
        }
        const [shorter, longer] = at.length <= st.length ? [at, st] : [st, at]
        if (shorter.length >= 4 && longer.startsWith(shorter)) {
          overlap++
          break
        }
      }
    }
    if (overlap === 0) continue

    const score = overlap / Math.max(achTokens.length, entry.tokens.length)

    // 2+ overlapping tokens: accept at score >= 0.4
    if (overlap >= 2 && score >= 0.4) {
      matches.push({ value: entry.value, score, overlap })
    }
    // 1 overlapping token: only if token is specific (6+ chars) and score is high
    else if (overlap === 1 && achTokens.length === 1 && achTokens[0].length >= 6 && score >= 0.5) {
      matches.push({ value: entry.value, score, overlap })
    }
  }

  if (matches.length === 0) return null

  // Ambiguity rejection
  matches.sort((a, b) => b.score - a.score || b.overlap - a.overlap)
  if (matches.length >= 2 && matches[1].score >= matches[0].score * 0.8) {
    return null
  }

  const best = matches[0]
  return { current: Math.min(best.value, maxFromDesc), max: maxFromDesc }
}

/** Steam's schema still points icons at the legacy akamai CDN, which 404s for many newer games.
 *  The universal path is community_assets on shared.fastly — same hashes, this is what steamcommunity.com itself uses. */
function fixIconUrl(url: string): string {
  return url.replace(
    'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/',
    'https://shared.fastly.steamstatic.com/community_assets/images/'
  )
}

/** Resolve the best header image for a game.
 *  Legacy games have predictable capsule paths; newer ones use hashed
 *  store_item_assets only discoverable via the appdetails endpoint. */
const artCache = new Map<string, string>()

export async function getGameArt(appId: string): Promise<string | null> {
  if (artCache.has(appId)) return artCache.get(appId)!
  const legacy = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/capsule_184x69.jpg`
  try {
    const head = await axios.head(legacy, { timeout: 8000 })
    if (head.status === 200) {
      artCache.set(appId, legacy)
      return legacy
    }
  } catch {
    // fall through to appdetails
  }
  try {
    const res = await axios.get(`https://store.steampowered.com/api/appdetails?appids=${appId}`, {
      timeout: 10000
    })
    const data = res.data?.[appId]?.data
    const url = (data?.capsule_image || data?.header_image || '') as string
    if (url) {
      artCache.set(appId, url)
      return url
    }
  } catch {
    // network failure — leave uncached so we retry next poll cycle change
  }
  return null
}

/** Steam Web API expects specific language codes — internal `korean` must map to `koreana` */
function toSteamLang(lang: string): string {
  if (lang === 'korean') return 'koreana'
  if (lang === 'brazilian') return 'brazilian'
  return lang
}

export async function getAchievements(appId: string): Promise<ApiResult<Achievement[]>> {
  const apiKey = store.get('apiKey') as string
  const steamId = store.get('steamId') as string
  const rawLang = store.get('language', 'english') as string
  const lang = toSteamLang(rawLang)
  if (!apiKey || !steamId) return fail('Steam API key or Steam ID missing — check Settings')
  try {
    const [schemaRes, playerRes, pctRes, statsRes] = await Promise.all([
      axios.get(`${STEAM_API}/ISteamUserStats/GetSchemaForGame/v2/`, {
        params: { key: apiKey, appid: appId, l: lang }, timeout: 15000
      }),
      axios.get(`${STEAM_API}/ISteamUserStats/GetPlayerAchievements/v1/`, {
        params: { key: apiKey, steamid: steamId, appid: appId, l: lang }, timeout: 15000
      }),
      axios.get(`${STEAM_API}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/`, {
        params: { gameid: appId }, timeout: 15000
      }),
      axios.get(`${STEAM_API}/ISteamUserStats/GetUserStatsForGame/v2/`, {
        params: { key: apiKey, steamid: steamId, appid: appId }, timeout: 15000
      }).catch(() => ({ data: null }))
    ])

    // GetPlayerAchievements reports per-game errors (e.g. private profile / bad key) inside a 200 response
    const playerError: string | null = playerRes.data?.playerstats?.error ?? null
    const schema: any[] = schemaRes.data?.game?.availableGameStats?.achievements || []
    const schemaStats: any[] = schemaRes.data?.game?.availableGameStats?.stats || []
    const playerAch: any[] = playerRes.data?.playerstats?.achievements || []
    const globalPct: any[] = pctRes.data?.achievementpercentages?.achievements || []
    const userStats: any[] = statsRes.data?.playerstats?.stats || []

    if (!schema.length) return fail('No achievement data for this game (is the appid valid?)')
    if (playerError) return fail(`Steam says: ${playerError}`)

    const achievedMap = new Map(playerAch.map((a) => [a.apiname, a]))
    const pctMap = new Map(globalPct.map((a) => [a.name, a.percent as number]))

    // Stat value map from user stats
    const statValueMap = new Map<string, number>()
    for (const s of userStats) {
      if (typeof s.value === 'number' && Number.isFinite(s.value)) {
        statValueMap.set((s.name as string).toLowerCase(), Math.round(s.value as number))
      }
    }

    // Full stat list with original names
    const statNames: string[] = userStats
      .filter((s: any) => typeof s.value === 'number' && Number.isFinite(s.value) && !String(s.name).includes('float'))
      .map((s: any) => s.name as string)

    // Set of ALL stat names from schema
    const schemaStatSet = new Set<string>(schemaStats.map((s: any) => (s.name as string).toLowerCase()))

    // Auto-detect game-specific stat prefix
    const prefixCounts = new Map<string, number>()
    for (const name of statNames) {
      const m = name.match(/^([A-Za-z]{2,6}_)/)
      if (m) prefixCounts.set(m[1].toLowerCase(), (prefixCounts.get(m[1].toLowerCase()) || 0) + 1)
    }
    const detectedStatPrefix = [...prefixCounts.entries()]
      .filter(([, c]) => c >= statNames.length * 0.3 && c >= 3)
      .sort((a, b) => b[1] - a[1])
      .map(([p]) => p)[0] || null

    // Map stat api name → stat displayName (from schema)
    const schemaStatDisplayMap = new Map<string, string>()
    for (const s of schemaStats) {
      if (s.displayName) schemaStatDisplayMap.set((s.name as string).toLowerCase(), s.displayName as string)
    }

    // Tokenized stat map for fuzzy matching
    const statTokenMap: StatEntry[] = []
    for (const s of userStats) {
      if (typeof s.value === 'number' && Number.isFinite(s.value) && !String(s.name).includes('float')) {
        const displayName = schemaStatDisplayMap.get((s.name as string).toLowerCase()) || ''
        const combined = [...new Set([...tokenize(s.name as string), ...tokenize(displayName)])]
        if (combined.length > 0) {
          statTokenMap.push({ name: s.name as string, value: Math.round(s.value as number), tokens: combined })
        }
      }
    }

    const achievements = schema.map((ach) => {
      const pd = achievedMap.get(ach.name) as any
      let currentProgress: number | null = null
      let maxProgress: number | null = null

      if (pd?.achieved !== 1) {
        const desc = (ach.description || '') as string

        // 1) cursteps/maxsteps directly from GetPlayerAchievements
        if (pd?.maxsteps != null && (pd.maxsteps as number) > 1) {
          maxProgress = pd.maxsteps as number
          currentProgress = (pd.cursteps as number) ?? 0
        }

        // 2) Multi-strategy stat matching
        if (currentProgress === null) {
          const maxFromDesc = extractMax(desc)
          if (maxFromDesc !== null) {
            const ctx: ProgressContext = {
              maxFromDesc,
              stripped: stripAchPrefix(ach.name as string).toLowerCase(),
              detectedStatPrefix,
              statValueMap,
              statNames,
              schemaStatSet,
              statTokenMap
            }
            const result = findProgress(ctx, ach.name as string, (ach.displayName || '') as string)
            if (result) {
              currentProgress = result.current
              maxProgress = result.max
            }
          }
        }
      }

      return {
        apiName: ach.name as string,
        displayName: (ach.displayName || ach.name) as string,
        description: (ach.description || '') as string,
        icon: fixIconUrl((ach.icon || '') as string),
        iconGray: fixIconUrl((ach.icongray || '') as string),
        achieved: pd?.achieved === 1,
        unlockTime: (pd?.unlocktime || 0) as number,
        globalPercent: Math.round(((pctMap.get(ach.name) || 0) as number) * 10) / 10,
        currentProgress,
        maxProgress
      }
    })

    return ok(achievements)
  } catch (err: any) {
    const status = err?.response?.status
    if (status === 403) return fail('Steam rejected the API key (403) — check it in Settings')
    return fail(`Steam API request failed${status ? ` (${status})` : ''}: ${err?.message ?? 'unknown error'}`)
  }
}
