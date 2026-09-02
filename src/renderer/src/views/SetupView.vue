<script setup lang="ts">
import { ref, onMounted } from "vue";
import { t, setUiLanguage, isExperimentalUi } from "../i18n";

const emit = defineEmits<{ configured: [] }>();

const apiKey = ref("");
const steamIdInput = ref(""); // username or ID64
const steamId = ref(""); // always resolved ID64
const saving = ref(false);
const error = ref("");
const resolving = ref(false);
const resolveHint = ref(""); // resolve feedback

const hotkey = ref("CommandOrControl+Shift+S");
const hotkeyDisplay = ref("Ctrl+Shift+S");
const recordingHotkey = ref(false);
const hotkeyError = ref("");
const language = ref("english");
const configPath = ref("");

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

onMounted(async () => {
  const raw = await window.steamApi.getHotkey();
  hotkey.value = raw;
  hotkeyDisplay.value = raw
    .replace("CommandOrControl", "Ctrl")
    .replace("Control", "Ctrl");
  // Pre-load saved config (when coming from Settings)
  const cfg = await window.steamApi.getConfig();
  if (cfg.apiKey) apiKey.value = cfg.apiKey;
  if (cfg.language) language.value = cfg.language;
  setUiLanguage(cfg.language);
  if (cfg.steamId) {
    steamIdInput.value = cfg.steamId;
    steamId.value = cfg.steamId;
    resolveHint.value = t("setupSteamIdIs", { id: cfg.steamId });
  }
  try {
    configPath.value = await window.steamApi.getConfigPath();
  } catch {}
});

function openConfigPath() {
  window.steamApi.openConfigPath();
}

function isSteamId64(val: string) {
  return /^\d{17}$/.test(val.trim());
}

