<script setup lang="ts">
import { computed } from "vue";
import { useAppStore } from "../stores/app";
import type { Guide } from "../stores/app";
import Icon from "./Icon.vue";
import { t } from "../i18n";

const store = useAppStore();

/** 100% guides always first, preserving relevance order within each group */
const sortedGuides = computed<Guide[]>(() => [
  ...store.guides.filter((g) => g.is100Percent),
  ...store.guides.filter((g) => !g.is100Percent),
]);

/** First 100% guide found for this game (pinned or not) */
const bestGuide100 = computed<Guide | null>(
  () => store.guides.find((g) => g.is100Percent) ?? null,
);

function openGuide(url: string) {
  window.steamApi.openUrl(url);
}

function onGuidePinClick(e: MouseEvent, guide: Guide) {
  e.stopPropagation();
  if (!store.selectedAchievement) return;
  store.togglePinnedGuide(store.selectedAchievement.apiName, guide);
}

function isGuidePinned(guide: Guide): boolean {
  if (!store.selectedAchievement) return false;
  return (
    store.pinnedGuides.get(store.selectedAchievement.apiName)?.id === guide.id
  );
}

/** Only show the no-progress warning for achievements that look like they track numeric progress */
function looksLikeProgress(desc: string): boolean {
  if (!desc) return false;
  return /\b\d{2,}\b/.test(desc);
}
</script>

