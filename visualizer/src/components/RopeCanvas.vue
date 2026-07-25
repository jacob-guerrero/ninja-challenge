<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import type { Column, Point, SimulationStep } from '../logic/ropeWrap';

const props = defineProps<{
  columns: Column[];
  personStart: Point;
  initialPivotId: number;
  steps: SimulationStep[];
  currentStepIndex: number;
  t: number; // Interpolation factor (0 to 1) for the active step
  activeNinjaPos: Point;
  activeHeading: number;
  interactive: boolean;
}>();

const emit = defineEmits<{
  (e: 'add-column', col: { x: number; y: number }): void;
  (e: 'set-initial-pivot', id: number): void;
  (e: 'move-ninja', pos: Point): void;
}>();

const svgWidth = 800;
const svgHeight = 600;
const svgRef = ref<SVGSVGElement | null>(null);
const isDraggingNinja = ref(false);

// Bounding box calculation for dynamic scaling and centering
const bbox = computed(() => {
  let minX = props.personStart.x;
  let maxX = props.personStart.x;
  let minY = props.personStart.y;
  let maxY = props.personStart.y;

  // Include all columns
  props.columns.forEach((col) => {
    minX = Math.min(minX, col.x);
    maxX = Math.max(maxX, col.x);
    minY = Math.min(minY, col.y);
    maxY = Math.max(maxY, col.y);
  });

  // Include steps positions
  props.steps.forEach((step) => {
    minX = Math.min(minX, step.ninjaStart.x, step.ninjaEnd.x);
    maxX = Math.max(maxX, step.ninjaStart.x, step.ninjaEnd.x);
    minY = Math.min(minY, step.ninjaStart.y, step.ninjaEnd.y);
    maxY = Math.max(maxY, step.ninjaStart.y, step.ninjaEnd.y);
  });

  const width = maxX - minX || 10;
  const height = maxY - minY || 10;
  
  // Responsive margin
  const margin = Math.max(width, height) * 0.25 || 2;

  return {
    minX: minX - margin,
    maxX: maxX + margin,
    minY: minY - margin,
    maxY: maxY + margin,
  };
});

// Conversion functions (Math space -> SVG screen space)
const scaleX = (x: number) => {
  const dx = bbox.value.maxX - bbox.value.minX;
  return ((x - bbox.value.minX) / dx) * svgWidth;
};

const scaleY = (y: number) => {
  const dy = bbox.value.maxY - bbox.value.minY;
  return svgHeight - ((y - bbox.value.minY) / dy) * svgHeight;
};

const scaleLength = (len: number) => {
  const dx = bbox.value.maxX - bbox.value.minX;
  return (len / dx) * svgWidth;
};

// Inverse conversion (SVG screen space -> Math space)
const getMathCoords = (event: MouseEvent) => {
  if (!svgRef.value) return null;
  const rect = svgRef.value.getBoundingClientRect();
  const screenX = ((event.clientX - rect.left) / rect.width) * svgWidth;
  const screenY = ((event.clientY - rect.top) / rect.height) * svgHeight;

  const dx = bbox.value.maxX - bbox.value.minX;
  const dy = bbox.value.maxY - bbox.value.minY;

  const mathX = bbox.value.minX + (screenX / svgWidth) * dx;
  const mathY = bbox.value.minY + ((svgHeight - screenY) / svgHeight) * dy;

  // Round to 2 decimals for cleaner display
  return {
    x: Math.round(mathX * 100) / 100,
    y: Math.round(mathY * 100) / 100,
  };
};

// Grid lines generator
const gridLines = computed(() => {
  const lines: { type: 'v' | 'h'; coord: number; value: number }[] = [];
  const minX = Math.ceil(bbox.value.minX);
  const maxX = Math.floor(bbox.value.maxX);
  const minY = Math.ceil(bbox.value.minY);
  const maxY = Math.floor(bbox.value.maxY);

  // Estimate a clean step size based on bounding box
  const dx = bbox.value.maxX - bbox.value.minX;
  let step = 1;
  if (dx > 50) step = 10;
  else if (dx > 20) step = 5;
  else if (dx > 10) step = 2;
  else if (dx < 3) step = 0.5;

  // Vertical lines
  for (let x = Math.ceil(minX / step) * step; x <= maxX; x += step) {
    lines.push({ type: 'v', coord: scaleX(x), value: Math.round(x * 10) / 10 });
  }
  // Horizontal lines
  for (let y = Math.ceil(minY / step) * step; y <= maxY; y += step) {
    lines.push({ type: 'h', coord: scaleY(y), value: Math.round(y * 10) / 10 });
  }

  return lines;
});

