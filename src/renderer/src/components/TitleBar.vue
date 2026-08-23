<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useAppStore } from "../stores/app";

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
      <span class="app-icon">◆</span>
      <span class="app-title">Achivio</span>
      <button class="tb-btn tb-settings" title="Settings" @click="emit('openSettings')">
        ⚙
      </button>
    </div>
    <div class="titlebar-actions">
      <button
        v-if="store.pinnedAchievements.size > 0"
        class="tb-btn tb-focus"
        :class="{ active: store.focusMode }"
        :title="
          store.focusMode
            ? 'Exit focus mode'
            : 'Focus mode (pinned only)'
        "
        @click="store.toggleFocusMode()"
      >
        🎯
      </button>
      <button
        class="tb-btn tb-pin"
        :class="{ pinned }"
        :title="
          pinned
            ? 'Pinned on top (click to unpin)'
            : 'Not pinned (click to pin on top)'
        "
        @click="toggleTop"
      >
        <span class="pin-dot"></span>
      </button>
      <button class="tb-btn" title="Minimize" @click="minimize">−</button>
      <button class="tb-btn tb-close" title="Close" @click="close">✕</button>
    </div>
  </div>
</template>

<style scoped>
.titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(12, 14, 20, 0.95);
  border-bottom: 1px solid var(--border);
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
  font-size: 11px;
  color: var(--accent);
  opacity: 0.8;
}
.app-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.3px;
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
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 13px;
  transition: all 0.15s;
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
