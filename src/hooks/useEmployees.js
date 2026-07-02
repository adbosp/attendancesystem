import { useCallback, useEffect, useState } from 'react';
import { getEmployees } from '../api/api.js';

function useEmployees({ pollingInterval = 5000 } = {}) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadEmployees = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const data = await getEmployees();
      setEmployees(data);
      setError('');
      return data;
    } catch {
      setError('Cannot load employees from server.');
      return [];
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadEmployees();

    if (!pollingInterval) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      loadEmployees({ silent: true });
    }, pollingInterval);

    return () => window.clearInterval(intervalId);
  }, [loadEmployees, pollingInterval]);

  return {
    employees,
    loading,
    error,
    refreshEmployees: loadEmployees,
  };
}

export default useEmployees;
