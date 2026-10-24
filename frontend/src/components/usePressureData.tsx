import { useEffect, useMemo, useState } from "react";
import api from "../api";

export type TimeRange = "1h" | "6h" | "24h";

export interface HistoricalDataPoint {
  timestamp: Date;
  peakPressure: number;
  contactArea: number;
  riskScore: number;
}

export interface Metrics {
  peakPressure: number;
  contactArea: number;
  riskScore: number;
  avgOnContact: number;
}

export interface Alert {
  id: string;
  type: "info" | "warning" | "critical";
  title: string;
  message: string;
  timestamp: Date;
}

export function usePressureData(
  timeRange: TimeRange,
  scrubberPosition: number,
  patientId?: string | number | null
) {
  const effectivePatientId = patientId !== '' && patientId != null ? patientId : null;
  const [currentData, setCurrentData] = useState<number[][]>(
    Array.from({ length: 32 }, () => Array(32).fill(0))
  );
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    peakPressure: 0,
    contactArea: 0,
    riskScore: 0,
    avgOnContact: 0,
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number | null>(null);
  const [totalFrames, setTotalFrames] = useState<number | null>(null);

  useEffect(() => {
    if (!effectivePatientId) return;
    let cancelled = false;
    const fetchHistory = async () => {
      try {
        const res = await api.get("/api/pressure/windows/", {
          params: { range: timeRange, ...(effectivePatientId ? { patient_id: effectivePatientId } : {}) },
        });
        if (cancelled) return;
        const points: HistoricalDataPoint[] = (res.data ?? []).map((p: any) => ({
          timestamp: new Date(p.timestamp),
          peakPressure: Number(p.ppi_raw ?? 0),
          contactArea: Number(p.contact_area_pct ?? 0),
          riskScore: Number(p.risk_score ?? 0),
        }));
        setHistoricalData(points);
        const last = points[points.length - 1];
        setMetrics(last
          ? { peakPressure: last.peakPressure, contactArea: last.contactArea, riskScore: last.riskScore, avgOnContact: 0 }
          : { peakPressure: 0, contactArea: 0, riskScore: 0, avgOnContact: 0 }
        );
      } catch (err) {
        if (!cancelled) console.error("Pressure history fetch failed:", err);
      }
    };
    fetchHistory();
    return () => { cancelled = true; };
  }, [timeRange, effectivePatientId]);

  const selectedIndex = useMemo(() => {
    if (historicalData.length <= 1) return 0;
    return Math.floor((scrubberPosition / 100) * (historicalData.length - 1));
  }, [scrubberPosition, historicalData.length]);

  useEffect(() => {
    const p = historicalData[selectedIndex];
    if (p) {
      setMetrics({
        peakPressure: p.peakPressure,
        contactArea: p.contactArea,
        riskScore: p.riskScore,
        avgOnContact: 0,
      });
    }
  }, [selectedIndex, historicalData]);

  const selectedFrameIndex = useMemo(() => {
    if (totalFrames === null || totalFrames <= 1) return 0;
    return Math.floor((scrubberPosition / 100) * (totalFrames - 1));
  }, [scrubberPosition, totalFrames]);

  useEffect(() => {
    if (!effectivePatientId) return;
    let cancelled = false;

    const fetchFrame = async () => {
      try {
        const res = await api.get("/api/pressure/latest-heatmap/", {
          params: {
            frame_index: selectedFrameIndex,
            patient_id: effectivePatientId,
          },
        });
        if (cancelled) return;
        setCurrentData(res.data?.frame ?? Array.from({ length: 32 }, () => Array(32).fill(0)));
        setCurrentFrameIndex(res.data?.frame_index ?? null);
        if (res.data?.total_frames != null) {
          setTotalFrames(res.data.total_frames);
        }
      } catch (err) {
        if (!cancelled) console.error("Heatmap frame fetch failed:", err);
      }
    };

    fetchFrame();

    const interval =
      scrubberPosition === 100
        ? setInterval(() => fetchFrame().catch(() => {}), 2000)
        : null;

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [selectedFrameIndex, scrubberPosition, effectivePatientId]);

  useEffect(() => {
    const newAlerts: Alert[] = [];
    const isLive = scrubberPosition === 100;

    if (isLive) {
      if (metrics.riskScore >= 7) {
        newAlerts.push({
          id: "alert-1",
          type: "critical",
          title: "High Pressure Detected",
          message: "Sustained pressure above recommended levels. Please adjust your position.",
          timestamp: new Date(),
        });
      } else if (metrics.riskScore >= 5) {
        newAlerts.push({
          id: "alert-2",
          type: "warning",
          title: "Moderate Pressure Alert",
          message: "Some areas are experiencing elevated pressure. Consider changing position soon.",
          timestamp: new Date(),
        });
      }

      if (metrics.contactArea < 45) {
        newAlerts.push({
          id: "alert-3",
          type: "info",
          title: "Low Contact Area",
          message: "Increasing contact area can help distribute pressure more evenly.",
          timestamp: new Date(),
        });
      }
    }

    setAlerts(newAlerts);
  }, [metrics, scrubberPosition]);

  return {
    currentData,
    historicalData,
    metrics,
    alerts,
    currentFrameIndex,
    totalFrames,
  };
}