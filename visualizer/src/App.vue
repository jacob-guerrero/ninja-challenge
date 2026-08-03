<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import type { Column, Point, SimulationStep } from './logic/ropeWrap';
import { simulateRopeWrap, getDistance } from './logic/ropeWrap';
import RopeCanvas from './components/RopeCanvas.vue';

// Preset Test Cases
const presets = [
  {
    name: 'TC1 (3 Cols, 2 Vueltas)',
    columns: [
      { id: 0, x: 0, y: 0 },
      { id: 1, x: 3, y: 0 },
      { id: 2, x: 3, y: 2 },
    ],
    personStart: { x: 0, y: -6 },
    initialPivotId: 0,
  },
  {
    name: 'TC2 (5 Cols, 2 Vueltas)',
    columns: [
      { id: 0, x: 0, y: 0 },
      { id: 1, x: 4, y: 1 },
      { id: 2, x: 1, y: 4 },
      { id: 3, x: -2, y: 2 },
      { id: 4, x: -1, y: -2 },
    ],
    personStart: { x: 0, y: -8 },
    initialPivotId: 0,
  },
  {
    name: 'TC3 (7 Cols, 3 Vueltas)',
    columns: [
      { id: 0, x: 0, y: 0 },
      { id: 1, x: 4, y: 1 },
      { id: 2, x: 1, y: 4 },
      { id: 3, x: -1, y: 3 },
      { id: 4, x: -3, y: 0 },
      { id: 5, x: -2, y: -2 },
      { id: 6, x: 1, y: -1 },
    ],
    personStart: { x: 0, y: -9 },
    initialPivotId: 0,
  },
];

// Reactive State
const columns = ref<Column[]>([...presets[0].columns]);
const personStart = ref<Point>({ ...presets[0].personStart });
const initialPivotId = ref<number>(presets[0].initialPivotId);
const selectedPresetIndex = ref<number>(0);

// Playback State
const isPlaying = ref(false);
const currentStepIndex = ref(0);
const t = ref(0); // 0 to 1 progress of the current step
const animationSpeed = ref(0.015); // Amount of 't' to add per frame
let animationFrameId: number | null = null;

// Manual form input bindings
const newColX = ref(0);
const newColY = ref(0);

// Computed: Simulation results based on current state
const simulation = computed(() => {
  try {
    return simulateRopeWrap(columns.value, personStart.value, initialPivotId.value);
  } catch (error) {
    console.error(error);
    return { finalPivotId: -1, steps: [] as SimulationStep[] };
  }
});

const steps = computed(() => simulation.value.steps);
const finalPivotId = computed(() => simulation.value.finalPivotId);

// Computed: Current ninja coordinates and rope heading
const activeNinjaState = computed(() => {
  const stepList = steps.value;
  if (stepList.length === 0) {
    return { pos: personStart.value, heading: 0 };
  }

  // If index is past the end of the simulation
  if (currentStepIndex.value >= stepList.length) {
    const lastStep = stepList[stepList.length - 1];
    return { pos: lastStep.ninjaEnd, heading: lastStep.endHeading };
  }

  const step = stepList[currentStepIndex.value];
  if (step.nextPivot === null) {
    return { pos: step.ninjaStart, heading: step.startHeading };
  }

  // Interpolate angle clockwise (subtraction)
  const angle = step.startHeading - t.value * step.sweepAngle;
  const pos = {
    x: step.pivot.x + step.ropeLength * Math.cos(angle),
    y: step.pivot.y + step.ropeLength * Math.sin(angle),
  };
  return { pos, heading: angle };
});

const activeNinjaPos = computed(() => activeNinjaState.value.pos);
const activeHeading = computed(() => activeNinjaState.value.heading);

// Computed: Timeline scrubber value (0 to total steps count)
const scrubberValue = computed({
  get() {
    return currentStepIndex.value + t.value;
  },
  set(val: number) {
    pause();
    const stepCount = steps.value.length;
    if (stepCount === 0) return;
    
    // Clamp
    const clampedVal = Math.max(0, Math.min(stepCount - 0.0001, val));
    currentStepIndex.value = Math.floor(clampedVal);
    t.value = clampedVal - currentStepIndex.value;
  },
});

// Watch state changes to reset playback to step 0
const resetPlayback = () => {
  pause();
  currentStepIndex.value = 0;
  t.value = 0;
};

watch([columns, personStart, initialPivotId], resetPlayback, { deep: true });

