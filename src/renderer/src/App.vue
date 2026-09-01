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
const settingsOpacity = ref(1);
const recordingHotkey = ref(false);
const recordingFocusHotkey = ref(false);
const hotkeyError = ref("");
const focusHotkeyError = ref("");
const settingsLanguage = ref("english");
const settingsTheme = ref("violet");
const progressDownKey = ref("9");
const progressUpKey = ref("0");
let removeFocusListener: (() => void) | null = null;

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
});

onUnmounted(() => {
  removeFocusListener?.();
});

watch(
  () => store.focusMode,
  (active) => {
    window.steamApi.resizeFocus(active, store.pinned.length);
  },
);

async function openSettings() {
  settingsHotkey.value = await window.steamApi.getHotkey();
  settingsHotkeyDisplay.value = formatHotkey(settingsHotkey.value);
  settingsFocusHotkey.value = await window.steamApi.getFocusHotkey();
  settingsFocusHotkeyDisplay.value = formatHotkey(settingsFocusHotkey.value);
  settingsOpacity.value = await window.steamApi.getOpacity();
  const cfg = await window.steamApi.getConfig();
  settingsLanguage.value = cfg.language || 'english';
  settingsTheme.value = cfg.theme || 'violet';
  const pkeys = await window.steamApi.getProgressKeys();
  progressDownKey.value = pkeys.down;
  progressUpKey.value = pkeys.up;
  hotkeyError.value = "";
  focusHotkeyError.value = "";
  recordingHotkey.value = false;
  recordingFocusHotkey.value = false;
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
}

function startRecording() {
  recordingHotkey.value = true;
  recordingFocusHotkey.value = false;
  hotkeyError.value = "";
}

function startRecordingFocus() {
  recordingFocusHotkey.value = true;
  recordingHotkey.value = false;
  focusHotkeyError.value = "";
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

async function recordAccelerator(e: KeyboardEvent, kind: "overlay" | "focus") {
  const recording = kind === "overlay" ? recordingHotkey : recordingFocusHotkey;
  if (!recording.value) return;
  e.preventDefault();
  e.stopPropagation();
  const accelerator = buildAccelerator(e);
  if (!accelerator) return;
  recording.value = false;
  const ok =
    kind === "overlay"
      ? await window.steamApi.setHotkey(accelerator)
      : await window.steamApi.setFocusHotkey(accelerator);
  if (ok) {
    if (kind === "overlay") {
      settingsHotkey.value = accelerator;
      settingsHotkeyDisplay.value = formatHotkey(accelerator);
    } else {
      settingsFocusHotkey.value = accelerator;
      settingsFocusHotkeyDisplay.value = formatHotkey(accelerator);
    }
    hotkeyError.value = "";
    focusHotkeyError.value = "";
  } else {
    const msg = t("settingsHotkeyInUse");
    if (kind === "overlay") hotkeyError.value = msg;
    else focusHotkeyError.value = msg;
  }
}

async function logout() {
  await window.steamApi.clearConfig();
  configured.value = false;
  showSettings.value = false;
  store.focusMode = false;
}
</script>

<template>
  <div class="app-root app-hud-texture" :class="{ 'focus-mode': store.focusMode }">
    <TitleBar v-if="!store.focusMode" @open-settings="openSettings" />
    <div v-if="loading" class="loading-screen">
      <div class="spinner"></div>
    </div>
    <SetupView v-else-if="!configured" @configured="configured = true" />
    <Transition name="fade-view" mode="out-in">
      <FocusView v-if="store.focusMode" />
      <DashboardView v-else />
    </Transition>

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

            <!-- Account -->
            <div class="settings-section">
              <div class="settings-label">{{ t("settingsAccount") }}</div>
              <p class="settings-hint">{{ t("settingsAccountHint") }}</p>
              <button class="logout-btn" @click="logout">
                {{ t("settingsLogout") }}
              </button>
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
  width: 320px;
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
}
.settings-warn {
  font-size: 11px;
  color: var(--warning);
  margin: 0;
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
</style>