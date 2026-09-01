<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useAppStore } from "../stores/app";
import type { Achievement } from "../stores/app";
import Icon from "../components/Icon.vue";
import { t } from "../i18n";

const store = useAppStore();
const progressKeys = ref({ down: '9', up: '0' });
let removeProgressListener: (() => void) | null = null;

// Measure real content height so the window always fits the pinned rows
const viewRef = ref<HTMLElement | null>(null);
const listRef = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;
let resizeTimer: ReturnType<typeof setTimeout> | null = null;

/** Desired full-content height: chrome around the list + the list's full scroll extent.
 *  Measuring scrollHeight (not offsetHeight) avoids the +2px feedback loop that
 *  revealed content bit by bit while the window grew. */
function requestResize() {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const view = viewRef.value;
    const list = listRef.value;
    if (!view || !list) return;
    const h = view.offsetHeight - list.clientHeight + list.scrollHeight;
    if (h > 0) window.steamApi.resizeFocus(true, store.pinned.length, h);
  }, 60);
}

onMounted(async () => {
  const keys = await window.steamApi.getProgressKeys();
  progressKeys.value = keys;
  removeProgressListener = window.steamApi.onProgressAdjust((delta: number) => {
    // Find the first pinned achievement with manual progress and adjust it
    for (const ach of store.pinned) {
      if (store.manualProgress.has(ach.apiName)) {
        store.adjustManualProgress(ach.apiName, delta);
        return;
      }
    }
  });

  resizeObserver = new ResizeObserver(() => requestResize());
  if (viewRef.value) resizeObserver.observe(viewRef.value);
});

onUnmounted(() => {
  removeProgressListener?.();
  resizeObserver?.disconnect();
  if (resizeTimer) clearTimeout(resizeTimer);
});

function handleRowClick(ach: Achievement) {
  const pinnedGuide = store.pinnedGuides.get(ach.apiName);
  if (!pinnedGuide) {
    store.focusMode = false;
    store.selectAchievement(ach);
    return;
  }
  // Open the separate, resizable guide panel window
  store.openGuidePanel(ach.apiName);
}

function rowTitle(ach: Achievement): string {
  const guide = store.pinnedGuides.get(ach.apiName);
  return guide ? t("focusHasGuide", { title: guide.title }) : "";
}

function getIcon(ach: Achievement): string {
  return ach.achieved ? ach.icon : ach.iconGray;
}

function getMp(ach: Achievement) {
  return store.manualProgress.get(ach.apiName);
}

function hasAutoProgress(ach: Achievement) {
  return !ach.achieved && ach.currentProgress !== null && ach.maxProgress;
}
</script>

<template>
  <div ref="viewRef" class="focus-view">
    <!-- Drag handle -->
    <div class="focus-handle">
      <span class="handle-grip">⠿</span>
      <span class="handle-label">{{ t("focusTitle") }}</span>
      <button
        v-if="store.bestGuides.length"
        class="handle-btn-guide"
        :title="`${t('guidesOpen100')}: ${store.bestGuides[0].title}`"
        @click="store.openBestGuidePanel(store.bestGuides[0])"
      >
        <Icon name="book" :size="11" />
      </button>
    </div>

    <!-- Achievement rows -->
    <div ref="listRef" class="focus-list">
      <div
        v-for="ach in store.pinned"
        :key="ach.apiName"
        class="focus-item"
      >
        <div
          class="focus-row"
          :class="{ 'has-guide': !!store.pinnedGuides.get(ach.apiName) }"
          :title="rowTitle(ach)"
          @click="handleRowClick(ach)"
        >
          <img
            v-if="getIcon(ach)"
            :src="getIcon(ach)"
            :alt="ach.displayName"
            class="focus-icon"
          />

          <div class="focus-info">
            <div class="focus-name" :class="{ achieved: ach.achieved }">
              {{ ach.displayName }}
            </div>
            <div class="focus-desc">{{ ach.description || t("achHidden") }}</div>
            <!-- Auto progress -->
            <div v-if="hasAutoProgress(ach)" class="focus-progress">
              <div class="focus-progress-track">
                <div
                  class="focus-progress-fill"
                  :style="{ width: Math.min(100, (ach.currentProgress! / ach.maxProgress!) * 100) + '%' }"
                ></div>
              </div>
              <span class="focus-progress-val">{{ ach.currentProgress }}/{{ ach.maxProgress }}</span>
            </div>
            <!-- Manual progress with −/+ -->
            <div v-else-if="getMp(ach)" class="focus-progress">
              <div class="focus-progress-track">
                <div
                  class="focus-progress-fill manual-fill"
                  :style="{ width: Math.min(100, (getMp(ach)!.current / getMp(ach)!.max) * 100) + '%' }"
                ></div>
              </div>
              <span class="focus-progress-val manual-val">
                <span class="mp-symbol" :title="t('focusKey', { key: progressKeys.down })">−</span>
                {{ getMp(ach)!.current }}/{{ getMp(ach)!.max }}
                <span class="mp-symbol" :title="t('focusKey', { key: progressKeys.up })">+</span>
              </span>
            </div>
          </div>

          <button
            class="focus-unpin"
            :title="t('focusUnpin')"
            @click.stop="store.togglePinAchievement(ach.apiName)"
          >
            ✕
          </button>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.focus-view {
  display: flex;
  flex-direction: column;
  background: var(--bg, #0c0e14);
  max-height: 100vh;
  overflow: hidden;
}
.focus-handle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  cursor: move;
  -webkit-app-region: drag;
  user-select: none;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.handle-grip {
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: -2px;
}
.handle-label {
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  flex: 1;
}
.handle-btn-guide {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  width: 18px;
  height: 18px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;
  transition: color 0.15s;
  -webkit-app-region: no-drag;
}
.handle-btn-guide:hover {
  color: var(--text);
}
.focus-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 4px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.focus-item {
  display: flex;
  flex-direction: column;
}
.focus-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  transition: all 0.15s;
  -webkit-app-region: no-drag;
}
.focus-row:hover {
  background: var(--surface-hover);
  border-color: var(--accent-border);
  transform: translateX(2px);
}
.focus-row.has-guide {
  background: var(--accent-soft);
  border-color: rgba(129, 140, 248, 0.12);
}
.focus-row.has-guide:hover {
  background: rgba(129, 140, 248, 0.1);
  border-color: rgba(129, 140, 248, 0.25);
}
.focus-icon {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}
.focus-info {
  flex: 1;
  min-width: 0;
}
.focus-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.focus-name.achieved {
  color: var(--accent);
}
.focus-desc {
  font-size: 10px;
  color: var(--text-secondary);
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.focus-progress {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
}
.focus-progress-track {
  flex: 1;
  height: 2px;
  background: var(--surface);
  border-radius: 1px;
  overflow: hidden;
}
.focus-progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 1px;
}
.focus-progress-val {
  font-size: 9px;
  color: var(--accent);
  font-weight: 700;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 5px;
}
.manual-fill {
  background: var(--warning);
}
.manual-val {
  color: var(--warning);
}
.mp-symbol {
  font-size: 10px;
  color: var(--text-muted);
  cursor: default;
  font-weight: 700;
}
.focus-unpin {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 11px;
  padding: 2px 4px;
  border-radius: 3px;
  flex-shrink: 0;
  transition: all 0.15s;
  opacity: 0;
}
.focus-row:hover .focus-unpin {
  opacity: 1;
  color: var(--text-secondary);
}
.focus-unpin:hover {
  background: rgba(248, 113, 113, 0.12);
  color: var(--danger) !important;
}
</style>
