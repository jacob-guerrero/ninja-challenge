# Plan de Implementación: Visualización de Ninja Rope Wrap

Este documento detalla el plan paso a paso para crear una visualización interactiva del problema "Ninja Rope Wrap". La visualización permitirá a los usuarios observar el comportamiento del algoritmo de manera dinámica, facilitando la comprensión y validación de casos de prueba complejos.

---

## 🛠️ Stack Tecnológico Propuesto
- **Framework Principal:** Vue 3 (Composition API con `<script setup>` y TypeScript)
- **Compilador/Empaquetador:** Vite (Entorno rápido para desarrollo moderno)
- **Estilos:** Bootstrap 5 & Vanilla CSS estructurado para un diseño responsivo y profesional
- **Renderizado Visual:** SVG interactivo embebido en Vue para un control reactivo óptimo y escalabilidad vectorial.

---

## 📋 Fases del Plan de Acción

### Fase 1: Refactorización del Algoritmo
El algoritmo actual en `sol-prueba.ts` está diseñado para devolver únicamente el identificador del último pivote (`finalId`). Para visualizar el proceso paso a paso, debemos modificar el motor para que registre y devuelva el camino completo de la cuerda.
1. **Modificación de la Firma:**
   Modificaremos la función `lastColumn` (o crearemos una versión extendida como `simulateRopeWrap`) para retornar un objeto con:
   - `finalPivotId`: El ID final (resultado original).
   - `history`: Un arreglo de estados/pasos. Cada paso contendrá:
     - `pivot`: El pivote activo actual (objeto `Column`).
     - `heading`: El ángulo de salida del ninja en ese paso.
     - `ropeLength`: La longitud de la cuerda al iniciar ese paso.
     - `ninjaPath`: Las coordenadas iniciales y finales de la rotación en ese paso para dibujar los arcos o las líneas de contacto.
     - `nextPivot`: El pivote detectado y golpeado.

### Fase 2: Configuración del Proyecto (Scaffolding)
Inicializaremos la aplicación web frontend.
1. **Creación del Proyecto:**
   Ejecutaremos la inicialización de un proyecto en una subcarpeta del espacio de trabajo (ej. `visualizer`):
   ```bash
   npx -y create-vite-app@latest ./visualizer --template vue-ts
   ```
2. **Instalación de Dependencias:**
   Instalaremos Bootstrap 5 para el diseño de la interfaz de usuario:
   ```bash
   npm install bootstrap @types/bootstrap
   ```
3. **Estructura del Proyecto:**
   - `src/logic/ropeWrap.ts`: Copia optimizada de la lógica de resolución con el historial del recorrido.
   - `src/components/RopeCanvas.vue`: El componente SVG de renderizado de la simulación.
   - `src/components/ControlPanel.vue`: Panel de control de simulación y carga de casos de prueba.
   - `src/App.vue`: Coordinador principal del estado de la aplicación.

### Fase 3: Componente de Renderizado SVG (`RopeCanvas.vue`)
Crearemos un componente reactivo que dibuje la escena utilizando elementos vectoriales nativos.
1. **Elementos del Canvas:**
   - **Pivotes (Columnas):** Representados como círculos SVG (`<circle>`). Tendrán diferentes estados visuales (pivote actual: verde, pivote golpeado en el historial: azul/púrpura, columnas normales: gris).
   - **El Ninja:** Un indicador visual del punto inicial y sus coordenadas.
   - **Cuerda Envueltada:** Líneas SVG (`<line>` o `<path>`) que conectan los pivotes recorridos en el orden secuencial del historial.
   - **Radio de Alcance:** Un círculo translúcido (`<circle>` con opacidad y trazo punteado) centrado en el pivote actual que representa la longitud de la cuerda restante (`ropeLength`), mostrando visualmente qué columnas están al alcance en cada paso.
2. **Escalado Dinámico:**
   Implementaremos una función de normalización matemática para ajustar automáticamente las coordenadas de las columnas al tamaño de la pantalla (ViewBox de SVG), permitiendo soportar coordenadas negativas y de cualquier escala (ej. metros a píxeles).

### Fase 4: Panel de Control e Interactividad (`ControlPanel.vue`)
Añadiremos interactividad usando Bootstrap 5.
1. **Controles de Reproducción:**
   - Botones para: `Reproducir/Pausar` (Play/Pause), `Siguiente Paso` (Step Forward), `Paso Anterior` (Step Backward) y `Reiniciar` (Reset).
   - Barra deslizante (slider) para ajustar la velocidad de la animación.
2. **Selector de Casos de Prueba (Test Cases):**
   - Selector rápido para cargar los tres casos de prueba del desafío (TC1, TC2, TC3) con un solo clic.
   - Formulario para añadir o mover columnas de manera interactiva o editar sus coordenadas manualmente.
3. **Panel de Información en Tiempo Real:**
   - Tabla informativa que muestra:
     - Longitud actual de la cuerda.
     - Ángulo actual en grados.
     - Historial de pivotes golpeados en orden.
