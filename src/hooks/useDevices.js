import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDevices } from '../api/api.js';

function useDevices({ pollingInterval = 5000 } = {}) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDevices = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const data = await getDevices();
      setDevices(data);
      setError('');
    } catch {
      setError('Cannot load devices from server.');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadDevices();

    if (!pollingInterval) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      loadDevices({ silent: true });
    }, pollingInterval);

    return () => window.clearInterval(intervalId);
  }, [loadDevices, pollingInterval]);

  const stats = useMemo(() => {
    const active = devices.filter((device) => device.isActive).length;
    const connected = devices.filter(
      (device) => device.lastConnectionStatus === 'connected',
    ).length;
    const failed = devices.filter((device) => device.lastConnectionStatus === 'failed').length;
    const notTested = devices.filter(
      (device) => device.lastConnectionStatus === 'not_tested',
    ).length;

    return {
      total: devices.length,
      active,
      connected,
      failed,
      notTested,
    };
  }, [devices]);

  return {
    devices,
    loading,
    error,
    stats,
    refreshDevices: loadDevices,
  };
}

export default useDevices;
