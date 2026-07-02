import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAttendanceLogs, getAttendanceSummary } from '../api/api.js';

function useAttendance({
  date,
  startDate,
  endDate,
  deviceId = 'all',
  departmentId = 'all',
  pollingInterval = 5000,
} = {}) {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAttendance = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const [logData, summaryData] = await Promise.all([
        getAttendanceLogs({ date, startDate, endDate, deviceId, departmentId }),
        getAttendanceSummary({ date, startDate, endDate, deviceId, departmentId }),
      ]);
      setLogs(logData);
      setSummary(summaryData);
      setError('');
    } catch {
      setError('Cannot load attendance logs from server.');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [date, startDate, endDate, deviceId, departmentId]);

  useEffect(() => {
    loadAttendance();

    if (!pollingInterval) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      loadAttendance({ silent: true });
    }, pollingInterval);

    return () => window.clearInterval(intervalId);
  }, [loadAttendance, pollingInterval]);

  const stats = useMemo(() => {
    const employeeCodes = new Set(
      summary.map((row) => `${row.sourceDevice?._id || row.sourceDevice}:${row.employeeCode}:${row.date}`),
    );
    const deviceIds = new Set(logs.map((log) => log.sourceDevice?._id || log.sourceDevice));

    return {
      events: logs.length,
      employees: employeeCodes.size,
      devices: deviceIds.size,
    };
  }, [logs, summary]);

  return {
    logs,
    summary,
    loading,
    error,
    stats,
    refreshAttendance: loadAttendance,
  };
}

export default useAttendance;
