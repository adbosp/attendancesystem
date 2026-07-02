import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDepartments } from '../api/api.js';

function useDepartments({ pollingInterval = 5000 } = {}) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDepartments = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const data = await getDepartments();
      setDepartments(data);
      setError('');
    } catch {
      setError('Cannot load departments from server.');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadDepartments();

    if (!pollingInterval) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      loadDepartments({ silent: true });
    }, pollingInterval);

    return () => window.clearInterval(intervalId);
  }, [loadDepartments, pollingInterval]);

  const stats = useMemo(() => ({
    total: departments.length,
    active: departments.filter((department) => department.isActive).length,
  }), [departments]);

  return {
    departments,
    loading,
    error,
    stats,
    refreshDepartments: loadDepartments,
  };
}

export default useDepartments;