// Presets loader
const loadPreset = (index: number) => {
  selectedPresetIndex.value = index;
  columns.value = JSON.parse(JSON.stringify(presets[index].columns));
  personStart.value = { ...presets[index].personStart };
  initialPivotId.value = presets[index].initialPivotId;
};

// Playback Logic Loop
const animate = () => {
  if (!isPlaying.value) return;

  const totalSteps = steps.value.length;
  if (totalSteps === 0) {
    pause();
    return;
  }

  // If we are at the end, stop playing
  if (currentStepIndex.value >= totalSteps - 1 && t.value >= 1.0) {
    pause();
    return;
  }

  t.value += animationSpeed.value;
  
  if (t.value >= 1) {
    t.value = 0;
    currentStepIndex.value++;
    
    // If the step we just entered has no next pivot (termination), stop
    if (
      currentStepIndex.value >= totalSteps || 
      steps.value[currentStepIndex.value].nextPivot === null
    ) {
      pause();
      currentStepIndex.value = Math.min(currentStepIndex.value, totalSteps - 1);
      t.value = 1.0; // clamp at the end
    }
  }

  animationFrameId = requestAnimationFrame(animate);
};

const play = () => {
  if (isPlaying.value) return;
  
  // If we are at the very end, reset before playing
  if (currentStepIndex.value >= steps.value.length - 1 && t.value >= 0.99) {
    currentStepIndex.value = 0;
    t.value = 0;
  }

  isPlaying.value = true;
  animationFrameId = requestAnimationFrame(animate);
};

const pause = () => {
  isPlaying.value = false;
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
};

const reset = () => {
  resetPlayback();
};

const stepForward = () => {
  pause();
  if (currentStepIndex.value < steps.value.length - 1) {
    currentStepIndex.value++;
    t.value = 0;
  } else {
    t.value = 1.0;
  }
};

const stepBackward = () => {
  pause();
  if (t.value > 0) {
    t.value = 0;
  } else if (currentStepIndex.value > 0) {
    currentStepIndex.value--;
    t.value = 0;
  }
};

// Custom interactive events
const handleAddColumn = (col: { x: number; y: number }) => {
  // Generate next unique ID
  const nextId = columns.value.length > 0 
    ? Math.max(...columns.value.map(c => c.id)) + 1 
    : 0;
  
  columns.value.push({ id: nextId, x: col.x, y: col.y });
  selectedPresetIndex.value = -1; // set to custom
};

const handleSetInitialPivot = (id: number) => {
  initialPivotId.value = id;
  selectedPresetIndex.value = -1; // set to custom
};

const handleMoveNinja = (pos: Point) => {
  personStart.value = pos;
  selectedPresetIndex.value = -1; // set to custom
};

const removeColumn = (id: number) => {
  if (columns.value.length <= 2) {
    alert("Se necesitan al menos 2 columnas para simular.");
    return;
  }
  columns.value = columns.value.filter(col => col.id !== id);
  if (initialPivotId.value === id) {
    initialPivotId.value = columns.value[0].id;
  }
  selectedPresetIndex.value = -1; // set to custom
};

const addNewColumnManual = () => {
  handleAddColumn({ x: newColX.value, y: newColY.value });
  newColX.value = 0;
  newColY.value = 0;
};

const clearAllColumns = () => {
  columns.value = [
    { id: 0, x: 0, y: 0 },
    { id: 1, x: 2, y: 2 }
  ];
  initialPivotId.value = 0;
  personStart.value = { x: 0, y: -4 };
  selectedPresetIndex.value = -1;
};

onUnmounted(() => {
  pause();
});
</script>