// Calculate current active step if any
const activeStep = computed<SimulationStep | null>(() => {
  if (props.steps.length === 0) return null;
  if (props.currentStepIndex >= 0 && props.currentStepIndex < props.steps.length) {
    return props.steps[props.currentStepIndex];
  }
  return null;
});

// Generate points for the trajectory arc of the active step
const activeArcPoints = computed(() => {
  const step = activeStep.value;
  if (!step) return '';

  const pointsCount = 30;
  const points: string[] = [];

  const startAng = step.startHeading;
  const currentAng = props.activeHeading;

  for (let i = 0; i <= pointsCount; i++) {
    const fraction = i / pointsCount;
    // Clockwise sweep means angle decreases
    const ang = startAng - fraction * (startAng - currentAng);
    const px = step.pivot.x + step.ropeLength * Math.cos(ang);
    const py = step.pivot.y + step.ropeLength * Math.sin(ang);
    points.push(`${scaleX(px)},${scaleY(py)}`);
  }

  return points.join(' ');
});

// Completed rope segment paths
const completedRopeSegments = computed(() => {
  const segments: { x1: number; y1: number; x2: number; y2: number; index: number }[] = [];
  
  // Draw segments from past steps
  const limit = Math.min(props.currentStepIndex, props.steps.length);
  for (let i = 0; i < limit; i++) {
    const s = props.steps[i];
    if (s.nextPivot) {
      segments.push({
        x1: scaleX(s.pivot.x),
        y1: scaleY(s.pivot.y),
        x2: scaleX(s.nextPivot.x),
        y2: scaleY(s.nextPivot.y),
        index: i,
      });
    }
  }
  return segments;
});

// Handle canvas clicks
const onCanvasClick = (event: MouseEvent) => {
  // If dragging ninja, do not trigger column add
  if (isDraggingNinja.value) return;

  const coords = getMathCoords(event);
  if (!coords) return;

  // Check if we clicked on or very close to an existing column (within 0.3 units)
  const clickedCol = props.columns.find(
    (col) => Math.sqrt(Math.pow(col.x - coords.x, 2) + Math.pow(col.y - coords.y, 2)) < 0.4
  );

  if (clickedCol) {
    emit('set-initial-pivot', clickedCol.id);
  } else {
    emit('add-column', coords);
  }
};

// Ninja Drag Handlers
const startNinjaDrag = (event: MouseEvent) => {
  event.stopPropagation();
  isDraggingNinja.value = true;
  window.addEventListener('mousemove', handleNinjaDrag);
  window.addEventListener('mouseup', stopNinjaDrag);
};

const handleNinjaDrag = (event: MouseEvent) => {
  if (!isDraggingNinja.value) return;
  const coords = getMathCoords(event);
  if (coords) {
    emit('move-ninja', coords);
  }
};

const stopNinjaDrag = () => {
  isDraggingNinja.value = false;
  window.removeEventListener('mousemove', handleNinjaDrag);
  window.removeEventListener('mouseup', stopNinjaDrag);
};
</script>

