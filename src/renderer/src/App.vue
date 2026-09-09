<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useAppStore } from "./stores/app";
import TitleBar from "./components/TitleBar.vue";
import SetupView from "./views/SetupView.vue";
import DashboardView from "./views/DashboardView.vue";
import FocusView from "./views/FocusView.vue";
import GuideReader from "./components/GuideReader.vue";
import { t, setUiLanguage, isExperimentalUi } from "./i18n";

const store = useAppStore();
const configured = ref(false);
const loading = ref(true);
const showSettings = ref(false);
const settingsHotkey = ref("CommandOrControl+Shift+S");
const settingsHotkeyDisplay = ref("Ctrl+Shift+S");
const settingsFocusHotkey = ref("CommandOrControl+Shift+F");
const settingsFocusHotkeyDisplay = ref("Ctrl+Shift+F");
const settingsClickHotkey = ref("CommandOrControl+Shift+C");
const settingsClickHotkeyDisplay = ref("Ctrl+Shift+C");
const clickHotkeyLabel = ref("Ctrl+Shift+C");
const settingsOpacity = ref(1);
const settingsPanelOpacity = ref(1);
const settingsPanelFollow = ref(true);
const recordingHotkey = ref(false);
const recordingFocusHotkey = ref(false);
const recordingClickHotkey = ref(false);
const hotkeyError = ref("");
const focusHotkeyError = ref("");
const clickHotkeyError = ref("");
const settingsLanguage = ref("english");
const settingsTheme = ref("violet");
const progressDownKey = ref("9");
const progressUpKey = ref("0");
let removeFocusListener: (() => void) | null = null;
let removeClickThroughListener: (() => void) | null = null;

const THEMES = [
  { value: "violet", color: "#818cf8" },
  { value: "emerald", color: "#34d399" },
  { value: "amber", color: "#fb923c" },
  { value: "rose", color: "#f472b6" },
  { value: "cyan", color: "#22d3ee" },
  { value: "crimson", color: "#fb7185" },
];

function applyTheme(theme: string) {
  if (theme === "violet") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

async function onThemeChange(theme: string) {
  settingsTheme.value = theme;
  applyTheme(theme);
  await window.steamApi.setTheme(theme);
}

const LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'spanish', label: 'Español' },
  { value: 'french', label: 'Français' },
  { value: 'german', label: 'Deutsch' },
  { value: 'italian', label: 'Italiano' },
  { value: 'portuguese', label: 'Português' },
  { value: 'brazilian', label: 'Português (BR)' },
  { value: 'russian', label: 'Русский' },
  { value: 'japanese', label: '日本語' },
  { value: 'korean', label: '한국어' },
  { value: 'schinese', label: '简体中文' },
  { value: 'tchinese', label: '繁體中文' }
];

function formatHotkey(raw: string) {
  return raw.replace("CommandOrControl", "Ctrl").replace("Control", "Ctrl");
}

onMounted(async () => {
  const cfg = await window.steamApi.getConfig();
  configured.value = !!(cfg.apiKey && cfg.steamId);
  applyTheme(cfg.theme || "violet");
  setUiLanguage(cfg.language);
  loading.value = false;
  removeFocusListener = window.steamApi.onFocusToggle(() => {
    if (store.pinnedAchievements.size > 0) {
      store.toggleFocusMode();
    }
  });
  await store.loadClickThrough();
  removeClickThroughListener = window.steamApi.onClickThroughChanged((val) => {
    store.clickThrough = val;
  });
  try {
    clickHotkeyLabel.value = formatHotkey(await window.steamApi.getClickThroughHotkey());
  } catch { /* default label */ }
});

onUnmounted(() => {
  removeFocusListener?.();
  removeClickThroughListener?.();
});

watch(
  () => store.focusMode,
  (active) => {
    if (active) {
      // Auto-cierra overlays de la vista general al entrar en foco
      if (showSettings.value) showSettings.value = false;
      if (store.readerGuide) store.closeGuideReader();
      if (store.selectedAchievement) store.clearSelectedAchievement();
    }
    window.steamApi.resizeFocus(active, store.pinned.length);
  },
);