<template>
  <div class="container py-4">
    <!-- Header -->
    <header class="d-flex align-items-center justify-content-between mb-4 border-bottom border-secondary pb-3">
      <div>
        <h1 class="h3 fw-bold text-white mb-1 glow-primary">Ninja Rope Wrap</h1>
        <p class="text-muted mb-0">Simulador interactivo del envoltorio de cuerda del ninja</p>
      </div>
    </header>

    <div class="row g-4">
      <!-- Left sidebar: Controls and inputs -->
      <div class="col-lg-4">
        <!-- Test Cases Selector -->
        <div class="premium-card p-3 mb-4">
          <h5 class="fw-bold mb-3 text-white">Casos de Prueba</h5>
          <div class="d-flex flex-column gap-2">
            <button
              v-for="(preset, idx) in presets"
              :key="idx"
              @click="loadPreset(idx)"
              class="btn text-start w-100 py-2 border-0"
              :class="selectedPresetIndex === idx ? 'btn-primary' : 'btn-dark text-muted'"
            >
              <div class="d-flex justify-content-between align-items-center">
                <span>{{ preset.name }}</span>
                <span v-if="selectedPresetIndex === idx" class="badge bg-light text-dark">Activo</span>
              </div>
            </button>
            <button
              @click="clearAllColumns"
              class="btn btn-outline-danger text-start w-100 py-2"
              :class="{ 'active': selectedPresetIndex === -1 }"
            >
              🧹 Limpiar y Crear Personalizado
            </button>
          </div>
        </div>

        <!-- Simulation Results Alert -->
        <div class="premium-card p-3 mb-4 border-success" style="background: rgba(46, 160, 67, 0.05);">
          <h5 class="fw-bold text-success mb-2">⛳ Resultado Final</h5>
          <div class="fs-5">
            Pivote de Envoltura Final:
            <span class="fw-bold text-white bg-success px-2 py-1 rounded ms-1">
              Columna {{ finalPivotId }}
            </span>
          </div>
          <small class="text-muted d-block mt-2">
            Total de envolturas detectadas: {{ steps.length - 1 }}
          </small>
        </div>

        <!-- Manual Column & Ninja Inputs -->
        <div class="premium-card p-3 mb-4">
          <h5 class="fw-bold mb-3 text-white">Configuración de Coordenadas</h5>
          
          <!-- Ninja start coordinates -->
          <div class="mb-3">
            <label class="form-label text-muted small fw-bold">Ninja Inicio (Person Start)</label>
            <div class="row g-2">
              <div class="col">
                <div class="input-group input-group-sm">
                  <span class="input-group-text bg-dark border-secondary text-muted">X</span>
                  <input
                    type="number"
                    step="0.5"
                    v-model.number="personStart.x"
                    class="form-control bg-dark border-secondary text-white"
                  />
                </div>
              </div>
              <div class="col">
                <div class="input-group input-group-sm">
                  <span class="input-group-text bg-dark border-secondary text-muted">Y</span>
                  <input
                    type="number"
                    step="0.5"
                    v-model.number="personStart.y"
                    class="form-control bg-dark border-secondary text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Add column manual -->
          <div class="mb-3">
            <label class="form-label text-muted small fw-bold">Añadir Columna</label>
            <div class="row g-2">
              <div class="col">
                <div class="input-group input-group-sm">
                  <span class="input-group-text bg-dark border-secondary text-muted">X</span>
                  <input
                    type="number"
                    step="0.5"
                    v-model.number="newColX"
                    class="form-control bg-dark border-secondary text-white"
                  />
                </div>
              </div>
              <div class="col">
                <div class="input-group input-group-sm">
                  <span class="input-group-text bg-dark border-secondary text-muted">Y</span>
                  <input
                    type="number"
                    step="0.5"
                    v-model.number="newColY"
                    class="form-control bg-dark border-secondary text-white"
                  />
                </div>
              </div>
              <div class="col-auto">
                <button @click="addNewColumnManual" class="btn btn-sm btn-primary">➕</button>
              </div>
            </div>
          </div>

          <!-- Columns List Table -->
          <label class="form-label text-muted small fw-bold mb-1">Lista de Columnas (Pivotes)</label>
          <div class="overflow-auto border border-secondary rounded bg-dark" style="max-height: 180px;">
            <table class="table table-dark table-sm mb-0 align-middle">
              <thead>
                <tr class="text-muted">
                  <th>ID</th>
                  <th>Coord</th>
                  <th class="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="col in columns" :key="col.id">
                  <td>
                    <span
                      class="badge"
                      :class="col.id === initialPivotId ? 'bg-primary' : 'bg-secondary'"
                    >
                      Col {{ col.id }}
                    </span>
                  </td>
                  <td class="font-monospace text-muted" style="font-size: 12px;">
                    ({{ col.x }}, {{ col.y }})
                  </td>
                  <td class="text-end">
                    <button
                      @click="removeColumn(col.id)"
                      class="btn btn-link text-danger p-0 px-2 fs-6"
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Right column: Main Canvas & Timeline -->
      <div class="col-lg-8">
        <!-- SVG Canvas -->
        <RopeCanvas
          :columns="columns"
          :person-start="personStart"
          :initial-pivot-id="initialPivotId"
          :steps="steps"
          :current-step-index="currentStepIndex"
          :t="t"
          :active-ninja-pos="activeNinjaPos"
          :active-heading="activeHeading"
          :interactive="true"
          @add-column="handleAddColumn"
          @set-initial-pivot="handleSetInitialPivot"
          @move-ninja="handleMoveNinja"
        />

        <!-- Playback Controller Card -->
        <div class="premium-card p-3 mt-4">
          <!-- Timeline Scrubber -->
          <div class="mb-3 d-flex align-items-center gap-3">
            <span class="text-muted font-monospace small">Paso 0</span>
            <input
              type="range"
              min="0"
              :max="steps.length > 0 ? steps.length : 1"
              step="0.001"
              v-model.number="scrubberValue"
              class="custom-range flex-grow-1"
            />
            <span class="text-muted font-monospace small">Fin (Paso {{ steps.length - 1 }})</span>
          </div>

          <!-- Controls panel -->
          <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <!-- Buttons -->
            <div class="d-flex align-items-center gap-2">
              <button
                @click="reset"
                class="btn-control"
                title="Reiniciar"
              >
                ⏮
              </button>
              <button
                @click="stepBackward"
                class="btn-control"
                title="Retroceder Paso"
              >
                ◀
              </button>
              <button
                v-if="!isPlaying"
                @click="play"
                class="btn-control bg-primary text-dark border-primary"
                title="Reproducir"
              >
                ▶
              </button>
              <button
                v-else
                @click="pause"
                class="btn-control bg-warning text-dark border-warning"
                title="Pausar"
              >
                ⏸
              </button>
              <button
                @click="stepForward"
                class="btn-control"
                title="Avanzar Paso"
              >
                ▶▶
              </button>
            </div>

            <!-- Current playback details -->
            <div class="text-end">
              <div class="text-muted small">
                Estado Actual:
                <span class="text-white fw-bold">
                  Paso {{ currentStepIndex }} / {{ steps.length - 1 }}
                </span>
              </div>
              <div class="font-monospace text-primary small" v-if="steps[currentStepIndex]">
                Longitud de cuerda: {{ steps[currentStepIndex].ropeLength.toFixed(2) }}m
              </div>
            </div>

            <!-- Playback Speed -->
            <div class="d-flex align-items-center gap-2">
              <label class="text-muted small fw-bold">Velocidad</label>
              <select
                v-model.number="animationSpeed"
                class="form-select form-select-sm bg-dark border-secondary text-white"
                style="width: 100px;"
              >
                <option :value="0.005">Lento (0.5x)</option>
                <option :value="0.015">Normal (1.0x)</option>
                <option :value="0.03">Rápido (2.0x)</option>
                <option :value="0.06">Instantáneo (4.0x)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Simulation Step-by-Step Logs -->
        <div class="premium-card p-3 mt-4">
          <h5 class="fw-bold mb-3 text-white">Log de la Simulación</h5>
          <div class="overflow-auto" style="max-height: 200px;">
            <table class="table table-dark table-striped table-hover table-sm mb-0 align-middle">
              <thead>
                <tr class="text-muted">
                  <th>#</th>
                  <th>Pivote</th>
                  <th>Longitud Cuerda</th>
                  <th>Sentido Horario</th>
                  <th>Próximo Pivote</th>
                  <th>Longitud Restante</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(step, idx) in steps"
                  :key="idx"
                  :class="{ 'table-primary text-white': currentStepIndex === idx }"
                  style="cursor: pointer;"
                  @click="scrubberValue = idx"
                >
                  <td class="fw-bold">{{ idx }}</td>
                  <td>Col {{ step.pivot.id }}</td>
                  <td class="font-monospace">{{ step.ropeLength.toFixed(2) }}</td>
                  <td>-{{ ((step.sweepAngle * 180) / Math.PI).toFixed(0) }}°</td>
                  <td>
                    <span v-if="step.nextPivot" class="badge bg-secondary">
                      Col {{ step.nextPivot.id }}
                    </span>
                    <span v-else class="text-muted italic small">Término (Parada)</span>
                  </td>
                  <td class="font-monospace">
                    {{ step.nextPivot ? (step.ropeLength - getDistance(step.pivot, step.nextPivot)).toFixed(2) : '0.00' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Apply Outfit font globally to Bootstrap containers */
.container {
  font-family: 'Outfit', sans-serif;
}
</style>
