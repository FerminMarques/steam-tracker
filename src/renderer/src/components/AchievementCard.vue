<script setup lang="ts">
import { computed, ref } from "vue";
import { useAppStore } from "../stores/app";
import type { Achievement } from "../stores/app";
import Icon from "./Icon.vue";

const props = defineProps<{ achievement: Achievement; selected?: boolean }>();
const emit = defineEmits<{ select: [ach: Achievement] }>();
const store = useAppStore();

const editingManual = ref(false);
const manualInput = ref("");

function formatDate(ts: number): string {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function onPinClick(e: MouseEvent) {
  e.stopPropagation();
  store.togglePinAchievement(props.achievement.apiName);
}

/** Extract the largest goal number from description */
function descMax(): number | null {
  const nums = [...(props.achievement.description || "").matchAll(/\b(\d{1,6})\b/g)]
    .map((m) => parseInt(m[1], 10))
    .filter((n) => n >= 2 && n <= 100000);
  if (!nums.length) return null;
  const sig = nums.filter((n) => n >= 5);
  return sig.length ? Math.max(...sig) : nums[nums.length - 1];
}

const mp = computed(() => store.manualProgress.get(props.achievement.apiName));
const hasAutoProgress = computed(
  () => !props.achievement.achieved && props.achievement.currentProgress !== null && props.achievement.maxProgress
);
const canTrackManually = computed(
  () => !props.achievement.achieved && !hasAutoProgress.value && !mp.value && descMax() !== null
);

/** Rarity tier by global unlock percentage */
const rarity = computed(() => {
  const p = props.achievement.globalPercent;
  if (p < 2) return "mythic";
  if (p < 10) return "epic";
  if (p < 30) return "rare";
  return "common";
});

function startManualTrack(e: MouseEvent) {
  e.stopPropagation();
  const max = descMax();
  if (max === null) return;
  editingManual.value = true;
  manualInput.value = "0";
}

function confirmManualTrack(e: MouseEvent) {
  e.stopPropagation();
  const max = descMax();
  if (max === null) return;
  const val = parseInt(manualInput.value, 10);
  if (isNaN(val)) return;
  store.setManualProgressValue(props.achievement.apiName, val, max);
  editingManual.value = false;
}

function cancelManualTrack(e: MouseEvent) {
  e.stopPropagation();
  editingManual.value = false;
}

function adjustProgress(e: MouseEvent, delta: number) {
  e.stopPropagation();
  store.adjustManualProgress(props.achievement.apiName, delta);
}

function removeProgress(e: MouseEvent) {
  e.stopPropagation();
  store.removeManualProgress(props.achievement.apiName);
}
</script>

<template>
  <div
    class="ach-card"
    :class="{ achieved: achievement.achieved, selected }"
    @click="emit('select', achievement)"
  >
    <div class="ach-icon-wrap">
      <img
        v-if="achievement.achieved ? achievement.icon : achievement.iconGray"
        :src="achievement.achieved ? achievement.icon : achievement.iconGray"
        :alt="achievement.displayName"
        class="ach-icon"
        loading="lazy"
      />
      <div v-else class="ach-icon-placeholder"><Icon name="trophy" :size="20" /></div>
    </div>
    <div class="ach-info">
      <div class="ach-name">{{ achievement.displayName }}</div>
      <div class="ach-desc">
        {{ achievement.description || "Hidden achievement" }}
      </div>
      <!-- Auto progress from Steam API -->
      <div
        v-if="hasAutoProgress"
        class="ach-progress"
      >
        <div class="ach-progress-track">
          <div
            class="ach-progress-fill"
            :style="{
              width:
                Math.min(
                  100,
                  (achievement.currentProgress! / achievement.maxProgress!) *
                    100,
                ) + '%',
            }"
          ></div>
        </div>
        <span class="ach-progress-label num">{{ achievement.currentProgress }}/{{ achievement.maxProgress }}</span>
      </div>
      <!-- Manual progress tracking -->
      <div v-else-if="mp" class="ach-progress">
        <div class="ach-progress-track">
          <div
            class="ach-progress-fill manual-fill"
            :style="{ width: Math.min(100, (mp.current / mp.max) * 100) + '%' }"
          ></div>
        </div>
        <div class="manual-controls" @click.stop>
          <button class="mp-btn" title="-1" @click="adjustProgress($event, -1)">−</button>
          <span class="ach-progress-label num">{{ mp.current }}/{{ mp.max }}</span>
          <button class="mp-btn" title="+1" @click="adjustProgress($event, 1)">+</button>
          <button class="mp-btn mp-remove" title="Stop tracking" @click="removeProgress($event)">✕</button>
        </div>
      </div>
      <!-- Manual track prompt -->
      <div v-else-if="canTrackManually && !editingManual" class="manual-start" @click.stop>
        <button class="track-btn" @click="startManualTrack($event)">Track manually</button>
      </div>
      <!-- Manual track input -->
      <div v-else-if="editingManual" class="manual-input-row" @click.stop>
        <input
          v-model="manualInput"
          type="number"
          min="0"
          class="manual-input"
          placeholder="0"
          @keyup.enter="confirmManualTrack($event as any)"
          @keyup.escape="cancelManualTrack($event as any)"
        />
        <span class="manual-max">/ {{ descMax() }}</span>
        <button class="mp-btn mp-confirm" @click="confirmManualTrack($event)">✓</button>
        <button class="mp-btn" @click="cancelManualTrack($event)">✕</button>
      </div>
      <div class="ach-meta">
        <span class="ach-pct num" :class="rarity">
          <i class="rarity-dot"></i>{{ achievement.globalPercent }}%
        </span>
        <span
          v-if="achievement.achieved && achievement.unlockTime"
          class="ach-date"
        >
          ✓ {{ formatDate(achievement.unlockTime) }}
        </span>
      </div>
    </div>
    <div class="ach-status">
      <button
        class="pin-btn"
        :class="{ pinned: store.pinnedAchievements.has(achievement.apiName) }"
        :title="
          store.pinnedAchievements.has(achievement.apiName)
            ? 'Unpin achievement'
            : 'Pin achievement'
        "
        @click="onPinClick"
      >
        <span class="pin-indicator"></span>
      </button>
      <span v-if="achievement.achieved" class="badge done"><Icon name="check" :size="13" /></span>
      <span v-else class="badge todo"><Icon name="target" :size="11" /></span>
    </div>
  </div>