async function openSettings() {
  settingsHotkey.value = await window.steamApi.getHotkey();
  settingsHotkeyDisplay.value = formatHotkey(settingsHotkey.value);
  settingsFocusHotkey.value = await window.steamApi.getFocusHotkey();
  settingsFocusHotkeyDisplay.value = formatHotkey(settingsFocusHotkey.value);
  settingsClickHotkey.value = await window.steamApi.getClickThroughHotkey();
  settingsClickHotkeyDisplay.value = formatHotkey(settingsClickHotkey.value);
  clickHotkeyLabel.value = settingsClickHotkeyDisplay.value;
  settingsOpacity.value = await window.steamApi.getOpacity();
  settingsPanelOpacity.value = await window.steamApi.getGuidePanelOpacity();
  settingsPanelFollow.value = await window.steamApi.isGuidePanelFollowing();
  const cfg = await window.steamApi.getConfig();
  settingsLanguage.value = cfg.language || 'english';
  settingsTheme.value = cfg.theme || 'violet';
  const pkeys = await window.steamApi.getProgressKeys();
  progressDownKey.value = pkeys.down;
  progressUpKey.value = pkeys.up;
  hotkeyError.value = "";
  focusHotkeyError.value = "";
  clickHotkeyError.value = "";
  recordingHotkey.value = false;
  recordingFocusHotkey.value = false;
  recordingClickHotkey.value = false;
  showSettings.value = true;
}

function closeSettings() {
  showSettings.value = false;
}

async function onLanguageChange(e: Event) {
  const lang = (e.target as HTMLSelectElement).value;
  if (lang === settingsLanguage.value) return;
  settingsLanguage.value = lang;
  setUiLanguage(lang);
  await window.steamApi.saveLanguage(lang);
  await store.applyLanguageChange();
}

async function onProgressKeyDown(e: KeyboardEvent, which: 'down' | 'up') {
  const key = e.key;
  if (['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'Escape'].includes(key)) return;
  if (which === 'down') progressDownKey.value = key;
  else progressUpKey.value = key;
  await window.steamApi.setProgressKeys(progressDownKey.value, progressUpKey.value);
}

function onOpacityChange(e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value);
  settingsOpacity.value = val;
  window.steamApi.setOpacity(val);
  // A following panel (the default) mirrors the main window live
  if (settingsPanelFollow.value) settingsPanelOpacity.value = val;
}

function onPanelOpacityChange(e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value);
  settingsPanelOpacity.value = val;
  settingsPanelFollow.value = false;
  window.steamApi.setGuidePanelOpacity(val);
}

function onPanelFollowChange(e: Event) {
  const follow = (e.target as HTMLInputElement).checked;
  settingsPanelFollow.value = follow;
  if (follow) {
    window.steamApi.setGuidePanelOpacity(null);
    settingsPanelOpacity.value = settingsOpacity.value;
  } else {
    window.steamApi.setGuidePanelOpacity(settingsPanelOpacity.value);
  }
}

function startRecording() {
  recordingHotkey.value = true;
  recordingFocusHotkey.value = false;
  hotkeyError.value = "";
}

function startRecordingFocus() {
  recordingFocusHotkey.value = true;
  recordingHotkey.value = false;
  recordingClickHotkey.value = false;
  focusHotkeyError.value = "";
}

function startRecordingClick() {
  recordingClickHotkey.value = true;
  recordingHotkey.value = false;
  recordingFocusHotkey.value = false;
  clickHotkeyError.value = "";
}

function buildAccelerator(e: KeyboardEvent): string | null {
  if (["Control", "Shift", "Alt", "Meta", "Command"].includes(e.key)) return null;
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("CommandOrControl");
  if (e.shiftKey) parts.push("Shift");
  if (e.altKey) parts.push("Alt");
  const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  parts.push(key);
  return parts.join("+");
}

async function recordAccelerator(e: KeyboardEvent, kind: "overlay" | "focus" | "click") {
  const recording =
    kind === "overlay" ? recordingHotkey : kind === "focus" ? recordingFocusHotkey : recordingClickHotkey;
  if (!recording.value) return;
  e.preventDefault();
  e.stopPropagation();
  const accelerator = buildAccelerator(e);
  if (!accelerator) return;
  recording.value = false;
  const ok =
    kind === "overlay"
      ? await window.steamApi.setHotkey(accelerator)
      : kind === "focus"
        ? await window.steamApi.setFocusHotkey(accelerator)
        : await window.steamApi.setClickThroughHotkey(accelerator);
  if (ok) {
    if (kind === "overlay") {
      settingsHotkey.value = accelerator;
      settingsHotkeyDisplay.value = formatHotkey(accelerator);
    } else if (kind === "focus") {
      settingsFocusHotkey.value = accelerator;
      settingsFocusHotkeyDisplay.value = formatHotkey(accelerator);
    } else {
      settingsClickHotkey.value = accelerator;
      settingsClickHotkeyDisplay.value = formatHotkey(accelerator);
      clickHotkeyLabel.value = settingsClickHotkeyDisplay.value;
    }
    hotkeyError.value = "";
    focusHotkeyError.value = "";
    clickHotkeyError.value = "";
  } else {
    const msg = t("settingsHotkeyInUse");
    if (kind === "overlay") hotkeyError.value = msg;
    else if (kind === "focus") focusHotkeyError.value = msg;
    else clickHotkeyError.value = msg;
  }
}

