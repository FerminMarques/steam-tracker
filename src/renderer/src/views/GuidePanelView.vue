<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import Icon from "../components/Icon.vue";
import GuideContent from "../components/GuideContent.vue";
import { t, setUiLanguage } from "../i18n";

const title = ref("");
const url = ref("");
const content = ref("");
const sticky = ref(true);
let removeDataListener: (() => void) | null = null;

function applyData(d: { title: string; url: string; content: string }) {
  title.value = d.title;
  url.value = d.url;
  if (d.content) content.value = d.content;
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
  const cfg = await window.steamApi.getConfig();
  setUiLanguage(cfg.language);
  if (cfg.theme === "violet") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = cfg.theme;
});

onUnmounted(() => {
  removeDataListener?.();
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
    <div class="gp-body">
      <div v-if="!content" class="gp-loading">
        <div class="spinner"></div>
        <span>{{ t("readerLoading") }}</span>
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
</style>
