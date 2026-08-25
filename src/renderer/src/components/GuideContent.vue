<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ content: string }>();

interface Block {
  type: "h" | "p" | "li";
  text: string;
}

/** Render guide text: "## " lines as headings, "• " as bullets, rest as paragraphs.
 *  Normalizes inline "##" markers (generic extraction may not break lines). */
const blocks = computed<Block[]>(() => {
  const out: Block[] = [];
  const raw = props.content.replace(/\s*##\s*/g, "\n## ");
  for (const line of raw.split("\n")) {
    const txt = line.trim();
    if (!txt) continue;
    if (txt.startsWith("## ")) out.push({ type: "h", text: txt.slice(3) });
    else if (txt.startsWith("•")) out.push({ type: "li", text: txt.replace(/^•\s*/, "") });
    else out.push({ type: "p", text: txt });
  }
  return out;
});
</script>

<template>
  <div class="gc-root">
    <component
      :is="b.type === 'h' ? 'h3' : 'p'"
      v-for="(b, i) in blocks"
      :key="i"
      :class="b.type === 'h' ? 'g-h' : b.type === 'li' ? 'g-li' : 'g-p'"
    >
      <span v-if="b.type === 'li'" class="g-bullet">•</span>{{ b.text }}
    </component>
  </div>
</template>

<style scoped>
.gc-root {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.g-h {
  margin: 10px 0 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--accent-border);
}
.g-h:first-child {
  margin-top: 0;
}
.g-p {
  margin: 0;
  font-size: 12px;
  line-height: 1.65;
  color: var(--text-secondary);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.g-li {
  margin: 0;
  padding-left: 14px;
  position: relative;
  font-size: 12px;
  line-height: 1.65;
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}
.g-bullet {
  position: absolute;
  left: 2px;
  color: var(--accent);
}
</style>