async function logout() {
  await window.steamApi.clearConfig();
  store.resetForLogout();
  configured.value = false;
  showSettings.value = false;
}
</script>

<template>
  <div class="app-root app-hud-texture" :class="{ 'focus-mode': store.focusMode }">
    <TitleBar v-if="!store.focusMode" @open-settings="openSettings" />
    <div v-if="store.clickThrough && !store.focusMode" class="clickthrough-banner">
      <span>{{ t("clickThroughBanner").replace("{key}", clickHotkeyLabel) }}</span>
    </div>
    <div v-if="loading" class="loading-screen">
      <div class="spinner"></div>
    </div>
    <SetupView v-else-if="!configured" @configured="configured = true" />
    <template v-else>
      <Transition name="fade-view" mode="out-in">
        <FocusView v-if="store.focusMode" />
        <DashboardView v-else />
      </Transition>
    </template>

    <!-- Integrated guide reader -->
    <GuideReader />

    <!-- Settings Modal -->
    <Teleport to="body">
      <div v-if="showSettings" class="settings-overlay" @click.self="closeSettings">
        <div class="settings-modal">
          <div class="settings-header">
            <span class="settings-title">{{ t("settingsTitle") }}</span>
            <button class="settings-close" @click="closeSettings">✕</button>
          </div>
          <div class="settings-body">
            <!-- Hotkey -->
            <div class="settings-section">
              <div class="settings-label">{{ t("settingsOverlayHotkey") }}</div>
              <div
                class="hotkey-input"
                :class="{ recording: recordingHotkey }"
                tabindex="0"
                @click="startRecording"
                @keydown="recordAccelerator($event, 'overlay')"
                @blur="recordingHotkey = false"
              >
                <span v-if="recordingHotkey" class="recording-hint">{{ t("settingsPressShortcut") }}</span>
                <span v-else class="hotkey-value">{{ settingsHotkeyDisplay }}</span>
                <span class="hotkey-edit-icon">{{ recordingHotkey ? '⌨' : '✎' }}</span>
              </div>
              <p v-if="hotkeyError" class="settings-warn">⚠ {{ hotkeyError }}</p>
              <p class="settings-hint">{{ t("settingsOverlayHotkeyHint") }}</p>
            </div>

            <!-- Focus Hotkey -->
            <div class="settings-section">
              <div class="settings-label">{{ t("settingsFocusHotkey") }}</div>
              <div
                class="hotkey-input"
                :class="{ recording: recordingFocusHotkey }"
                tabindex="0"
                @click="startRecordingFocus"
                @keydown="recordAccelerator($event, 'focus')"
                @blur="recordingFocusHotkey = false"
              >
                <span v-if="recordingFocusHotkey" class="recording-hint">{{ t("settingsPressShortcut") }}</span>
                <span v-else class="hotkey-value">{{ settingsFocusHotkeyDisplay }}</span>
                <span class="hotkey-edit-icon">{{ recordingFocusHotkey ? '⌨' : '✎' }}</span>
              </div>
              <p v-if="focusHotkeyError" class="settings-warn">⚠ {{ focusHotkeyError }}</p>
              <p class="settings-hint">{{ t("settingsFocusHotkeyHint") }}</p>
            </div>

            <!-- Click-Through Hotkey -->
            <div class="settings-section">
              <div class="settings-label">{{ t("settingsClickThroughHotkey") }}</div>
              <div
                class="hotkey-input"
                :class="{ recording: recordingClickHotkey }"
                tabindex="0"
                @click="startRecordingClick"
                @keydown="recordAccelerator($event, 'click')"
                @blur="recordingClickHotkey = false"
              >
                <span v-if="recordingClickHotkey" class="recording-hint">{{ t("settingsPressShortcut") }}</span>
                <span v-else class="hotkey-value">{{ settingsClickHotkeyDisplay }}</span>
                <span class="hotkey-edit-icon">{{ recordingClickHotkey ? '⌨' : '✎' }}</span>
              </div>
              <p v-if="clickHotkeyError" class="settings-warn">⚠ {{ clickHotkeyError }}</p>
              <p class="settings-hint">{{ t("settingsClickThroughHotkeyHint") }}</p>
            </div>

            <!-- Progress Keys -->
            <div class="settings-section">
              <div class="settings-label">{{ t("settingsProgressKeys") }}</div>
              <div class="progress-keys-row">
                <div class="progress-key-group">
                  <span class="progress-key-label">−1</span>
                  <input
                    class="progress-key-input"
                    :value="progressDownKey"
                    readonly
                    @keydown.prevent="onProgressKeyDown($event, 'down')"
                    @click="($event.target as HTMLInputElement).select()"
                  />
                </div>
                <div class="progress-key-group">
                  <span class="progress-key-label">+1</span>
                  <input
                    class="progress-key-input"
                    :value="progressUpKey"
                    readonly
                    @keydown.prevent="onProgressKeyDown($event, 'up')"
                    @click="($event.target as HTMLInputElement).select()"
                  />
                </div>
              </div>
              <p class="settings-hint">{{ t("settingsProgressKeysHint") }}</p>
            </div>

            <!-- Language -->
            <div class="settings-section">
              <div class="settings-label">{{ t("settingsLanguage") }}</div>
              <select
                :value="settingsLanguage"
                class="settings-select"
                @change="onLanguageChange"
              >
                <option v-for="lang in LANGUAGES" :key="lang.value" :value="lang.value">
                  {{ lang.label }}
                </option>
              </select>
              <p class="settings-hint">{{ t("settingsLanguageHint") }}</p>
              <p v-if="isExperimentalUi(settingsLanguage)" class="settings-warn">
                ⚠ {{ t("settingsAiNotice") }}
              </p>
            </div>

            <!-- Theme -->
            <div class="settings-section">
              <div class="settings-label">{{ t("settingsAccentColor") }}</div>
              <div class="theme-row">
                <button
                  v-for="t in THEMES"
                  :key="t.value"
                  class="theme-dot"
                  :class="{ active: settingsTheme === t.value }"
                  :style="{ '--dot': t.color }"
                  :title="t.value"
                  @click="onThemeChange(t.value)"
                ></button>
              </div>
            </div>

            <!-- Opacity -->
            <div class="settings-section">
              <div class="settings-label">{{ t("settingsWindowOpacity") }}</div>
              <div class="opacity-row">
                <input
                  type="range"
                  min="0.15"
                  max="1"
                  step="0.01"
                  :value="settingsOpacity"
                  class="opacity-slider"
                  @input="onOpacityChange"
                />
                <span class="opacity-value">{{ Math.round(settingsOpacity * 100) }}%</span>
              </div>
            </div>

            <!-- Guide panel opacity -->
            <div class="settings-section">
              <div class="settings-label">{{ t("settingsPanelOpacity") }}</div>
              <div class="opacity-row">
                <input
                  type="range"
                  min="0.15"
                  max="1"
                  step="0.01"
                  :value="settingsPanelOpacity"
                  :disabled="settingsPanelFollow"
                  class="opacity-slider"
                  @input="onPanelOpacityChange"
                />
                <span class="opacity-value">{{ Math.round(settingsPanelOpacity * 100) }}%</span>
              </div>
              <label class="follow-row">
                <input
                  type="checkbox"
                  :checked="settingsPanelFollow"
                  @change="onPanelFollowChange"
                />
                <span>{{ t("settingsPanelFollow") }}</span>
              </label>
            </div>

            <!-- Account -->
            <div class="settings-section">
              <div class="settings-label">{{ t("settingsAccount") }}</div>
              <p class="settings-hint">{{ t("settingsAccountHint") }}</p>
              <button class="logout-btn" @click="logout">
                {{ t("settingsLogout") }}
              </button>
            </div>

            <!-- About -->
            <div class="settings-section about-section">
              <div class="settings-label">About</div>
              <div class="about-brand">
                <span class="about-icon">◆</span>
                <span class="about-name">ACHIVIO</span>
                <span class="about-version">v1.0.0</span>
              </div>
              <p class="about-tagline">Pin. Focus. Unlock.</p>
              <p class="settings-hint">Achievement Overlay for Steam · Electron + Vue</p>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style>
