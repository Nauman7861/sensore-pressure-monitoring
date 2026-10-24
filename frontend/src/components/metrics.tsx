export type HeatmapFrame = number[][]; 

function flatten(frame: HeatmapFrame): number[] {
  return frame.flat();
}

function getValidPeak(frame: HeatmapFrame, threshold: number): number {
  const rows = frame.length;
  const cols = frame[0].length;

  const visited = Array.from({ length: rows }, () =>
    Array(cols).fill(false)
  );

  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  let validPeak = -Infinity;

  function dfs(r: number, c: number) {
    const stack = [[r, c]];
    let count = 0;
    let localPeak = -Infinity;

    while (stack.length) {
      const [x, y] = stack.pop()!;
      if (
        x < 0 ||
        y < 0 ||
        x >= rows ||
        y >= cols ||
        visited[x][y] ||
        frame[x][y] <= threshold
      )
        continue;

      visited[x][y] = true;

      count++;
      localPeak = Math.max(localPeak, frame[x][y]);

      for (const [dx, dy] of directions) {
        stack.push([x + dx, y + dy]);
      }
    }

    return { count, localPeak };
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!visited[r][c] && frame[r][c] > threshold) {
        const region = dfs(r, c);

        if (region.count >= 10) {
          validPeak = Math.max(validPeak, region.localPeak);
        }
      }
    }
  }

  return Number.isFinite(validPeak) ? validPeak : 0;
}

export function computeMetricsFromFrame(
  frame: HeatmapFrame,
  opts?: {
    units?: "mmHg" | "raw";
    contactThreshold?: number;
    highPressureThreshold?: number;
  }
) {
  const units = opts?.units ?? "raw";

  const contactThreshold =
    opts?.contactThreshold ?? (units === "mmHg" ? 5 : 50);

  const highThr =
    opts?.highPressureThreshold ?? (units === "mmHg" ? 60 : 1000);

  const rows = frame.length;
  const cols = frame[0].length;
  const totalCells = rows * cols;  // 👈 32×32=1024, explicit

  let sumContact = 0;
  let activeCells = 0;
  let highCount = 0;

  // 👈 2D SCAN - matches Python frame iteration exactly
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = frame[r][c]; 
      
      if (v > 10) {
        activeCells++;
        sumContact += v;
      }
      
      if (v >= highThr) {
        highCount++;
      }
    }
  }
  const RAW_MAX = 1024;
  const MMHG_MAX = 200;

  let peak = getValidPeak(frame, contactThreshold);

  // Convert to estimated mmHg
  const peakMmHg = Math.max(0, Math.min(MMHG_MAX, (peak / RAW_MAX) * MMHG_MAX));

  // Now peakMmHg contains the mmHg value and you can use it everywhere
  peak = peakMmHg;

  const contactArea = (activeCells / totalCells) * 100;
  let avgOnContact = activeCells ? sumContact / activeCells : 0;

  const avgOnContactMmHg = Math.max(0, Math.min(MMHG_MAX, (avgOnContact / RAW_MAX) * MMHG_MAX));
  avgOnContact = avgOnContactMmHg;

  const highAreaPct = (highCount / totalCells) * 100;

const ppi_raw = peak;
const contact_area_pct = contactArea;
const is_high_pressure = highCount > 0; 

let pressure_score = 0;

if (peak < 32) pressure_score = 0.5;
else if (peak < 40) pressure_score = 1.5;
else if (peak < 60) pressure_score = 3.0;
else if (peak < 80) pressure_score = 4.5;
else pressure_score = 5.0;





const high_pressure_bonus = is_high_pressure ? 2.0 : 0.0;

const distribution_score =
  contactArea >= 70 ? 0 :
  contactArea >= 55 ? 1 :
  contactArea >= 40 ? 2 :
  3;

const hotspot_score = highCount > 0 ? 2 : 0;

const riskScore = Math.min(pressure_score + distribution_score + hotspot_score, 10);
if (activeCells === 0) {
  return {
    peakPressure: 0,
    contactArea: 0,
    riskScore: 0,
    avgOnContact: 0,
    hasData: false,
  };
}

  return {
    peakPressure: peak,
    contactArea,
    riskScore,
    avgOnContact: Math.round(avgOnContact * 10) / 10,
  };
}

// ADD THIS EXACT BLOCK - NO OTHER CHANGES
export interface AlertRecord {
  patientId: string;
  timestamp: string;
  riskScore: number;
}

export let patientAlerts: AlertRecord[] = [];  

export function logHighRiskAlert(patientId: string, riskScore: number) {
  if (riskScore >= 7) {  // 👈 Simple if-statement
    const record: AlertRecord = {
      patientId,
      timestamp: new Date().toISOString(),
      riskScore,
    };
    patientAlerts.push(record);
    console.log(`🚨 ALERT IMPLEMENTED: ${patientId} Risk ${riskScore} at ${record.timestamp}`);
    return true;
  }
  return false;
}
