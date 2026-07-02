const pad = (value) => String(value).padStart(2, '0');

const parseTimeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000);

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const formatDate = (date) => {
  const value = new Date(date);
  return `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()}`;
};

export const formatTime = (date) => {
  const value = new Date(date);
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
};

export const getVietnameseDay = (date) => {
  const value = new Date(date);
  const day = value.getDay();
  return day === 0 ? 'CN' : `T.${day + 1}`;
};

export const calculateMinutes = (start, end) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
};

const formatTotalHours = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${pad(hours)}:${pad(remainingMinutes)}`;
};

const buildShiftWindow = (baseDate, shift) => {
  const dayStart = startOfDay(baseDate);
  const shiftStart = addMinutes(dayStart, parseTimeToMinutes(shift.startTime));
  const shiftEnd = addMinutes(dayStart, parseTimeToMinutes(shift.endTime));

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

const getCandidateDates = (logDate) => {
  const current = startOfDay(logDate);
  const previous = new Date(current);
  previous.setDate(previous.getDate() - 1);
  return [previous, current];
};

export const calculateAttendance = (rawLogs, shifts) => {
  const activeShifts = shifts.filter((shift) => shift.isActive);
  const sortedLogs = rawLogs
    .map((log, index) => ({
      ...log,
      id: `${log.employeeCode}-${log.checkTime}-${index}`,
      dateValue: new Date(log.checkTime),
    }))
    .sort((a, b) => a.dateValue.getTime() - b.dateValue.getTime());

  const usedLogIds = new Set();
  const sessions = [];

  for (const log of sortedLogs) {
    if (usedLogIds.has(log.id)) {
      continue;
    }

    const possibleWindows = [];

    for (const shift of activeShifts) {
      for (const candidateDate of getCandidateDates(log.dateValue)) {
        const window = buildShiftWindow(candidateDate, shift);
        if (log.dateValue >= window.allowedStart && log.dateValue <= window.allowedEnd) {
          possibleWindows.push({ shift, window, baseDate: candidateDate });
        }
      }
    }

    if (possibleWindows.length === 0) {
      continue;
    }

    possibleWindows.sort((a, b) => {
      const aDistance = Math.abs(log.dateValue.getTime() - a.window.shiftStart.getTime());
      const bDistance = Math.abs(log.dateValue.getTime() - b.window.shiftStart.getTime());
      return aDistance - bDistance;
    });

    const selected = possibleWindows[0];
    const matchingLogs = sortedLogs.filter((candidate) => {
      if (usedLogIds.has(candidate.id)) {
        return false;
      }

      if (candidate.employeeCode !== log.employeeCode) {
        return false;
      }

      return (
        candidate.dateValue >= selected.window.allowedStart &&
        candidate.dateValue <= selected.window.allowedEnd
      );
    });

    if (matchingLogs.length === 0) {
      continue;
    }

    matchingLogs.forEach((candidate) => usedLogIds.add(candidate.id));

    const firstLog = matchingLogs[0];
    const lastLog = matchingLogs[matchingLogs.length - 1];
    const hasOut = matchingLogs.length > 1;
    const totalMinutes = hasOut ? calculateMinutes(firstLog.dateValue, lastLog.dateValue) : 0;

    sessions.push({
      employeeCode: firstLog.employeeCode,
      name: firstLog.name,
      department: firstLog.department,
      date: formatDate(selected.baseDate),
      day: getVietnameseDay(selected.baseDate),
      in: formatTime(firstLog.dateValue),
      out: hasOut ? formatTime(lastLog.dateValue) : '',
      totalHours: hasOut ? formatTotalHours(totalMinutes) : '',
      totalMinutes,
      shift: selected.shift.shiftCode,
    });
  }

  return sessions.sort((a, b) => {
    const [aDay, aMonth, aYear] = a.date.split('/').map(Number);
    const [bDay, bMonth, bYear] = b.date.split('/').map(Number);
    const aDate = new Date(aYear, aMonth - 1, aDay).getTime();
    const bDate = new Date(bYear, bMonth - 1, bDay).getTime();

    if (aDate !== bDate) {
      return aDate - bDate;
    }

    return a.employeeCode.localeCompare(b.employeeCode, undefined, { numeric: true });
  });
};