<template>
  <div class="svg-container w-100 position-relative" style="aspect-ratio: 4/3;">
    <svg
      ref="svgRef"
      class="w-100 h-100"
      :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
      @click="onCanvasClick"
      style="cursor: crosshair;"
    >
      <!-- Definition of glow filters for sleek visuals -->
      <defs>
        <radialGradient id="pivotGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#58a6ff" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#58a6ff" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="activePivotGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#2ea043" stop-opacity="0.4" />
          <stop offset="100%" stop-color="#2ea043" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- Grid lines -->
      <g stroke="#21262d" stroke-width="0.8" stroke-dasharray="2,4">
        <line
          v-for="(line, index) in gridLines"
          :key="index"
          :x1="line.type === 'v' ? line.coord : 0"
          :y1="line.type === 'h' ? line.coord : 0"
          :x2="line.type === 'v' ? line.coord : svgWidth"
          :y2="line.type === 'h' ? line.coord : svgHeight"
        />
      </g>

      <!-- Axes labels -->
      <g fill="#8b949e" font-size="10" font-family="monospace">
        <text
          v-for="(line, index) in gridLines"
          :key="'lbl-' + index"
          :x="line.type === 'v' ? line.coord + 4 : 5"
          :y="line.type === 'h' ? line.coord - 4 : svgHeight - 5"
        >
          {{ line.value }}
        </text>
      </g>

      <!-- Active Pivot reach/range circle -->
      <circle
        v-if="activeStep"
        :cx="scaleX(activeStep.pivot.x)"
        :cy="scaleY(activeStep.pivot.y)"
        :r="scaleLength(activeStep.ropeLength)"
        fill="rgba(88, 166, 255, 0.03)"
        stroke="#58a6ff"
        stroke-opacity="0.25"
        stroke-width="1.5"
        stroke-dasharray="5,5"
      />

      <!-- Completed rope segments (from old pivots to next ones) -->
      <g stroke="#8b949e" stroke-width="2.5" stroke-linecap="round">
        <line
          v-for="seg in completedRopeSegments"
          :key="seg.index"
          :x1="seg.x1"
          :y1="seg.y1"
          :x2="seg.x2"
          :y2="seg.y2"
        />
      </g>

      <!-- Trajectory sweep arc (active step) -->
      <polyline
        v-if="activeStep"
        :points="activeArcPoints"
        fill="none"
        stroke="#ff7b72"
        stroke-width="1.5"
        stroke-dasharray="3,3"
        opacity="0.8"
      />

      <!-- Active rope segment (pivot to current ninja position) -->
      <line
        v-if="activeStep"
        :x1="scaleX(activeStep.pivot.x)"
        :y1="scaleY(activeStep.pivot.y)"
        :x2="scaleX(activeNinjaPos.x)"
        :y2="scaleY(activeNinjaPos.y)"
        stroke="#ff7b72"
        stroke-width="3"
        stroke-linecap="round"
        style="filter: drop-shadow(0px 0px 4px rgba(255, 123, 114, 0.6));"
      />

      <!-- Columns (Pivots) rendering -->
      <g v-for="col in columns" :key="col.id">
        <!-- Selection glow -->
        <circle
          :cx="scaleX(col.x)"
          :cy="scaleY(col.y)"
          :r="25"
          :fill="col.id === initialPivotId ? 'url(#activePivotGlow)' : (activeStep && col.id === activeStep.pivot.id ? 'url(#pivotGlow)' : 'none')"
        />
        
        <!-- Physical Column circle -->
        <circle
          :cx="scaleX(col.x)"
          :cy="scaleY(col.y)"
          :r="9"
          :fill="activeStep && col.id === activeStep.pivot.id ? '#2ea043' : (col.id === initialPivotId ? '#1f6feb' : '#30363d')"
          stroke="#f0f6fc"
          :stroke-width="activeStep && col.id === activeStep.pivot.id ? 2.5 : 1.5"
          style="transition: fill 0.3s;"
        />

        <!-- Text label for Pivot IDs -->
        <text
          :x="scaleX(col.x)"
          :y="scaleY(col.y) - 15"
          fill="#c9d1d9"
          font-size="12"
          font-weight="bold"
          text-anchor="middle"
        >
          Col {{ col.id }}
        </text>
      </g>

      <!-- Ninja (Person) rendering -->
      <g
        :transform="`translate(${scaleX(activeNinjaPos.x)}, ${scaleY(activeNinjaPos.y)})`"
        style="cursor: grab;"
        @mousedown="startNinjaDrag"
      >
        <!-- Outer neon indicator -->
        <circle
          cx="0"
          cy="0"
          r="14"
          fill="rgba(248, 81, 73, 0.15)"
          stroke="#f85149"
          stroke-width="1.5"
          style="filter: drop-shadow(0px 0px 6px rgba(248, 81, 73, 0.8));"
        />
        <!-- Inner core -->
        <circle cx="0" cy="0" r="7" fill="#f85149" />
        
        <!-- Small crosshair detail -->
        <line x1="-3" y1="0" x2="3" y2="0" stroke="white" stroke-width="1" />
        <line x1="0" y1="-3" x2="0" y2="3" stroke="white" stroke-width="1" />
      </g>
    </svg>

    <!-- Instructional Overlay Toast -->
    <div class="position-absolute bottom-0 start-0 m-3 p-2 bg-dark rounded border border-secondary text-muted" style="font-size: 11px; pointer-events: none; background-opacity: 0.95;">
      💡 <strong>Interactividad:</strong><br />
      • Clic en espacio vacío: Añadir Columna<br />
      • Clic en columna: Establecer como Pivote Inicial<br />
      • Arrastrar el punto rojo (<span class="text-danger">Ninja</span>): Mover posición inicial
    </div>
  </div>
</template>

<style scoped>
.svg-container {
  user-select: none;
}
</style>
