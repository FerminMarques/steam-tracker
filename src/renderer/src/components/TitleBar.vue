<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useAppStore } from "../stores/app";
import Icon from "./Icon.vue";
import { t } from "../i18n";

const emit = defineEmits<{ openSettings: [] }>();
const store = useAppStore();

const pinned = ref(true); // true by default (starts pinned on top)
let removeTopListener: (() => void) | null = null;

onMounted(async () => {
  removeTopListener = window.steamApi.onTopChanged((val) => {
    pinned.value = val;
  });
  pinned.value = await window.steamApi.isOnTop();
});

onUnmounted(() => {
  removeTopListener?.();
});

const minimize = () => window.steamApi.minimize();
const close = () => window.steamApi.close();
const toggleTop = () => window.steamApi.toggleTop();
</script>

<template>
  <div class="titlebar">
    <div class="titlebar-drag">
      <span class="app-icon"></span>
      <span class="app-title">ACHIVIO</span>
      <button class="tb-btn tb-settings" :title="t('titlebarSettings')" @click="emit('openSettings')">
        <Icon name="sliders" :size="13" />
      </button>
    </div>
    <div class="titlebar-actions">
      <button
        v-if="store.pinnedAchievements.size > 0"
        class="tb-btn tb-focus"
        :class="{ active: store.focusMode }"
        :title="
          store.focusMode
            ? t('titlebarExitFocus')
            : t('titlebarFocusMode')
        "
        @click="store.toggleFocusMode()"
      >
        <Icon name="target" :size="14" />
      </button>
      <button
        class="tb-btn tb-pin"
        :class="{ pinned }"
        :title="
          pinned
            ? t('titlebarPinnedOn')
            : t('titlebarPinnedOff')
        "
        @click="toggleTop"
      >
        <span class="pin-dot"></span>
      </button>
      <button class="tb-btn" :title="t('titlebarMinimize')" @click="minimize"><Icon name="minus" :size="13" /></button>
      <button class="tb-btn tb-close" :title="t('titlebarClose')" @click="close"><Icon name="close" :size="12" /></button>
    </div>
  </div>
</template>

<style scoped>
.titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  background: rgba(11, 13, 18, 0.96);
  border-bottom: 1px solid var(--accent-border);
  -webkit-app-region: drag;
  user-select: none;
  flex-shrink: 0;
}
.titlebar-drag {
  display: flex;
  align-items: center;
  gap: 8px;
}
.app-icon {
  width: 7px;
  height: 7px;
  background: var(--accent);
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
}
.app-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: 2.5px;
}
.tb-settings {
  font-size: 12px;
  -webkit-app-region: no-drag;
  opacity: 0.4;
}
.tb-settings:hover {
  opacity: 1;
}
.titlebar-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  -webkit-app-region: no-drag;
}
.tb-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 3px 7px;
  border-radius: 2px;
  font-size: 13px;
  transition: all 0.15s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.tb-btn:hover {
  background: var(--surface-hover);
  color: var(--text);
}
.tb-pin {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border: 1px solid transparent;
}
.pin-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  transition: all 0.2s;
}
.tb-pin:not(.pinned) {
  border-color: var(--border);
}
.tb-pin:not(.pinned):hover {
  background: var(--surface-hover);
  border-color: rgba(255, 255, 255, 0.1);
}
.tb-pin:not(.pinned) .pin-dot {
  background: var(--text-muted);
}
.tb-pin.pinned {
  background: var(--accent-soft);
  border-color: var(--accent-border);
}
.tb-pin.pinned:hover {
  background: rgba(129, 140, 248, 0.18);
}
.tb-pin.pinned .pin-dot {
  background: var(--accent);
  box-shadow: 0 0 6px rgba(129, 140, 248, 0.5);
}
.tb-close:hover {
  background: rgba(248, 113, 113, 0.4);
  color: #fff;
}
.tb-focus {
  font-size: 12px;
  padding: 2px 6px;
  border: 1px solid transparent;
}
.tb-focus:not(.active) {
  border-color: rgba(251, 191, 36, 0.2);
  color: var(--warning);
  opacity: 0.5;
}
.tb-focus:not(.active):hover {
  opacity: 1;
  background: rgba(251, 191, 36, 0.08);
  border-color: rgba(251, 191, 36, 0.3);
}
.tb-focus.active {
  color: var(--warning);
  background: rgba(251, 191, 36, 0.12);
  border-color: rgba(251, 191, 36, 0.35);
}
.tb-focus.active:hover {
  background: rgba(251, 191, 36, 0.2);
}
</style>
