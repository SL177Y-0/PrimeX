/**
 * Custom Hook for System Health
 * 
 * Monitors system health status
 */

import { useState, useEffect, useCallback } from 'react';
import { healthCheckService, SystemHealth } from '../services/healthCheckService';

export function useSystemHealth(refreshInterval: number = 60000) {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await healthCheckService.getSystemHealth();
      setHealth(data);
    } catch (err: any) {
      console.error('[useSystemHealth] Error fetching health:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();

    const interval = setInterval(fetchHealth, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchHealth, refreshInterval]);

  const isHealthy = health?.status === 'healthy';
  const isDegraded = health?.status === 'degraded';
  const isUnhealthy = health?.status === 'unhealthy';

  return {
    health,
    loading,
    error,
    isHealthy,
    isDegraded,
    isUnhealthy,
    refresh: fetchHealth,
    uptime: health ? healthCheckService.getUptime() : 0,
    uptimeFormatted: health ? healthCheckService.getUptimeFormatted() : '0s',
  };
}
