<template>
  <div 
    ref="containerRef" 
    class="sheet-music"
    :class="{ 'is-loading': isLoading }"
  >
    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner"></div>
      <p>Loading score...</p>
    </div>
    
    <div v-if="error" class="error-message">
      <p>{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { ScoreRenderer } from '../core/ScoreRenderer.js';

/**
 * SheetMusic Component
 * Renders musical notation using VexFlow
 * 
 * Props:
 * - phrase: Phrase data from MusicXMLParser
 * - activeNotes: Array of note indices to highlight
 * - highlightColor: Color for highlighted notes (default: '#4CAF50')
 */

const props = defineProps({
  phrase: {
    type: Object,
    default: null
  },
  activeNotes: {
    type: Array,
    default: () => []
  },
  highlightColor: {
    type: String,
    default: '#4CAF50'
  }
});

// Refs
const containerRef = ref(null);
const isLoading = ref(false);
const error = ref(null);

// Score renderer instance
let renderer = null;

/**
 * Initialize renderer on mount
 */
onMounted(() => {
  if (!containerRef.value) {
    error.value = 'Container element not found';
    return;
  }
  
  try {
    // Create renderer
    renderer = new ScoreRenderer(containerRef.value);
    
    // Render initial phrase if provided
    if (props.phrase) {
      renderPhrase(props.phrase);
    }
  } catch (err) {
    console.error('Failed to initialize ScoreRenderer:', err);
    error.value = 'Failed to initialize score renderer';
  }
});

/**
 * Cleanup on unmount
 */
onUnmounted(() => {
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
});

/**
 * Watch phrase changes and re-render
 */
watch(
  () => props.phrase,
  (newPhrase) => {
    if (newPhrase && renderer) {
      renderPhrase(newPhrase);
    }
  },
  { deep: true }
);

/**
 * Watch activeNotes changes and highlight without full re-render
 */
watch(
  () => props.activeNotes,
  (newActiveNotes) => {
    if (renderer) {
      highlightNotes(newActiveNotes);
    }
  },
  { deep: true }
);

/**
 * Watch highlight color changes
 */
watch(
  () => props.highlightColor,
  () => {
    if (renderer && props.activeNotes.length > 0) {
      highlightNotes(props.activeNotes);
    }
  }
);

/**
 * Render phrase
 */
function renderPhrase(phrase) {
  if (!renderer) return;
  
  isLoading.value = true;
  error.value = null;
  
  try {
    renderer.render(phrase);
    isLoading.value = false;
  } catch (err) {
    console.error('Failed to render phrase:', err);
    error.value = 'Failed to render musical notation';
    isLoading.value = false;
  }
}

/**
 * Highlight notes
 */
function highlightNotes(noteIndices) {
  if (!renderer) return;
  
  try {
    renderer.highlightNotes(noteIndices, props.highlightColor);
  } catch (err) {
    console.error('Failed to highlight notes:', err);
  }
}

/**
 * Expose methods for parent component
 */
defineExpose({
  renderPhrase,
  highlightNotes
});
</script>

<style scoped>
.sheet-music {
  position: relative;
  width: 100%;
  min-height: 300px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.sheet-music.is-loading {
  opacity: 0.6;
  pointer-events: none;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  z-index: 10;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--primary-500, #3b82f6);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-overlay p {
  margin-top: 16px;
  color: #666;
  font-size: 14px;
}

.error-message {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 24px;
  text-align: center;
}

.error-message p {
  color: #ef4444;
  font-size: 14px;
}

/* Responsive sizing */
@media (max-width: 768px) {
  .sheet-music {
    min-height: 250px;
  }
}

@media (max-width: 480px) {
  .sheet-music {
    min-height: 200px;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .sheet-music {
    background: #1e1e1e;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  
  .loading-overlay {
    background: rgba(30, 30, 30, 0.9);
  }
  
  .loading-overlay p {
    color: #ccc;
  }
}
</style>
