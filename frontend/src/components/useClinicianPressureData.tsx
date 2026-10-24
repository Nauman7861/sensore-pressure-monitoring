import { useEffect, useMemo, useState } from "react";
import api from "../api";

export type TimeRange = "1h" | "6h" | "24h";

export interface HistoricalDataPoint {
  timestamp: Date;
  peakPressure: number;
  contactArea: number;
  riskScore: number;
}

export interface Alert {
  id: string;
  type: "info" | "warning" | "critical";
  title: string;
  message: string;
  timestamp: Date;
}

const emptyHeatmap = () =>
  Array.from({ length: 32 }, () => Array(32).fill(0));

export function useClinicianPressureData(
  patientId: number | null | undefined,
  timeRange: TimeRange,
  scrubberPosition: number
) {
  const [currentData, setCurrentData] = useState<number[][]>(emptyHeatmap());
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number | null>(null);
  const [totalFrames, setTotalFrames] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setCurrentData(emptyHeatmap());
    setHistoricalData([]);
    setAlerts([]);
    setCurrentFrameIndex(null);
    setTotalFrames(null);
  };

  useEffect(() => {
    if (!patientId) {
      resetState();
      return;
    }

    let cancelled = false;

    const fetchHistory = async () => {
      try {
        setLoading(true);

        const res = await api.get("/api/pressure/windows/", {
          params: {
            patient_id: patientId,
            range: timeRange,
          },
        });

        const points: HistoricalDataPoint[] = (res.data ?? []).map((p: any) => ({
          timestamp: new Date(p.timestamp),
          peakPressure: Number(p.ppi_raw ?? 0),
          contactArea: Number(p.contact_area_pct ?? 0),
          riskScore: Number(p.risk_score ?? 0),
        }));

        if (!cancelled) {
          setHistoricalData(points);
        }
      } catch (error) {
        console.error("Failed to fetch pressure history:", error);
        if (!cancelled) setHistoricalData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [patientId, timeRange]);

  const selectedFrameIndex = useMemo(() => {
    if (totalFrames === null || totalFrames <= 1) return 0;
    return Math.floor((scrubberPosition / 100) * (totalFrames - 1));
  }, [scrubberPosition, totalFrames]);

  useEffect(() => {
    if (!patientId) {
      setCurrentData(emptyHeatmap());
      setCurrentFrameIndex(null);
      setTotalFrames(null);
      return;
    }

    let cancelled = false;

    const fetchFrame = async () => {
      try {
        const res = await api.get("/api/pressure/clinician-heatmap/", {
          params: {
            patient_id: patientId,
            frame_index: selectedFrameIndex,
            range: timeRange,
          },
        });

        if (cancelled) return;

        setCurrentData(res.data?.frame ?? emptyHeatmap());
        setCurrentFrameIndex(res.data?.frame_index ?? 0);

        if (res.data?.total_frames != null) {
          setTotalFrames(res.data.total_frames);
        }
      } catch (error) {
        console.error("Failed to fetch heatmap frame:", error);
        if (!cancelled) {
          setCurrentData(emptyHeatmap());
          setCurrentFrameIndex(null);
        }
      }
    };

    fetchFrame();

    const interval =
      scrubberPosition === 100
        ? setInterval(() => {
            fetchFrame().catch(() => {});
          }, 2000)
        : null;

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [patientId, selectedFrameIndex, scrubberPosition, timeRange]);

  useEffect(() => {
    if (!patientId) {
      setAlerts([]);
      return;
    }

    const selectedIndex =
      historicalData.length <= 1
        ? 0
        : Math.floor((scrubberPosition / 100) * (historicalData.length - 1));

    const selectedPoint = historicalData[selectedIndex];
    const newAlerts: Alert[] = [];
    const isLive = scrubberPosition === 100;

    if (isLive && selectedPoint) {
      if (selectedPoint.riskScore >= 7) {
        newAlerts.push({
          id: "alert-1",
          type: "critical",
          title: "High Pressure Detected",
          message: "Sustained pressure above recommended levels. Please adjust your position.",
          timestamp: new Date(),
        });
      } else if (selectedPoint.riskScore >= 5) {
        newAlerts.push({
          id: "alert-2",
          type: "warning",
          title: "Moderate Pressure Alert",
          message: "Some areas are experiencing elevated pressure. Consider changing position soon.",
          timestamp: new Date(),
        });
      }

      if (selectedPoint.contactArea < 45) {
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
  }, [patientId, historicalData, scrubberPosition]);

  return {
    currentData,
    historicalData,
    alerts,
    currentFrameIndex,
    totalFrames,
    loading,
  };
}