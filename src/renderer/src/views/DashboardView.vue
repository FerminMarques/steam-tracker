<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { useAppStore } from "../stores/app";
import AchievementCard from "../components/AchievementCard.vue";
import GuidesPanel from "../components/GuidesPanel.vue";
import Icon from "../components/Icon.vue";
import { t } from "../i18n";

const store = useAppStore();
// Avoids vue-tsc narrowing `selectedAchievement` to null inside the v-else branch
const selectedApiName = computed(() => store.selectedAchievement?.apiName ?? "");

onMounted(() => store.startPolling());
onUnmounted(() => store.stopPolling());
</script>

<template>
  <div class="dashboard">
    <!-- Game header -->
    <div class="game-header">
      <div v-if="store.currentGame" class="game-info">
        <img
          v-if="store.currentGameArt"
          :key="store.currentGameArt"
          :src="store.currentGameArt"
          :alt="store.currentGame.name"
          class="game-art"
        />
        <div v-else class="game-art-placeholder"></div>
        <div class="game-text">
          <div class="game-name">{{ store.currentGame.name }}</div>
          <div class="game-progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: store.completedPercent + '%' }"
              ></div>
            </div>
            <span class="progress-label">
              {{ store.completed.length }}/{{ store.achievements.length }} ({{
                store.completedPercent
              }}%)
            </span>
          </div>
        </div>
        <button
          class="refresh-btn"
          :title="t('dashRefreshAchievements')"
          @click="store.refreshAchievements()"
        >
          <Icon name="refresh" :size="13" />
        </button>
      </div>
      <div v-else class="no-game">
        <div class="no-game-icon"><Icon name="gamepad" :size="26" /></div>
        <div class="no-game-text">
          <div class="no-game-title">{{ t("dashNoGame") }}</div>
          <div class="no-game-sub">{{ t("dashLaunchGame") }}</div>
        </div>
        <button
          class="refresh-btn"
          :title="t('dashCheckNow')"
          @click="store.pollCurrentGame()"
        >
          <Icon name="refresh" :size="13" />
        </button>
      </div>
      <div class="borderless-tip">
        {{ t("dashBorderlessTip1") }}
        <strong>Borderless Windowed</strong>
        {{ t("dashBorderlessTip2") }}
      </div>
    </div>

    <!-- Content area -->
    <div class="content-area">
      <!-- Error banner (Steam API failures) -->
      <div v-if="store.achievementsError" class="error-banner">
        ⚠ {{ store.achievementsError }}
      </div>

      <!-- Guides panel (when achievement selected) -->
      <GuidesPanel v-if="store.selectedAchievement" />

      <!-- Achievements list -->
      <template v-else>
        <!-- Loading state -->
        <div v-if="store.loadingAchievements" class="center-state">
          <div class="spinner"></div>
          <span>{{ t("dashLoading") }}</span>
        </div>

        <!-- No game / no achievements -->
        <div v-else-if="!store.currentGame" class="center-state">
          <div class="idle-icon"><Icon name="clock" :size="30" /></div>
          <p>{{ t("dashWaiting") }}</p>
          <p class="idle-sub">{{ t("dashChecksEvery") }}</p>
        </div>

        <div
          v-else-if="!store.achievements.length && !store.loadingAchievements"
          class="center-state"
        >
          <div class="idle-icon"><Icon name="trophy" :size="30" /></div>
          <p>{{ t("dashNoAchievements") }}</p>
        </div>

        <!-- Achievements list with tabs -->
        <template v-else>
          <div class="tabs">
            <button
              v-if="store.pinnedAchievements.size > 0"
              class="tab tab-pinned"
              :class="{ active: store.activeTab === 'pinned' }"
              @click="store.activeTab = 'pinned'"
            >
              {{ t("tabPinned") }}
              <span class="tab-count">{{ store.pinnedAchievements.size }}</span>
            </button>
            <button
              class="tab"
              :class="{ active: store.activeTab === 'pending' }"
              @click="store.activeTab = 'pending'"
            >
              {{ t("tabPending") }}
              <span class="tab-count">{{ store.pending.length }}</span>
            </button>
            <button
              class="tab"
              :class="{ active: store.activeTab === 'completed' }"
              @click="store.activeTab = 'completed'"
            >
              {{ t("tabCompleted") }}
              <span class="tab-count">{{ store.completed.length }}</span>
            </button>
            <button
              class="tab"
              :class="{ active: store.activeTab === 'all' }"
              @click="store.activeTab = 'all'"
            >
              {{ t("tabAll") }}
              <span class="tab-count">{{ store.achievements.length }}</span>
            </button>
          </div>

          <div v-if="!store.displayed.length" class="center-state">
            <div class="idle-icon"><Icon name="star" :size="30" /></div>
            <p>{{ t("dashAllCompleted") }}</p>
          </div>

          <!-- Search + Sort bar -->
          <div class="search-bar">
            <span class="search-glyph"><Icon name="search" :size="12" /></span>
            <input
              v-model="store.searchQuery"
              class="search-input"
              :placeholder="t('dashSearchPlaceholder')"
              type="text"
            />
            <select v-model="store.sortBy" class="sort-select">
              <option value="default">{{ t("sortDefault") }}</option>
              <option value="rarity">{{ t("sortRarity") }}</option>
              <option value="name">A → Z</option>
            </select>
          </div>

          <div
            v-if="store.displayed.length === 0 && store.searchQuery"
            class="center-state"
          >
            <p>{{ t("dashNoMatch", { query: store.searchQuery }) }}</p>
          </div>

          <div v-else class="ach-list">
            <AchievementCard
              v-for="(ach, i) in store.displayed"
              :key="ach.apiName"
              :achievement="ach"
              :selected="ach.apiName === selectedApiName"
              :style="{ '--stagger': Math.min(i, 12) }"
              @select="store.selectAchievement($event)"
            />
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.game-header {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  background: rgba(19, 22, 32, 0.75);
}
.game-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.game-art {
  width: 92px;
  height: 34px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}
