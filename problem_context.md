# Desafío: Ninja Rope Wrap — AI-Assisted Coding Challenge

Este documento contiene la descripción oficial del problema, las reglas de simulación, el sistema de coordenadas y los casos de prueba provistos para el desafío "Ninja Rope Wrap".

---

## 📝 Descripción del Problema
Un ninja está atrapado en una habitación y, por encima de él, hay múltiples columnas horizontales a las que puede enganchar su cuerda. Una vez que sujeta su cuerda a una columna, el ninja se mueve en sentido horario, sostenido por la cuerda (la gravedad no importa).

Cuando la cuerda hace contacto con otra columna a mitad del balanceo, esa columna se convierte instantáneamente en el nuevo punto de pivote (pivot point). El ninja comienza entonces a girar alrededor de esa columna.

No existen paredes que afecten el giro del ninja, únicamente las columnas horizontales.

### Datos de Entrada
- La posición de todas las columnas.
- La posición inicial del ninja.
- La columna inicial a la que se engancha la cuerda del ninja.

La longitud inicial de la cuerda se calcula a partir de la posición inicial del ninja y la primera columna de pivote.

### Tarea
Calcular la columna final alrededor de la cual el ninja termina girando.

---

## 🌐 Sistema de Coordenadas
- Usar coordenadas matemáticas estándar:
  - El eje $x$ aumenta hacia la derecha.
  - El eje $y$ aumenta hacia arriba.
- El sentido horario (clockwise) significa un ángulo decreciente (ej. la secuencia es $0^\circ \to 270^\circ \to 180^\circ \to 90^\circ \to 0^\circ$).

---

## 🏁 Estado de Finalización
La simulación finaliza cuando ocurre una de las siguientes dos condiciones:
1. Ninguna columna (distinta del pivote actual) se encuentra dentro de la longitud actual de la cuerda.
2. La persona completa un giro completo de $360^\circ$ sin que la cuerda toque ninguna columna.

Retornar el ID del pivote actual cuando se cumpla alguna de estas condiciones.

---

## 🛠️ Firma de la Función

```typescript
type Column = { id: number; x: number; y: number }; 
type Point  = { x: number; y: number }; 

function lastColumn( 
  columns: Column[],        // Todas las columnas, incluyendo el pivote inicial
  personStart: Point,       // Posición inicial de la persona (ninja)
  initialPivotId: number    // ID de la primera columna a la que se sujeta la cuerda
): number                   // ID de la última columna de la cual la persona cuelga
```

---

## 🧪 Casos de Prueba (Samples)

* **TC1:** 3 columnas, 2 envolturas $\to$ Columna final: `1`
  - Columnas: `0(0,0)`, `1(3,0)`, `2(3,2)`
  - Posición Ninja (Person): `(0, -6)`
  - Pivote inicial: `0`
  
* **TC2:** 5 columnas, 2 envolturas $\to$ Columna final: `3`
  - Columnas: `0(0,0)`, `1(4,1)`, `2(1,4)`, `3(-2,2)`, `4(-1,-2)`
  - Posición Ninja (Person): `(0, -8)`
  - Pivote inicial: `0`

* **TC3:** 7 columnas, 3 envolturas $\to$ Columna final: `3`
  - Columnas: `0(0,0)`, `1(4,1)`, `2(1,4)`, `3(-1,3)`, `4(-3,0)`, `5(-2,-2)`, `6(1,-1)`
  - Posición Ninja (Person): `(0, -9)`
  - Pivote inicial: `0`
