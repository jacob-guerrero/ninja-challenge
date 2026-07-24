type Column = { id: number; x: number; y: number };
type Point = { x: number; y: number };

/**
 * Calculates the Euclidean distance between two points.
 */
function getDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates the clockwise angular sweep required to move from the
 * current heading to a target heading.
 * Both headings are expected in radians as returned by Math.atan2 [-PI, PI].
 */
function getClockwiseSweep(
  currentHeading: number,
  targetHeading: number,
): number {
  const EPSILON = 1e-9;
  let sweep = currentHeading - targetHeading;

  // Normalize sweep into the [0, 2*PI) range, respecting epsilon to avoid
  // floating-point precision causing a near-zero angle to jump to 2*PI.
  while (sweep < -EPSILON) sweep += 2 * Math.PI;
  while (sweep >= 2 * Math.PI - EPSILON) sweep -= 2 * Math.PI;
  if (sweep < 0) sweep = 0; // clamp slight negative zeroes

  return sweep;
}

export type SimulationStep = {
  stepIndex: number;
  pivot: Column;
  ropeLength: number;
  startHeading: number;
  endHeading: number;
  sweepAngle: number;
  ninjaStart: Point;
  ninjaEnd: Point;
  nextPivot: Column | null;
};

export type SimulationResult = {
  finalPivotId: number;
  steps: SimulationStep[];
};

/**
 * Simulates the Ninja Rope Wrap to determine the final pivot column,
 * recording all intermediate states for visualization.
 */
export function simulateRopeWrap(
  columns: Column[],
  personStart: Point,
  initialPivotId: number,
): SimulationResult {
  const EPSILON = 1e-9;
  const steps: SimulationStep[] = [];

  let currentPivot = columns.find((col) => col.id === initialPivotId);
  if (!currentPivot) {
    throw new Error(`Initial pivot with ID ${initialPivotId} not found.`);
  }

  let ropeLength = getDistance(currentPivot, personStart);
  let currentHeading = Math.atan2(
    personStart.y - currentPivot.y,
    personStart.x - currentPivot.x,
  );
  let currentNinjaPos = { ...personStart };
  let stepIndex = 0;

  while (true) {
    let nextPivot: Column | null = null;
    let minSweep = Infinity;
    let minDistToNextPivot = Infinity;

    // Evaluate all columns to find the first one intersected by the clockwise sweep
    for (const col of columns) {
      if (col.id === currentPivot.id) continue;

      const dist = getDistance(currentPivot, col);

      // If the column is completely out of reach, it cannot be hit
      if (dist > ropeLength + EPSILON) continue;

      const targetHeading = Math.atan2(
        col.y - currentPivot.y,
        col.x - currentPivot.x,
      );

      const sweep = getClockwiseSweep(currentHeading, targetHeading);

      // Check if this column is hit earlier in the sweep
      if (sweep < minSweep - EPSILON) {
        minSweep = sweep;
        minDistToNextPivot = dist;
        nextPivot = col;
      }
      // Handle collinear tie-breakers: if multiple columns fall on the exact
      // same angle, the rope hits the closest one first.
      else if (Math.abs(sweep - minSweep) <= EPSILON) {
        if (dist < minDistToNextPivot) {
          minSweep = sweep;
          minDistToNextPivot = dist;
          nextPivot = col;
        }
      }
    }

    // Termination Condition 1 & 2:
    // No reachable columns found, or a full 360-sweep completed without interference
    if (!nextPivot) {
      steps.push({
        stepIndex,
        pivot: currentPivot,
        ropeLength,
        startHeading: currentHeading,
        endHeading: currentHeading - 2 * Math.PI,
        sweepAngle: 2 * Math.PI,
        ninjaStart: currentNinjaPos,
        ninjaEnd: currentNinjaPos,
        nextPivot: null,
      });

      return {
        finalPivotId: currentPivot.id,
        steps,
      };
    }

    const endHeading = Math.atan2(
      nextPivot.y - currentPivot.y,
      nextPivot.x - currentPivot.x,
    );

    const ninjaEnd = {
      x: currentPivot.x + ropeLength * Math.cos(endHeading),
      y: currentPivot.y + ropeLength * Math.sin(endHeading),
    };

    // Apply state changes for the next iteration
    steps.push({
      stepIndex,
      pivot: currentPivot,
      ropeLength,
      startHeading: currentHeading,
      endHeading,
      sweepAngle: minSweep,
      ninjaStart: currentNinjaPos,
      ninjaEnd,
      nextPivot,
    });

    ropeLength -= minDistToNextPivot;
    currentHeading = endHeading;
    currentPivot = nextPivot;
    currentNinjaPos = ninjaEnd;
    stepIndex++;
  }
}

/**
 * Simulates the Ninja Rope Wrap to determine the final pivot column.
 * Backward compatible wrapper for the challenge submission.
 */
export function lastColumn(
  columns: Column[],
  personStart: Point,
  initialPivotId: number,
): number {
  return simulateRopeWrap(columns, personStart, initialPivotId).finalPivotId;
}

// Prueba basica
const testColumns: Column[] = [
  { id: 1, x: 0, y: 0 },
  { id: 2, x: 4, y: 0 },
  { id: 3, x: 2, y: 3 },
];

const startPoint: Point = { x: 0, y: 5 };
const initialId = 1;

console.log(
  `--- Ejecutando prueba con startPoint: x = ${startPoint.x}, y = ${startPoint.y} , y initialId = ${1}`,
);
const finalId = lastColumn(testColumns, startPoint, initialId);
console.log(`Final wrapped column ID: ${finalId}`);
