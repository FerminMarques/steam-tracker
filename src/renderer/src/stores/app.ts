import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'
import type { Achievement, Guide } from '@shared/types'

export type { Achievement, Guide }

// Module-level cache: avoids re-fetching guides when re-selecting same achievement
let _searchGen = 0
const _guidesCache = new Map<string, Guide[]>()
// Full-text cache for the integrated reader (per URL)
const _fullGuideCache = new Map<string, string>()

export const useAppStore = defineStore('app', () => {
  const currentGame = ref<{ appId: string; name: string } | null>(null)
  const currentGameArt = ref<string | null>(null)
  const achievements = ref<Achievement[]>([])
  const selectedAchievement = ref<Achievement | null>(null)
  const guides = ref<Guide[]>([])
  const loadingGame = ref(false)
  const loadingAchievements = ref(false)
  const loadingGuides = ref(false)
  const achievementsError = ref<string | null>(null)
  const activeTab = ref<'pinned' | 'pending' | 'completed' | 'all'>('pending')
  const pollingTimer = ref<ReturnType<typeof setInterval> | null>(null)
  const lastAppId = ref<string | null>(null)
  const pollCount = ref(0)  // counts polls to trigger periodic achievement refresh
  const searchQuery = ref('')
  const sortBy = ref<'default' | 'rarity' | 'name'>('default')
  const isOnTop = ref(false)
  const pinnedAchievements = ref<Set<string>>(new Set())
  const pinnedGuides = ref<Map<string, Guide>>(new Map())
  const focusMode = ref(false)
  const expandedGuides = ref<Set<string>>(new Set())
  const manualProgress = ref<Map<string, { current: number; max: number }>>(new Map())
  // Integrated guide reader state
  const readerGuide = ref<{ title: string; url: string; content: string } | null>(null)
  const loadingReader = ref(false)
  // Separate guide panel window state (main window side)
  const guidePanelOpen = ref(false)
  const guidePanelUrl = ref<string | null>(null)
  // Known 100% guides for the current game (persisted main-side)
  const bestGuides = ref<Guide[]>([])

  function filterAndSort(list: Achievement[]): Achievement[] {
    let result = list
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(
        (a) =>
          a.displayName.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q)
      )
    }
    if (sortBy.value === 'rarity') {
      result = [...result].sort((a, b) => a.globalPercent - b.globalPercent)
    } else if (sortBy.value === 'name') {
      result = [...result].sort((a, b) => a.displayName.localeCompare(b.displayName))
    }
    return result
  }

  const pending = computed(() => achievements.value.filter((a) => !a.achieved))
  const completed = computed(() => achievements.value.filter((a) => a.achieved))
  const pinned = computed(() => achievements.value.filter((a) => pinnedAchievements.value.has(a.apiName)))
  const displayed = computed(() => {
    let base: Achievement[]
    if (activeTab.value === 'pinned') base = pinned.value
    else if (activeTab.value === 'pending') base = pending.value
    else if (activeTab.value === 'completed') base = completed.value
    else base = achievements.value
    return filterAndSort(base)
  })

  function togglePinAchievement(apiName: string) {
    const next = new Set(pinnedAchievements.value)
    if (next.has(apiName)) {
      next.delete(apiName)
      // If unpinned, also remove the pinned guide
      const nextGuides = new Map(pinnedGuides.value)
      nextGuides.delete(apiName)
      expandedGuides.value.delete(apiName)
      pinnedGuides.value = nextGuides
      persistGuidePins()
    } else {
      next.add(apiName)
    }
    pinnedAchievements.value = next
    // If no pins remain, exit focus mode
    if (next.size === 0) {
      focusMode.value = false
      onFocusModeOff()
    }
    // Persist pins for this game
    if (currentGame.value) {
      window.steamApi.setPinnedAchievements(currentGame.value.appId, [...next])
    }
  }

  /** Persist pinned guides for the current game (content is stripped) */
  function persistGuidePins() {
    if (!currentGame.value) return
    const plain: Record<string, Guide> = {}
    for (const [apiName, guide] of pinnedGuides.value) {
      plain[apiName] = { ...guide }
      delete plain[apiName].content
    }
    window.steamApi.setPinnedGuides(currentGame.value.appId, plain)
  }

// Video sites never yield readable text; guide *listing*/search pages are navigation, not content
const NON_READABLE_URL_RE = /youtube\.com|youtu\.be|steamcommunity\.com\/app\/[^/]+\/guides\/?(\?|$)/i

