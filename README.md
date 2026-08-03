# Ninja Rope Wrap — AI-Assisted Coding Challenge

Este repositorio contiene la solución e implementación algorítmica para el desafío **"Ninja Rope Wrap"**, junto con su visualizador interactivo desarrollado en Vue 3 y TypeScript.

Demo: **[Ver Demo en Vivo (Interactive Visualizer)](https://ninja-challenge.vercel.app/)**

---

## 📝 Descripción del Problema

Un ninja suspendido por una cuerda gira en sentido horario (**clockwise**) alrededor de una columna horizontal que actúa como pivote inicial. Durante su trayectoria, si la cuerda hace contacto con otra columna dentro de su rango de alcance (longitud actual de la cuerda), dicha columna se convierte inmediatamente en el nuevo pivote de rotación, reduciendo la longitud de la cuerda libre por la distancia recorrida entre ambos pivotes.

### Criterio de Parada (Fin de la Simulación)
La simulación concluye cuando se cumple alguna de estas condiciones:
1. **Sin columnas al alcance:** No hay más columnas dentro de la longitud actual de la cuerda (distancia del pivote a la columna > longitud de la cuerda).
2. **Giro libre de 360°:** El ninja realiza un giro completo de 360 grados sin que la cuerda toque ninguna columna.

---

## 🛠️ Enfoque Algorítmico y Matemático

La solución implementada en sol-prueba.ts aborda el problema de la siguiente manera:

1. **Cálculo de Distancias:** Usamos la distancia euclidiana estándar para verificar si una columna es físicamente alcanzable por la cuerda desde el pivote actual.
2. **Barrido Angular Horario (Clockwise Sweep):**
   - Usamos `Math.atan2` para obtener la orientación angular (de $-\pi$ a $\pi$ radianes) del ninja y de cada columna potencial con respecto al pivote activo.
   - El barrido horario implica que los ángulos disminuyen. Calculamos el ángulo de barrido necesario para intersectar cada columna mediante la resta de orientaciones, normalizándola en el rango $[0, 2\pi)$.
3. **Resolución de Colinealidad:**
   - Si múltiples columnas se encuentran en el mismo ángulo exacto de barrido (colineales), la cuerda impactará primero la columna que esté **más cercana** físicamente. Se implementó esta condición de desempate comparando las distancias de los candidatos colineales.
4. **Manejo de Precisión de Punto Flotante:**
   - Para evitar errores causados por la imprecisión del tipo `number` (IEEE 754), se utiliza una tolerancia de precisión constante `EPSILON = 1e-9` en todas las comparaciones de distancia y ángulos de barrido.

---

## 📂 Estructura del Repositorio

* **[sol-prueba.ts](./sol-prueba.ts):** Código fuente de la solución en TypeScript. Contiene los tipos de datos principales, funciones auxiliares de geometría y la simulación principal.
* **[problem_context.md](./problem_context.md):** Especificaciones detalladas del desafío, reglas del sistema de coordenadas y casos de prueba oficiales.
* **[plan.md](./plan.md):** Plan estructurado de arquitectura y diseño para construir una aplicación interactiva que visualice este algoritmo.

---

## 🚀 Cómo Ejecutar la Solución

El código está escrito en **TypeScript** standalone. Para ejecutarlo directamente puedes utilizar `ts-node` o transpilarlo a JavaScript:

### Requisitos Previos
Tener [Node.js](https://nodejs.org/) instalado.

### Opción 1: Ejecutar con `ts-node` (Recomendado)
Puedes ejecutar el archivo de TypeScript directamente sin compilarlo manualmente:
```bash
# Instalar ts-node de forma global (o ejecutar vía npx)
npx ts-node sol-prueba.ts
```

### Opción 2: Compilar y Ejecutar con Node.js
1. Instala el compilador de TypeScript si no lo tienes:
   ```bash
   npm install -g typescript
   ```
2. Compila el archivo a JavaScript:
   ```bash
   tsc sol-prueba.ts
   ```
3. Ejecuta el archivo resultante:
   ```bash
   node sol-prueba.js
   ```

---

## 🧪 Casos de Prueba Incluidos
El archivo de solución incluye por defecto un bloque de prueba básico al final. Los casos especificados en el desafío son:
- **TC1:** 3 columnas $\to$ Columna final esperada: `1`
- **TC2:** 5 columnas $\to$ Columna final esperada: `3`
- **TC3:** 7 columnas $\to$ Columna final esperada: `3`