async function resolveInput() {
  const val = steamIdInput.value.trim();
  if (!val) return;
  if (isSteamId64(val)) {
    steamId.value = val;
    resolveHint.value = "";
    return;
  }
  // It's a username/vanity URL — extract the useful part
  const vanity = val
    .replace(/^https?:\/\/steamcommunity\.com\/id\//i, "")
    .replace(/\/$/, "");
  if (!apiKey.value.trim()) {
    error.value = t("setupEnterApiKeyFirst");
    return;
  }
  resolving.value = true;
  resolveHint.value = "";
  error.value = "";
  try {
    const res = await window.steamApi.resolveVanity(
      apiKey.value.trim(),
      vanity,
    );
    if (res.success && res.steamId) {
      steamId.value = res.steamId;
      steamIdInput.value = res.steamId;
      resolveHint.value = t("setupResolved", { id: res.steamId });
    } else {
      error.value = res.error ?? t("setupUsernameNotFound");
    }
  } finally {
    resolving.value = false;
  }
}

function startRecording() {
  recordingHotkey.value = true;
  hotkeyError.value = "";
}

function onHotkeyKeydown(e: KeyboardEvent) {
  if (!recordingHotkey.value) return;
  e.preventDefault();
  e.stopPropagation();
  if (["Control", "Shift", "Alt", "Meta", "Command"].includes(e.key)) return;
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("CommandOrControl");
  if (e.shiftKey) parts.push("Shift");
  if (e.altKey) parts.push("Alt");
  const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  parts.push(key);
  hotkey.value = parts.join("+");
  hotkeyDisplay.value = hotkey.value.replace("CommandOrControl", "Ctrl");
  recordingHotkey.value = false;
}

async function save() {
  error.value = "";
  // Auto-resolve if not yet resolved
  if (!isSteamId64(steamId.value)) {
    await resolveInput();
    if (!isSteamId64(steamId.value)) return; // resolve failed
  }
  if (!apiKey.value.trim()) {
    error.value = t("setupApiKeyRequired");
    return;
  }
  saving.value = true;
  try {
    await window.steamApi.saveConfig({
      apiKey: apiKey.value.trim(),
      steamId: steamId.value,
      language: language.value,
    });
    setUiLanguage(language.value);
    const ok = await window.steamApi.setHotkey(hotkey.value);
    if (!ok) hotkeyError.value = t("settingsHotkeyInUse");
    emit("configured");
  } catch {
    error.value = t("setupSaveFailed");
  } finally {
    saving.value = false;
  }
}

function openApiKeyPage() {
  window.open("https://steamcommunity.com/dev/apikey", "_blank");
}

function openSteamIdPage() {
  window.open("https://steamcommunity.com/my/", "_blank");
}
</script>

<template>
  <div class="setup-view">
    <div class="setup-hero">
      <div class="hero-icon">◆</div>
      <h1 class="hero-title">ACHIVIO</h1>
      <p class="hero-tagline">Pin. Focus. Unlock.</p>
      <p class="hero-sub">{{ t("appTagline") }}</p>
    </div>

    <div class="setup-form">
      <div class="form-group">
        <label class="form-label">{{ t("setupApiKeyLabel") }}</label>
        <input
          v-model="apiKey"
          type="password"
          class="form-input"
          :placeholder="t('setupApiKeyPlaceholder')"
          @keyup.enter="save"
        />
        <div v-if="configPath" class="config-path-row" :title="configPath">
          <span class="config-path-label">{{ t("setupConfigPath") }}:</span>
          <span class="config-path-value">{{ configPath }}</span>
          <button class="config-path-btn" type="button" :title="t('setupConfigPathOpen')" @click="openConfigPath">…</button>
        </div>
        <button class="help-link" type="button" @click="openApiKeyPage">
          {{ t("setupGetApiKey") }}
        </button>
      </div>

      <div class="form-group">
        <label class="form-label">{{ t("setupSteamIdLabel") }}</label>
        <div class="resolve-row">
          <input
            v-model="steamIdInput"
            type="text"
            class="form-input"
            :placeholder="t('setupSteamIdPlaceholder')"
            @keyup.enter="resolveInput"
            @blur="resolveInput"
          />
          <button
            class="resolve-btn"
            :disabled="resolving"
            type="button"
            :title="t('setupUsernameHint')"
            @click="resolveInput"
          >
            {{ resolving ? "..." : "→" }}
          </button>
        </div>
        <p v-if="resolveHint" class="form-ok">{{ resolveHint }}</p>
        <p v-if="error && !resolveHint" class="form-warn">⚠ {{ error }}</p>
        <p class="form-hint">{{ t("setupUsernameHint") }}</p>
        <button class="help-link" type="button" @click="openSteamIdPage">
          {{ t("setupGetSteamId") }}
        </button>
      </div>

      <div class="form-group">
        <label class="form-label">{{ t("settingsLanguage") }}</label>
        <select v-model="language" class="form-input form-select">
          <option v-for="lang in LANGUAGES" :key="lang.value" :value="lang.value">
            {{ lang.label }}
          </option>
        </select>
        <p class="form-hint">{{ t("setupLanguageHint") }}</p>
        <p v-if="isExperimentalUi(language)" class="form-warn">
          ⚠ {{ t("settingsAiNotice") }}
        </p>
      </div>

      <div class="form-group">
        <label class="form-label">{{ t("setupHotkeyLabel") }}</label>
        <div
          class="hotkey-input"
          :class="{ recording: recordingHotkey }"
          tabindex="0"
          @click="startRecording"
          @keydown="onHotkeyKeydown"
          @blur="recordingHotkey = false"
        >
          <span v-if="recordingHotkey" class="recording-hint"
            >{{ t("setupPressShortcutNow") }}</span
          >
          <span v-else class="hotkey-value">{{ hotkeyDisplay }}</span>
          <span class="hotkey-edit-icon">{{
            recordingHotkey ? "⌨" : "✎"
          }}</span>
        </div>
        <p v-if="hotkeyError" class="form-warn">⚠ {{ hotkeyError }}</p>
        <p class="form-hint">{{ t("setupHotkeyHint") }}</p>
      </div>

      <p v-if="error" class="form-error">⚠ {{ error }}</p>

      <button class="save-btn" :disabled="saving" @click="save">
        {{ saving ? t("setupSaving") : t("setupSaveStart") }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.setup-view {
  flex: 1;
  overflow: hidden;
  padding: 16px 24px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  min-height: 0;
}
.setup-hero {
  text-align: center;
  flex-shrink: 0;
}
.hero-icon {
  font-size: 32px;
  margin-bottom: 8px;
}
.hero-title {
  font-size: 22px;
  font-weight: 800;
  color: var(--text);
  margin: 0 0 4px;
  letter-spacing: 2.5px;
}
.hero-tagline {
  font-size: 11px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 1.2px;
  text-transform: uppercase;
  margin: 0 0 8px;
}
.hero-sub {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  max-width: 320px;
  line-height: 1.4;
}
.setup-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 360px;
  flex-shrink: 0;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.form-input {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font-size: 13px;
  padding: 10px 12px;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
  box-sizing: border-box;
}
.form-input:focus {
  border-color: var(--accent-border);
}
.form-input::placeholder {
  color: var(--text-muted);
}
.form-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 28px;
}
.form-select option {
  background: #13151e;
  color: var(--text);
}
.hotkey-input {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
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
  animation: pulse-border 1s infinite;
}
@keyframes pulse-border {
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
.help-link {
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  font-size: 11px;
  padding: 0;
  text-align: left;
}
.help-link:hover {
  text-decoration: underline;
}
.config-path-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 4px 6px;
  overflow: hidden;
}
.config-path-label {
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}
.config-path-value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-secondary);
}
.config-path-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 3px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 11px;
  padding: 1px 6px;
  flex-shrink: 0;
  transition: all 0.12s;
}
.config-path-btn:hover {
  color: var(--accent);
  border-color: var(--accent-border);
  background: var(--accent-soft);
}
.resolve-row {
  display: flex;
  gap: 6px;
}
.resolve-row .form-input {
  flex: 1;
}
.resolve-btn {
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius);
  color: var(--accent);
  cursor: pointer;
  font-size: 16px;
  padding: 0 14px;
  transition: all 0.15s;
  flex-shrink: 0;
}
.resolve-btn:hover:not(:disabled) {
  background: rgba(129, 140, 248, 0.2);
}
.resolve-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.form-ok {
  font-size: 11px;
  color: var(--success);
  margin: 0;
}
.form-error {
  font-size: 12px;
  color: var(--danger);
  margin: 0;
  padding: 8px 12px;
  background: rgba(248, 113, 113, 0.06);
  border-radius: 6px;
  border: 1px solid rgba(248, 113, 113, 0.15);
}
.form-warn {
  font-size: 11px;
  color: var(--warning);
  margin: 0;
}
.form-hint {
  font-size: 11px;
  color: var(--text-muted);
  margin: 0;
}
.save-btn {
  background: var(--accent);
  border: none;
  border-radius: var(--radius);
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  padding: 12px;
  transition: all 0.15s;
  width: 100%;
}
.save-btn:hover:not(:disabled) {
  background: #6366f1;
}
.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.privacy-note {
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
  margin: 0;
}
</style>