.game-art-placeholder {
  width: 92px;
  height: 34px;
  border-radius: 4px;
  flex-shrink: 0;
  background: var(--surface);
  animation: pulse-hk-placeholder 1.2s ease-in-out infinite alternate;
}
@keyframes pulse-hk-placeholder {
  from { opacity: 0.5; }
  to { opacity: 1; }
}
.game-text {
  flex: 1;
  min-width: 0;
}
.game-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.game-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 5px;
}
.progress-bar {
  flex: 1;
  height: 3px;
  background: var(--surface);
  border-radius: 2px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.5s ease;
}
.progress-label {
  font-size: 10px;
  color: var(--text-secondary);
  white-space: nowrap;
}
.no-game {
  display: flex;
  align-items: center;
  gap: 12px;
}
.no-game-icon {
  font-size: 24px;
  opacity: 0.3;
}
.no-game-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}
.no-game-sub {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}
.borderless-tip {
  font-size: 10px;
  color: var(--text-muted);
  padding: 8px 14px;
  margin-top: 6px;
  line-height: 1.4;
}
.borderless-tip strong {
  color: var(--accent);
  font-weight: 600;
}
.refresh-btn {
  margin-left: auto;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px 7px;
  border-radius: 2px;
  line-height: 0;
  transition: all 0.15s;
  flex-shrink: 0;
}
.refresh-btn:hover {
  border-color: var(--accent-border);
  color: var(--accent);
  transform: rotate(45deg);
}
.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.error-banner {
  margin: 8px 10px 0;
  padding: 8px 12px;
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.25);
  border-radius: 6px;
  color: var(--danger, #f87171);
  font-size: 11px;
  line-height: 1.4;
  flex-shrink: 0;
}
.center-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 20px;
  color: var(--text-secondary);
  font-size: 13px;
  text-align: center;
  flex: 1;
}
.idle-icon,
.no-game-icon {
  font-size: 32px;
  opacity: 0.3;
}
.idle-sub {
  font-size: 11px;
  color: var(--text-muted);
  margin: 0;
}
.tabs {
  display: flex;
  gap: 2px;
  padding: 8px 10px 0;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border);
}
.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 7px 10px;
  border-radius: 2px 2px 0 0;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}
.tab:hover {
  color: var(--text);
}
.tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  background: var(--accent-soft);
}
.tab-count {
  background: var(--surface);
  border-radius: 10px;
  font-size: 10px;
  padding: 1px 6px;
  color: var(--text-secondary);
}
.tab.active .tab-count {
  background: var(--accent-soft);
  color: var(--accent);
}
.idle-icon,
.no-game-icon {
  opacity: 0.35;
  color: var(--accent);
}
.search-bar {
  display: flex;
  gap: 6px;
  padding: 8px 10px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border);
}
.search-glyph {
  display: inline-flex;
  align-items: center;
  color: var(--text-muted);
}
.search-input {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text);
  font-size: 12px;
  padding: 5px 8px;
  outline: none;
  transition: border-color 0.15s;
}
.search-input::placeholder {
  color: var(--text-muted);
}
.search-input:focus {
  border-color: var(--accent-border);
}
.sort-select {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 11px;
  padding: 4px 6px;
  cursor: pointer;
  outline: none;
}
.sort-select:focus {
  border-color: var(--accent-border);
}
.tab-pinned {
  color: var(--warning);
}
.tab-pinned.active {
  color: var(--warning);
  border-bottom-color: var(--warning);
  background: rgba(251, 191, 36, 0.06);
}
.tab-pinned.active .tab-count {
  background: rgba(251, 191, 36, 0.12);
  color: var(--warning);
}
.ach-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
