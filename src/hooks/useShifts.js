import { useCallback, useEffect, useMemo, useState } from 'react';
import { getShifts } from '../api/api.js';

function useShifts({ pollingInterval = 5000 } = {}) {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadShifts = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const data = await getShifts();
      setShifts(data);
      setError('');
    } catch {
      setError('Cannot load shifts from server.');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadShifts();

    if (!pollingInterval) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      loadShifts({ silent: true });
    }, pollingInterval);

    return () => window.clearInterval(intervalId);
  }, [loadShifts, pollingInterval]);

  const stats = useMemo(() => ({
    total: shifts.length,
    active: shifts.filter((shift) => shift.isActive).length,
    defaultShift: shifts.find((shift) => shift.isDefault) || null,
  }), [shifts]);

  return {
    shifts,
    loading,
    error,
    stats,
    refreshShifts: loadShifts,
  };
}

export default useShifts;
