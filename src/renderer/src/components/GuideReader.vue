<script setup lang="ts">
import { useAppStore } from "../stores/app";
import Icon from "./Icon.vue";
import GuideContent from "./GuideContent.vue";
import { t } from "../i18n";

const store = useAppStore();

function openExternal() {
  if (store.readerGuide) window.steamApi.openUrl(store.readerGuide.url);
}
</script>

<template>
  <Teleport to="body">
    <div v-if="store.readerGuide" class="reader-overlay" @click.self="store.closeGuideReader()">
      <div class="reader-modal">
        <div class="reader-header">
          <span class="reader-title">{{ store.readerGuide.title }}</span>
          <div class="reader-header-actions">
            <button class="reader-ext-btn" :title="t('readerOpenBrowser')" @click="openExternal"><Icon name="external" :size="13" /></button>
            <button class="reader-close" :title="t('readerClose')" @click="store.closeGuideReader()"><Icon name="close" :size="12" /></button>
          </div>
        </div>
        <div class="reader-body">
          <div v-if="store.loadingReader && !store.readerGuide.content && !store.readerGuide.error" class="reader-loading">
            <div class="spinner"></div>
            <span>{{ t("readerLoading") }}</span>
          </div>
          <div v-else-if="store.readerGuide.error" class="reader-error">
            <p class="reader-error-title">{{ t("readerLoadFailed") }}</p>
            <p v-if="store.readerGuide.error === 'blocked'" class="reader-error-desc">{{ t("readerLoadFailedBlocked") }}</p>
            <p v-else class="reader-error-desc">{{ t("readerLoadFailedHint").replace("{error}", store.readerGuide.error) }}</p>
            <button class="reader-open-ext" @click="openExternal">{{ t("readerOpenBrowserFooter") }}</button>
          </div>
          <GuideContent
            v-else
            :content="store.readerGuide.content"
          />
        </div>
        <div class="reader-footer">
          <button class="reader-open-ext" @click="openExternal">{{ t("readerOpenBrowserFooter") }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.reader-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: stretch;
  justify-content: center;
  z-index: 1100;
  padding: 14px;
}
.reader-modal {
  background: #13151e;
  border: 1px solid var(--border);
  border-radius: 10px;
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55);
}
.reader-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.reader-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.reader-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.reader-close,
.reader-ext-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 13px;
  padding: 3px 6px;
  border-radius: 4px;
  transition: all 0.15s;
}
.reader-close:hover,
.reader-ext-btn:hover {
  color: var(--text);
  background: var(--surface-hover);
}
.reader-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.reader-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 13px;
}
.reader-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  padding: 16px;
}
.reader-error-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.reader-error-desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
}
.reader-footer {
  padding: 8px 12px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
}
.reader-open-ext {
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: 5px;
  color: var(--accent);
  cursor: pointer;
  font-size: 11px;
  padding: 4px 10px;
  transition: all 0.15s;
}
.reader-open-ext:hover {
  background: rgba(129, 140, 248, 0.18);
}
</style>
