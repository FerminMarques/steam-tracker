<script setup lang="ts">
type IconName =
  | "sliders" | "target" | "check" | "close" | "minus"
  | "refresh" | "gamepad" | "trophy" | "clock" | "star"
  | "search" | "external" | "book" | "arrow-left" | "info" | "pin" | "mouse";

const props = defineProps<{ name: IconName; size?: number }>();

const paths: Record<IconName, string> = {
  sliders: '<line x1="4" y1="7" x2="20" y2="7"/><circle cx="9" cy="7" r="2.2"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="15" cy="17" r="2.2"/>',
  target: '<circle cx="12" cy="12" r="6.5"/><line x1="12" y1="1.5" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22.5"/><line x1="1.5" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22.5" y2="12"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  check: '<path d="M4.5 12.5l5 5L19.5 6.5"/>',
  close: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
  minus: '<line x1="5" y1="12" x2="19" y2="12"/>',
  refresh: '<path d="M20.5 12a8.5 8.5 0 1 1-2.49-6.01"/><polyline points="20.5 3.5 20.5 9.5 14.5 9.5"/>',
  gamepad: '<rect x="2" y="7.5" width="20" height="10" rx="5"/><line x1="8" y1="10.5" x2="8" y2="14.5"/><line x1="6" y1="12.5" x2="10" y2="12.5"/><circle cx="15.5" cy="11" r="0.8" fill="currentColor"/><circle cx="18" cy="13.5" r="0.8" fill="currentColor"/>',
  trophy: '<path d="M7 3h10v7a5 5 0 0 1-10 0V3Z"/><path d="M7 5H4v1.5A3.5 3.5 0 0 0 7.5 10"/><path d="M17 5h3v1.5A3.5 3.5 0 0 1 16.5 10"/><line x1="12" y1="15" x2="12" y2="19"/><line x1="8.5" y1="21" x2="15.5" y2="21"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><polyline points="12 7 12 12 15.5 13.5"/>',
  star: '<path d="M12 3l2.65 5.55 6.1.85-4.45 4.25 1.1 6.05L12 16.85l-5.4 2.85 1.1-6.05L3.25 9.4l6.1-.85L12 3Z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><line x1="20.5" y1="20.5" x2="15.8" y2="15.8"/>',
  external: '<path d="M14 4h6v6"/><line x1="20" y1="4" x2="11" y2="13"/><path d="M18 13.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5.5"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  'arrow-left': '<line x1="19.5" y1="12" x2="5" y2="12"/><polyline points="11 5.5 4.5 12 11 18.5"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><line x1="12" y1="11" x2="12" y2="16"/><circle cx="12" cy="8" r="0.5" fill="currentColor"/>',
  pin: '<line x1="12" x2="12" y1="17" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>',
  mouse: '<rect x="7" y="3" width="10" height="18" rx="5"/><line x1="12" y1="7" x2="12" y2="10"/>',
};

const size = props.size ?? 14;
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="icon-glyph"
    v-html="paths[props.name]"
  />
</template>