function togglePinnedGuide(apiName: string, guide: Guide) {
  // Search/listing fallback links can't be scraped — don't allow pinning them
  if (NON_READABLE_URL_RE.test(guide.url)) return
  const next = new Map(pinnedGuides.value)
    if (next.get(apiName)?.id === guide.id) {
      next.delete(apiName)
      expandedGuides.value.delete(apiName)
    } else {
      next.set(apiName, guide)
      // Fetch guide content in the background
      fetchGuideContent(apiName, guide)
    }
    pinnedGuides.value = next
    // A pinned guide implies a pinned achievement
    if (!pinnedAchievements.value.has(apiName)) togglePinAchievement(apiName)
    persistGuidePins()
  }

  async function fetchGuideContent(apiName: string, guide: Guide) {
    if (guide.content) return
    try {
      const achName = achievements.value.find(a => a.apiName === apiName)?.displayName || ''
      const result = await window.steamApi.fetchGuideContent(guide.url, achName, true)
      if (result.success && result.content) {
        const next = new Map(pinnedGuides.value)
        const existing = next.get(apiName)
        if (existing && existing.id === guide.id) {
          next.set(apiName, { ...existing, content: result.content })
          pinnedGuides.value = next
        }
      }
    } catch { /* silent */ }
  }

  const loadingGuidesContent = ref<Set<string>>(new Set())

  /** Fetch full content for a pinned guide on demand (tracks loading state for spinners) */
  async function loadPinnedGuideContent(apiName: string) {
    const guide = pinnedGuides.value.get(apiName)
    if (!guide || guide.content || loadingGuidesContent.value.has(apiName)) return
    const nextLoading = new Set(loadingGuidesContent.value)
    nextLoading.add(apiName)
    loadingGuidesContent.value = nextLoading
    try {
      await fetchGuideContent(apiName, guide)
    } finally {
      const done = new Set(loadingGuidesContent.value)
      done.delete(apiName)
      loadingGuidesContent.value = done
    }
  }

  function toggleGuideExpand(apiName: string) {
    const next = new Set(expandedGuides.value)
    if (next.has(apiName)) next.delete(apiName)
    else next.add(apiName)
    expandedGuides.value = next
  }

  /** Open the full guide in the integrated reader (cached per URL) */
  async function openGuideReader(guide: Guide) {
    // Video sites / guide listing pages never yield readable text — go to the browser
    if (NON_READABLE_URL_RE.test(guide.url)) {      window.steamApi.openUrl(guide.url)
      return
    }
    const cached = _fullGuideCache.get(guide.url)
    if (cached) {
      readerGuide.value = { title: guide.title, url: guide.url, content: cached }
      return
    }
    readerGuide.value = { title: guide.title, url: guide.url, content: '' }
    loadingReader.value = true
    try {
      const res = await window.steamApi.fetchGuideContent(guide.url, '', true)
      if (res.success) {
        _fullGuideCache.set(guide.url, res.content)
        if (readerGuide.value?.url === guide.url) {
          readerGuide.value = { title: guide.title, url: guide.url, content: res.content }
        }
      } else {
        // Extraction failed — fall back to opening in the browser
        readerGuide.value = null
        window.steamApi.openUrl(guide.url)
      }
    } finally {
      loadingReader.value = false
    }
  }

  function closeGuideReader() {
    readerGuide.value = null
  }

  /** Open (or update) the separate guide panel window for a pinned guide */
  function openGuidePanel(apiName: string) {
    const guide = pinnedGuides.value.get(apiName)
    if (!guide) return
    if (!guide.content) loadPinnedGuideContent(apiName)
    guidePanelOpen.value = true
    guidePanelUrl.value = guide.url
    window.steamApi.openGuidePanel({
      title: guide.title,
      url: guide.url,
      content: guide.content ?? ''
    })
  }

  /** Open (or update) the separate guide panel window for any guide (pinned or not) */
  function openBestGuidePanel(guide: Guide) {
    guidePanelOpen.value = true
    guidePanelUrl.value = guide.url
    window.steamApi.openGuidePanel({
      title: guide.title,
      url: guide.url,
      content: guide.content ?? ''
    })
    if (!guide.content) {
      window.steamApi
        .fetchGuideContent(guide.url, '', true)
        .then((res) => {
          if (res.success && res.content && guidePanelUrl.value === guide.url) {
            window.steamApi.updateGuidePanel({
              title: guide.title,
              url: guide.url,
              content: res.content
            })
          }
        })
        .catch(() => { /* silent */ })
    }
  }

  // Push content updates to the panel while it shows this guide (async fetch landing)
  watch(pinnedGuides, () => {
    if (!guidePanelOpen.value || !guidePanelUrl.value) return
    for (const guide of pinnedGuides.value.values()) {
      if (guide.url === guidePanelUrl.value) {
        window.steamApi.updateGuidePanel({
          title: guide.title,
          url: guide.url,
          content: guide.content ?? ''
        })
      }
    }
  })
  window.steamApi.onGuidePanelClosed(() => {
    guidePanelOpen.value = false
    guidePanelUrl.value = null
  })

  /** Load manual progress for the current game */
  async function loadManualProgress() {
    if (!currentGame.value) { manualProgress.value = new Map(); return }
    const data = await window.steamApi.getManualProgress(currentGame.value.appId)
    manualProgress.value = new Map(Object.entries(data))
  }

  /** Start tracking an achievement manually with initial values */
  async function setManualProgressValue(apiName: string, current: number, max: number) {
    if (!currentGame.value) return
    const clamped = Math.max(0, Math.min(current, max))
    await window.steamApi.setManualProgress(currentGame.value.appId, apiName, clamped, max)
    const next = new Map(manualProgress.value)
    next.set(apiName, { current: clamped, max })
    manualProgress.value = next
  }

  /** Increment manual progress by delta (+1 or -1) */
  async function adjustManualProgress(apiName: string, delta: number) {
    const mp = manualProgress.value.get(apiName)
    if (!mp || !currentGame.value) return
    const newVal = Math.max(0, Math.min(mp.current + delta, mp.max))
    await window.steamApi.setManualProgress(currentGame.value.appId, apiName, newVal, mp.max)
    const next = new Map(manualProgress.value)
    next.set(apiName, { current: newVal, max: mp.max })
    manualProgress.value = next
  }

  /** Stop manual tracking for an achievement */
  async function removeManualProgress(apiName: string) {
    if (!currentGame.value) return
    await window.steamApi.deleteManualProgress(currentGame.value.appId, apiName)
    const next = new Map(manualProgress.value)
    next.delete(apiName)
    manualProgress.value = next
  }

  /** Close the guide panel if it isn't sticky (called whenever focus mode turns off) */
  function onFocusModeOff() {
    window.steamApi.notifyFocusExited()
  }

  function toggleFocusMode() {
    if (pinnedAchievements.value.size > 0) {
      const entering = !focusMode.value
      if (entering) {
        // Cierra overlays de la vista general para no tapar el foco
        if (readerGuide.value) readerGuide.value = null
        if (selectedAchievement.value) {
          selectedAchievement.value = null
          guides.value = []
        }
      }
      focusMode.value = !focusMode.value
      if (!focusMode.value) onFocusModeOff()
    }
  }

  const completedPercent = computed(() => {
    if (!achievements.value.length) return 0
    return Math.round((completed.value.length / achievements.value.length) * 100)
  })

  /** Re-fetch achievements for the current game without resetting pins/state */
  async function refreshAchievements() {
    if (!currentGame.value) return
    loadingAchievements.value = true
    try {
      const res = await window.steamApi.getAchievements(currentGame.value.appId)
      if (res.data) achievements.value = res.data
      achievementsError.value = res.error
    } finally {
      loadingAchievements.value = false
    }
  }

   /**
   * Called after the language setting changes: invalidates all
   * language-dependent caches and re-fetches achievements + guides.
   */
  async function applyLanguageChange() {
    _searchGen++
    _guidesCache.clear()
    _fullGuideCache.clear()
    await refreshAchievements()
    const sel = selectedAchievement.value
    if (sel && currentGame.value) {
      // Re-run the guide search in the new language (caches are already cleared)
      const fresh = achievements.value.find((a) => a.apiName === sel.apiName)
      if (fresh) await selectAchievement(fresh)
    }
  }

  /** Manual "check now": re-detect the running game first so we never
   *  refresh a stale appId after switching games */
  async function checkNow() {
    const prev = lastAppId.value
    await doPollCurrentGame()
    // Only refresh achievements if doPoll didn't just do a full reset for a new game
    if (currentGame.value && lastAppId.value === prev) {
      await refreshAchievements()
    }
  }

  function pollCurrentGame() {
    // Skip while the overlay is hidden; visibilitychange polls immediately on show
    if (document.hidden) return
    return doPollCurrentGame()
  }

  async function doPollCurrentGame() {
    const res = await window.steamApi.getCurrentGame()
    const game = res.data
    const newAppId = game?.appId ?? null
    pollCount.value++

    if (newAppId !== lastAppId.value) {
      // Game changed — full reset
      _searchGen++
      _guidesCache.clear()
      _fullGuideCache.clear()
      readerGuide.value = null
      lastAppId.value = newAppId
      currentGame.value = game
      currentGameArt.value = null
      selectedAchievement.value = null
      guides.value = []
      achievements.value = []
      pinnedAchievements.value = new Set()
      pinnedGuides.value = new Map()
      bestGuides.value = []
      const wasFocus = focusMode.value
      focusMode.value = false
      if (wasFocus) onFocusModeOff()
      pollCount.value = 0

      if (game) {
        loadingAchievements.value = true
        try {
          const achRes = await window.steamApi.getAchievements(game.appId)
          achievements.value = achRes.data ?? []
          achievementsError.value = achRes.error
          await loadManualProgress()
          // Restore saved pins + their guides
          const savedPins = await window.steamApi.getPinnedAchievements(game.appId)
          if (savedPins.length) pinnedAchievements.value = new Set(savedPins)
          const savedGuides = await window.steamApi.getPinnedGuides(game.appId)
          const guideEntries = Object.entries(savedGuides)
          if (guideEntries.length) {
            pinnedGuides.value = new Map(guideEntries)
            // Re-fetch full content for each restored guide in the background
            for (const [apiName, guide] of pinnedGuides.value) {
              fetchGuideContent(apiName, guide)
            }
          }
          // Resolve header art (async, doesn't block the list)
          window.steamApi.getGameArt(game.appId).then((url) => {
            if (currentGame.value?.appId === game.appId && url) currentGameArt.value = url
          }).catch(() => { })
          // Load known 100% guides for this game (async, doesn't block the list)
          window.steamApi.getBestGuides(game.appId).then((guides) => {
            if (currentGame.value?.appId === game.appId) bestGuides.value = guides
          }).catch(() => { })
        } finally {
          loadingAchievements.value = false
        }
      }
    } else if (newAppId && pollCount.value % 10 === 0) {
      // Same game, every 10 polls (~5 min at 30s interval) — silently refresh achievements
      const achRes = await window.steamApi.getAchievements(newAppId).catch(() => null)
      if (achRes?.data) achievements.value = achRes.data
    }
  }

  async function selectAchievement(ach: Achievement) {
    const gen = ++_searchGen
    selectedAchievement.value = ach
    if (!currentGame.value) return

    // Return cached results instantly if available
    const cacheKey = `${currentGame.value.appId}:${ach.apiName}`
    if (_guidesCache.has(cacheKey)) {
      guides.value = _guidesCache.get(cacheKey)!
      return
    }

    guides.value = []
    loadingGuides.value = true
    try {
      const result = await window.steamApi.searchWeb(
        currentGame.value.appId,
        currentGame.value.name,
        ach.displayName
      )
      if (gen === _searchGen) {
        guides.value = result
        _guidesCache.set(cacheKey, result)
        // Merge any newly found 100% guides into the game-level cache
        const known = new Set(bestGuides.value.map((g) => g.url))
        const fresh = result.filter((g) => g.is100Percent && !known.has(g.url))
        if (fresh.length) bestGuides.value = [...bestGuides.value, ...fresh]
      }
    } catch {
      if (gen === _searchGen) guides.value = []
    } finally {
      if (gen === _searchGen) loadingGuides.value = false
    }
  }

  function clearSelectedAchievement() {
    selectedAchievement.value = null
    guides.value = []
  }

  function onVisibilityChange() {
    if (!document.hidden) pollCurrentGame()
  }

  function startPolling() {
    pollCurrentGame()
    pollingTimer.value = setInterval(pollCurrentGame, 30000)
    document.addEventListener('visibilitychange', onVisibilityChange)
  }

  function stopPolling() {
    if (pollingTimer.value) {
      clearInterval(pollingTimer.value)
      pollingTimer.value = null
    }
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }

  return {
    currentGame, achievements, selectedAchievement, guides, currentGameArt,
    loadingGame, loadingAchievements, loadingGuides, activeTab,
    searchQuery, sortBy, isOnTop, pinnedAchievements, pinnedGuides, focusMode,
    expandedGuides, manualProgress, achievementsError,
    readerGuide, loadingReader, openGuideReader, closeGuideReader,
    guidePanelOpen, openGuidePanel, bestGuides, openBestGuidePanel,
    loadingGuidesContent, loadPinnedGuideContent,
    pending, completed, pinned, displayed, completedPercent,
    pollCurrentGame, checkNow, refreshAchievements, selectAchievement, clearSelectedAchievement,
    applyLanguageChange, togglePinAchievement, togglePinnedGuide, toggleGuideExpand, toggleFocusMode,
    setManualProgressValue, adjustManualProgress, removeManualProgress,
    startPolling, stopPolling
  }
})