<template>
  <div class="guides-panel">
    <div class="guides-header">
      <button class="back-btn" @click="store.clearSelectedAchievement()">
        <Icon name="arrow-left" :size="12" />
        {{ t("guidesBack") }}
      </button>
      <div class="guides-title">
        <span class="ach-name-label">{{
          store.selectedAchievement?.displayName
        }}</span>
        <span class="guides-subtitle">{{ t("guidesTitle") }}</span>
      </div>
      <button
        v-if="bestGuide100"
        class="btn-100"
        :title="`${t('guidesOpen100')}: ${bestGuide100.title}`"
        @click="store.openGuideReader(bestGuide100)"
      >
        {{ t("guidesBadge100") }}
      </button>
    </div>

    <div
      v-if="store.selectedAchievement && !store.selectedAchievement.achieved && store.selectedAchievement.currentProgress === null && looksLikeProgress(store.selectedAchievement.description)"
      class="no-progress-note"
    >
      {{ t("guidesNoProgressNote") }}
    </div>

    <div v-if="store.loadingGuides" class="guides-loading">
      <div class="spinner"></div>
      <span>{{ t("guidesSearching") }}</span>
    </div>

    <div v-else-if="!store.guides.length" class="guides-empty">
      <div class="empty-icon"><Icon name="book" :size="28" /></div>
      <p>{{ t("guidesNoneFound") }}</p>
      <a
        :href="`https://steamcommunity.com/app/${store.currentGame?.appId}/guides/`"
        target="_blank"
        class="browse-link"
        @click.prevent="
          openGuide(
            `https://steamcommunity.com/app/${store.currentGame?.appId}/guides/`,
          )
        "
      >
        {{ t("guidesBrowseAll") }}
      </a>
    </div>

    <div v-else class="guides-list">
      <div
        v-for="guide in sortedGuides"
        :key="guide.id"
        class="guide-card"
        :class="{
          'guide-card--full': guide.is100Percent,
          'guide-card--pinned': isGuidePinned(guide),
        }"
        @click="store.openGuideReader(guide)"
      >
        <div class="guide-title-row">
          <span v-if="guide.is100Percent" class="badge-100">{{ t("guidesBadge100") }}</span>
          <span v-if="isGuidePinned(guide)" class="badge-guide-pin"
            >{{ t("guidesPinnedBadge") }}</span
          >
          <span class="guide-title">{{ guide.title }}</span>
        </div>
        <div v-if="guide.shortDescription" class="guide-desc">
          {{ guide.shortDescription }}
        </div>
        <div v-if="guide.is100Percent" class="guide-ach-hint">
          {{ t("guidesSearchFor") }}
          <strong>"{{ store.selectedAchievement?.displayName }}"</strong>
          {{ t("guidesInThisGuide") }}
        </div>
        <div class="guide-meta">
          <span class="guide-votes">{{ guide.domain }}</span>
          <div class="guide-actions">
            <button
              class="guide-pin-btn"
              :class="{ active: isGuidePinned(guide) }"
              :title="
                isGuidePinned(guide)
                  ? t('guidesUnpinGuide')
                  : t('guidesPinGuide')
              "
              @click.stop="onGuidePinClick($event, guide)"
            >
              <Icon :name="isGuidePinned(guide) ? 'check' : 'book'" :size="13" />
            </button>
            <span class="guide-link">{{ t("guidesRead") }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.guides-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.guides-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.back-btn {
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  color: var(--accent);
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  transition: all 0.15s;
}
.back-btn:hover {
  background: rgba(129, 140, 248, 0.18);
}
.guides-title {
  min-width: 0;
}
.ach-name-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.guides-subtitle {
  font-size: 10px;
  color: var(--text-secondary);
  opacity: 0.7;
}
.btn-100 {
  margin-left: auto;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.3);
  color: var(--warning);
  cursor: pointer;
  font-size: 10px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s;
}
.btn-100:hover {
  background: rgba(251, 191, 36, 0.22);
  border-color: rgba(251, 191, 36, 0.5);
}
.no-progress-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 6px 12px 0;
  padding: 8px 10px;
  background: rgba(251, 191, 36, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.12);
  border-radius: var(--radius);
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.5;
}
.guides-loading,
.guides-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  color: var(--text-secondary);
  font-size: 13px;
  text-align: center;
}
.empty-icon {
  font-size: 32px;
  opacity: 0.4;
}
.browse-link {
  color: var(--accent);
  text-decoration: none;
  font-size: 12px;
  cursor: pointer;
}
.browse-link:hover {
  text-decoration: underline;
}
.guides-list {
  flex: 1;
  overflow-y: auto;
  margin: 12px 0;
  padding: 0 10px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.guide-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.guide-card--full {
  border-color: rgba(251, 191, 36, 0.2);
  background: rgba(251, 191, 36, 0.03);
}
.guide-card--full:hover {
  background: rgba(251, 191, 36, 0.07);
  border-color: rgba(251, 191, 36, 0.35);
}
.guide-card:not(.guide-card--full):not(.guide-card--pinned):hover {
  background: var(--surface-hover);
  border-color: var(--accent-border);
}
.guide-card--pinned {
  border-color: rgba(129, 140, 248, 0.35) !important;
  background: var(--accent-soft) !important;
}
.guide-card--pinned:hover {
  background: rgba(129, 140, 248, 0.1) !important;
}
.guide-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}
.badge-100 {
  font-size: 10px;
  font-weight: 700;
  color: var(--warning);
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.25);
  border-radius: 3px;
  padding: 1px 5px;
  white-space: nowrap;
  flex-shrink: 0;
}
.badge-guide-pin {
  font-size: 10px;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: 3px;
  padding: 1px 5px;
  white-space: nowrap;
  flex-shrink: 0;
}
.guide-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.guide-ach-hint {
  font-size: 11px;
  color: var(--warning);
  opacity: 0.85;
  margin-bottom: 6px;
  padding: 4px 8px;
  background: rgba(251, 191, 36, 0.05);
  border-radius: 3px;
}
.guide-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.guide-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.guide-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.guide-pin-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.15s;
}
.guide-pin-btn:hover {
  color: var(--accent);
  border-color: var(--accent-border);
  background: var(--surface-hover);
}
.guide-pin-btn.active {
  color: var(--accent);
  border-color: var(--accent-border);
  background: var(--accent-soft);
}
.guide-votes {
  font-size: 11px;
  color: var(--text-secondary);
}
.guide-link {
  font-size: 11px;
  color: var(--accent);
  opacity: 0.6;
}
.guide-ext-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 0;
  opacity: 0.45;
  transition: opacity 0.15s, transform 0.1s;
  line-height: 1;
}
.guide-ext-btn:hover {
  opacity: 0.9;
}
</style>
