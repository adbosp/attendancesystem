const pad = (value) => String(value).padStart(2, '0');

const timeToMinutes = (value) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000);

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const formatDate = (date) => {
  const value = new Date(date);
  return `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()}`;
};

const formatTime = (date) => {
  const value = new Date(date);
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
};

const getVietnameseDay = (date) => {
  const day = new Date(date).getDay();
  return day === 0 ? 'CN' : `T.${day + 1}`;
};

const calculateMinutes = (start, end) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
};

const formatTotalHours = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${pad(hours)}:${pad(remainingMinutes)}`;
};

const getShiftCode = (shift) => shift.shiftCode || shift.code;

const getShiftName = (shift) => shift.shiftName || shift.name;

const buildShiftWindow = (baseDate, shift) => {
  const dayStart = startOfDay(baseDate);
  const shiftStart = addMinutes(dayStart, timeToMinutes(shift.startTime));
  const shiftEnd = addMinutes(dayStart, timeToMinutes(shift.endTime));

  if (shift.isOvernight || shiftEnd <= shiftStart) {
    shiftEnd.setDate(shiftEnd.getDate() + 1);
  }

  return {
    allowedStart: addMinutes(shiftStart, -Number(shift.allowedEarlyMinutes || 0)),
    allowedEnd: addMinutes(shiftEnd, Number(shift.allowedLateMinutes || 0)),
    shiftStart,
    shiftEnd,
  };
};

const dateRange = (startDate, endDate) => {
  const dates = [];
  const current = startOfDay(startDate);
  const end = startOfDay(endDate);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

const isInsideOutputRange = (date, startDate, endDate) => {
  const value = startOfDay(date).getTime();
  const start = startDate ? startOfDay(startDate).getTime() : null;
  const end = endDate ? startOfDay(endDate).getTime() : null;

  if (start !== null && value < start) {
    return false;
  }

  if (end !== null && value > end) {
    return false;
  }

  return true;
};

export const buildAttendanceSummary = ({
  logs,
  shifts,
  startDate,
  endDate,
  outputStartDate = startDate,
  outputEndDate = endDate,
}) => {
  const activeShifts = shifts.filter((shift) => shift.isActive);
  const sortedLogs = logs
    .map((log) => {
      const row = log.toObject?.() ?? log;
      return {
        ...row,
        logId: String(row._id),
        dateValue: new Date(row.recordTime),
      };
    })
    .sort((a, b) => a.dateValue.getTime() - b.dateValue.getTime());
  const usedLogIds = new Set();
  const sessions = [];
  const firstLogDate = sortedLogs[0]?.dateValue || new Date();
  const lastLogDate = sortedLogs[sortedLogs.length - 1]?.dateValue || firstLogDate;
  const calculationStartDate = startDate || firstLogDate;
  const calculationEndDate = endDate || lastLogDate;
  const days = dateRange(calculationStartDate, calculationEndDate);

  for (const log of sortedLogs) {
    if (usedLogIds.has(log.logId)) {
      continue;
    }

    const candidates = [];

    for (const day of days) {
      for (const shift of activeShifts) {
        const window = buildShiftWindow(day, shift);

        if (log.dateValue >= window.allowedStart && log.dateValue <= window.allowedEnd) {
          candidates.push({
            day,
            shift,
            window,
            score: Math.abs(log.dateValue.getTime() - window.shiftStart.getTime()),
          });
        }
      }
    }

    if (candidates.length === 0) {
      continue;
    }

    candidates.sort((a, b) => a.score - b.score);
    const selected = candidates[0];
    const deviceId = String(log.sourceDevice?._id || log.sourceDevice);
    const matchingLogs = sortedLogs.filter((candidate) => {
      if (usedLogIds.has(candidate.logId)) {
        return false;
      }

      return (
        String(candidate.sourceDevice?._id || candidate.sourceDevice) === deviceId &&
        candidate.employeeCode === log.employeeCode &&
        candidate.dateValue >= selected.window.allowedStart &&
        candidate.dateValue <= selected.window.allowedEnd
      );
    });

    if (matchingLogs.length === 0) {
      continue;
    }

    matchingLogs.forEach((candidate) => usedLogIds.add(candidate.logId));

    const firstLog = matchingLogs[0];
    const lastLog = matchingLogs[matchingLogs.length - 1];
    const hasOut = matchingLogs.length > 1;
    const status = hasOut ? 'complete' : 'missing-out';
    const totalMinutes = hasOut ? calculateMinutes(firstLog.dateValue, lastLog.dateValue) : 0;

    sessions.push({
      employeeCode: firstLog.employeeCode,
      name: firstLog.employee?.displayName || firstLog.employeeName,
      deviceName: firstLog.sourceDeviceName,
      department: firstLog.employee?.departmentName || 'Unassigned',
      dateValue: selected.day,
      date: formatDate(selected.day),
      day: getVietnameseDay(selected.day),
      in: formatTime(firstLog.dateValue),
      out: hasOut ? formatTime(lastLog.dateValue) : '',
      totalHours: hasOut ? formatTotalHours(totalMinutes) : '',
      totalMinutes,
      shift: getShiftCode(selected.shift),
      shiftName: getShiftName(selected.shift),
      sourceDevice: firstLog.sourceDevice,
      sourceDeviceName: firstLog.sourceDeviceName,
      logCount: matchingLogs.length,
      status,
      warning: hasOut ? '' : 'Missing OUT',
    });
  }

  return sessions
    .filter((session) => isInsideOutputRange(session.dateValue, outputStartDate, outputEndDate))
    .sort((a, b) => {
      const aDate = startOfDay(a.dateValue).getTime();
      const bDate = startOfDay(b.dateValue).getTime();

      if (aDate !== bDate) {
        return aDate - bDate;
      }

      if (a.shift !== b.shift) {
        return String(a.shift).localeCompare(String(b.shift), undefined, { numeric: true });
      }

      return a.employeeCode.localeCompare(b.employeeCode, undefined, { numeric: true });
    })
    .map(({ dateValue, ...session }) => session);
};