.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg, #0c0e14);
  color: var(--text, #e2e8f0);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}
.app-root.focus-mode {
  height: auto;
  border-color: var(--accent-border, rgba(129, 140, 248, 0.13));
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
}
.loading-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.clickthrough-banner {
  display: flex;
  justify-content: center;
  padding: 4px 10px;
  background: rgba(129, 140, 248, 0.1);
  border-bottom: 1px solid var(--accent-border);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.4px;
  color: var(--accent);
  pointer-events: none;
  user-select: none;
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Settings modal */
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.settings-modal {
  background: #13151e;
  border: 1px solid var(--border);
  border-radius: 12px;
  width: 360px;
  max-width: calc(100vw - 24px);
  max-height: calc(100vh - 24px);
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  animation: pop-in 0.18s ease;
}
.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.settings-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.settings-close {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s;
}
.settings-close:hover {
  color: var(--text);
  background: var(--surface-hover);
}
.settings-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;
  scrollbar-gutter: stable;
  overscroll-behavior: contain;
}
.settings-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.settings-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.settings-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
  overflow-wrap: break-word;
  word-break: break-word;
}
.settings-warn {
  font-size: 11px;
  color: var(--warning);
  margin: 0;
  line-height: 1.4;
  overflow-wrap: break-word;
  word-break: break-word;
}
.hotkey-input {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius, 8px);
  padding: 10px 12px;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s;
  user-select: none;
}
.hotkey-input:hover,
.hotkey-input:focus {
  border-color: var(--accent-border);
}
.hotkey-input.recording {
  border-color: var(--accent);
  background: var(--accent-soft);
  animation: pulse-hk 1s infinite;
}
@keyframes pulse-hk {
  0%, 100% { border-color: rgba(129, 140, 248, 0.5); }
  50% { border-color: var(--accent); }
}
.hotkey-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.5px;
}
.recording-hint {
  font-size: 12px;
  color: var(--accent);
  opacity: 0.8;
}
.hotkey-edit-icon {
  font-size: 14px;
  color: var(--text-muted);
}
.settings-select {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius, 8px);
  color: var(--text);
  font-size: 13px;
  padding: 10px 12px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 28px;
}
.settings-select:focus {
  border-color: var(--accent-border);
}
.settings-select option {
  background: #13151e;
  color: var(--text);
}
.opacity-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.theme-row {
  display: flex;
  gap: 10px;
}
.theme-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  background: var(--dot);
  cursor: pointer;
  padding: 0;
  transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
}
.theme-dot:hover {
  transform: scale(1.15);
}
.theme-dot.active {
  border-color: #fff;
  box-shadow: 0 0 8px var(--dot);
}
.opacity-slider {
  flex: 1;
  height: 4px;
  accent-color: var(--accent);
  cursor: pointer;
}
.opacity-value {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 36px;
  text-align: right;
}
.follow-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}
.follow-row input {
  accent-color: var(--accent);
  cursor: pointer;
}
.opacity-slider:disabled {
  opacity: 0.4;
  cursor: default;
}
.progress-keys-row {
  display: flex;
  gap: 12px;
}
.progress-key-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.progress-key-label {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
  min-width: 18px;
}
.progress-key-input {
  width: 40px;
  text-align: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
  padding: 5px 4px;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s;
}
.progress-key-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(129, 140, 248, 0.15);
}
.logout-btn {
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.2);
  border-radius: 6px;
  color: var(--danger, #f87171);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  padding: 8px 12px;
  transition: all 0.15s;
  text-align: center;
}
.logout-btn:hover {
  background: rgba(248, 113, 113, 0.15);
  border-color: rgba(248, 113, 113, 0.35);
}
.about-section {
  padding-top: 12px;
  border-top: 1px solid var(--border);
  margin-top: 4px;
}
.about-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}
.about-icon {
  color: var(--accent);
  font-size: 10px;
}
.about-name {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 2px;
  color: var(--text);
}
.about-version {
  font-size: 10px;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 1px 6px;
  border-radius: 10px;
}
.about-tagline {
  font-size: 11px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.8px;
  text-transform: uppercase;
  margin: 6px 0 0;
}
</style>