</template>

<style scoped>
.ach-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius);
  cursor: pointer;
  border: 1px solid transparent;
  transition:
    background 0.15s,
    border-color 0.15s,
    transform 0.15s ease,
    box-shadow 0.15s ease;
  background: var(--surface);
  animation: fade-in-up 0.25s ease both;
  animation-delay: calc(var(--stagger, 0) * 25ms);
}
.ach-card:hover {
  background: var(--surface-hover);
  border-color: var(--accent-border);
  transform: translateY(-1px);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.25);
}
.ach-card:active {
  transform: translateY(0) scale(0.995);
}
.ach-card.selected {
  background: var(--accent-soft);
  border-color: var(--accent-border);
  box-shadow: inset 3px 0 0 var(--accent);
}
/* Rarity left stripe */
.ach-card.rarity-mythic::before,
.ach-card.rarity-epic::before,
.ach-card.rarity-rare::before {
  content: "";
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 2px;
  border-radius: 1px;
}
.ach-card.rarity-mythic::before { background: var(--rarity-mythic); }
.ach-card.rarity-epic::before { background: var(--rarity-epic); }
.ach-card.rarity-rare::before { background: var(--rarity-rare); }
.ach-icon-wrap {
  flex-shrink: 0;
}
.ach-icon {
  width: 44px;
  height: 44px;
  border-radius: 7px;
  object-fit: cover;
  transition: transform 0.15s ease;
}
.ach-card:hover .ach-icon {
  transform: scale(1.05);
}
.achieved .ach-icon {
  box-shadow: 0 0 10px var(--accent-soft), inset 0 0 0 1px var(--accent-border);
}
.ach-icon-placeholder {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: var(--surface);
  border-radius: 7px;
}
.ach-info {
  flex: 1;
  min-width: 0;
}
.ach-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.achieved .ach-name {
  color: var(--accent);
}
.ach-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ach-progress {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.ach-progress-track {
  flex: 1;
  height: 4px;
  background: var(--surface);
  border-radius: 2px;
  overflow: hidden;
}
.ach-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 55%, #fff));
  border-radius: 2px;
  transition: width 0.4s ease;
}
.ach-progress-label {
  font-size: 10px;
  color: var(--accent);
  font-weight: 700;
  white-space: nowrap;
  min-width: 28px;
  text-align: right;
}
.ach-meta {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}
.ach-pct {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--text-secondary);
}
.ach-date {
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--success);
}
.rarity-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}
.ach-pct.mythic {
  color: var(--rarity-mythic);
  font-weight: 600;
}
.ach-pct.epic {
  color: var(--rarity-epic);
  font-weight: 600;
}
.ach-pct.rare {
  color: var(--rarity-rare);
  font-weight: 600;
}
.ach-date {
  font-size: 10px;
  color: var(--success);
}
.ach-status {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.pin-btn {
  background: none;
  border: 1px solid transparent;
  cursor: pointer;
  padding: 3px;
  border-radius: 50%;
  transition: all 0.15s;
  line-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pin-indicator {
  display: block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--text-muted);
  background: transparent;
  transition: all 0.2s;
}
.pin-btn:hover .pin-indicator {
  border-color: var(--accent);
}
.pin-btn.pinned .pin-indicator {
  background: var(--accent);
  border-color: var(--accent);
  box-shadow: 0 0 6px rgba(129, 140, 248, 0.4);
}
.badge {
  font-size: 14px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.badge.done {
  color: var(--success);
}
.badge.todo {
  color: var(--text-muted);
}
.manual-fill {
  background: var(--warning);
}
.manual-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}
.mp-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 11px;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
  transition: all 0.12s;
}
.mp-btn:hover {
  background: var(--surface-hover);
  color: var(--text);
  border-color: var(--accent-border);
}
.mp-confirm {
  color: var(--success);
}
.mp-remove {
  color: var(--text-muted);
  font-size: 9px;
}
.mp-remove:hover {
  color: var(--danger, #f87171);
}
.manual-start {
  margin-top: 3px;
}
.track-btn {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-muted);
  cursor: pointer;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  transition: all 0.12s;
}
.track-btn:hover {
  color: var(--warning);
  border-color: rgba(251, 191, 36, 0.3);
  background: rgba(251, 191, 36, 0.06);
}
.manual-input-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 3px;
}
.manual-input {
  width: 42px;
  background: var(--surface);
  border: 1px solid var(--accent-border);
  color: var(--text);
  font-size: 11px;
  padding: 2px 4px;
  border-radius: 4px;
  text-align: center;
  outline: none;
}
.manual-input::-webkit-inner-spin-button,
.manual-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.manual-max {
  font-size: 10px;
  color: var(--text-muted);
}
</style>
