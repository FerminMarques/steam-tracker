<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import Icon from "../components/Icon.vue";
import GuideContent from "../components/GuideContent.vue";
import { t, setUiLanguage } from "../i18n";

const title = ref("");
const url = ref("");
const content = ref("");
const loadError = ref<string | null>(null);
const sticky = ref(true);
const passThrough = ref(false);
const passKeyLabel = ref("Ctrl+Shift+C");
let removeDataListener: (() => void) | null = null;
let removePassListener: (() => void) | null = null;

function applyData(d: { title: string; url: string; content: string; error?: string | null }) {
  const isNewGuide = d.url !== url.value;
  title.value = d.title;
  url.value = d.url;
  // A new guide resets state; an error update stops the spinner with a notice (no retry loop)
  if (isNewGuide) {
    content.value = "";
    loadError.value = null;
  }
  if (d.error) loadError.value = d.error;
  else if (d.content) {
    content.value = d.content;
    loadError.value = null;
  }
}

function openExternal() {
  if (url.value) window.steamApi.openUrl(url.value);
}

function toggleSticky() {
  sticky.value = !sticky.value;
  window.steamApi.setGuidePanelSticky(sticky.value);
}

function closePanel() {
  window.steamApi.closeGuidePanel();
}

onMounted(async () => {
  // Register the push listener FIRST — main may send data at any moment
  removeDataListener = window.steamApi.onGuidePanelData(applyData);
  // Also pull initial data: the did-finish-load push may fire before this listener exists
  const initial = await window.steamApi.getGuidePanelData();
  if (initial) applyData(initial);
  sticky.value = await window.steamApi.getGuidePanelSticky();
  try {
    passThrough.value = await window.steamApi.getClickThrough();
    const raw = await window.steamApi.getClickThroughHotkey();
    passKeyLabel.value = raw.replace("CommandOrControl", "Ctrl").replace("Control", "Ctrl");
  } catch { /* defaults */ }
  removePassListener = window.steamApi.onClickThroughChanged((val) => {
    passThrough.value = val;
  });
  const cfg = await window.steamApi.getConfig();
  setUiLanguage(cfg.language);
  if (cfg.theme === "violet") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = cfg.theme;
});

onUnmounted(() => {
  removeDataListener?.();
  removePassListener?.();
});
</script>

<template>
  <div class="gp-view">
    <div class="gp-header">
      <span class="gp-grip">⠿</span>
      <span class="gp-title" :title="title">{{ title || t("guidesTitle") }}</span>
      <button
        class="gp-btn"
        :class="{ active: sticky }"
        :title="t('panelKeepOpen')"
        @click="toggleSticky"
      >
        <Icon name="pin" :size="12" />
      </button>
      <button class="gp-btn" :title="t('readerOpenBrowser')" @click="openExternal">
        <Icon name="external" :size="12" />
      </button>
      <button class="gp-btn" :title="t('readerClose')" @click="closePanel">
        <Icon name="close" :size="12" />
      </button>
    </div>
    <div v-if="passThrough" class="gp-passthrough">
      <span>{{ t("clickThroughBanner").replace("{key}", passKeyLabel) }}</span>
    </div>
    <div class="gp-body">
      <div v-if="!content && !loadError" class="gp-loading">
        <div class="spinner"></div>
        <span>{{ t("readerLoading") }}</span>
      </div>
      <div v-else-if="loadError" class="gp-error">
        <p class="gp-error-title">{{ t("readerLoadFailed") }}</p>
        <p v-if="loadError === 'blocked'" class="gp-error-desc">{{ t("readerLoadFailedBlocked") }}</p>
        <p v-else class="gp-error-desc">{{ t("readerLoadFailedHint").replace("{error}", loadError) }}</p>
        <button class="gp-open-ext" @click="openExternal">{{ t("readerOpenBrowserFooter") }}</button>
      </div>
      <GuideContent v-else :content="content" />
    </div>
  </div>
</template>

<style scoped>
.gp-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #13151e;
  overflow: hidden;
}
.gp-passthrough {
  display: flex;
  justify-content: center;
  padding: 3px 8px;
  background: rgba(129, 140, 248, 0.1);
  border-bottom: 1px solid var(--accent-border);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.4px;
  color: var(--accent);
  pointer-events: none;
  user-select: none;
  flex-shrink: 0;
}
.gp-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  cursor: move;
  -webkit-app-region: drag;
  user-select: none;
}
.gp-grip {
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: -2px;
}
.gp-title {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gp-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 4px;
  transition: all 0.15s;
  -webkit-app-region: no-drag;
  flex-shrink: 0;
}
.gp-btn:hover {
  color: var(--text);
  background: var(--surface-hover);
}
.gp-btn.active {
  color: var(--accent);
}
.gp-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 14px;
}
.gp-loading {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 12px;
}
.gp-error {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  padding: 16px;
}
.gp-error-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.gp-error-desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
}
.gp-open-ext {
  margin-top: 4px;
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: 5px;
  color: var(--accent);
  cursor: pointer;
  font-size: 11px;
  padding: 5px 12px;
}
</style>
