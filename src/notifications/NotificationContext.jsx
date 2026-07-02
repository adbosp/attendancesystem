import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getAttendanceSummary, getDevices, getShifts } from '../api/api.js';
import {
  getNotificationSettings,
  NOTIFICATION_EVENT,
} from './notificationSettings.js';

const NotificationContext = createContext(null);
const today = new Date().toISOString().slice(0, 10);
const pad = (value) => String(value).padStart(2, '0');

const parseDisplayDate = (value) => {
  const [day, month, year] = value.split('/').map(Number);
  return new Date(year, month - 1, day);
};

const timeToMinutes = (value) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000);

const buildShiftEnd = (displayDate, shift) => {
  const baseDate = parseDisplayDate(displayDate);
  const end = addMinutes(baseDate, timeToMinutes(shift.endTime));

  if (shift.isOvernight || timeToMinutes(shift.endTime) <= timeToMinutes(shift.startTime)) {
    end.setDate(end.getDate() + 1);
  }

  return addMinutes(end, Number(shift.allowedLateMinutes || 0));
};

const formatTimeStamp = (date = new Date()) =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;

function NotificationProvider({ children }) {
  const [settings, setSettings] = useState(getNotificationSettings);
  const [systemNotifications, setSystemNotifications] = useState([]);
  const [eventNotifications, setEventNotifications] = useState([]);
  const [readIds, setReadIds] = useState(new Set());

  const refreshSystemNotifications = useCallback(async () => {
    const nextNotifications = [];

    try {
      if (settings.deviceDisconnected) {
        const devices = await getDevices();
        devices
          .filter((device) => device.isActive && device.lastConnectionStatus === 'failed')
          .forEach((device) => {
            nextNotifications.push({
              id: `device-disconnected:${device._id}:${device.lastTestedAt || device.updatedAt || ''}`,
              type: 'deviceDisconnected',
              severity: 'error',
              title: 'Device disconnected',
              message: `${device.name} (${device.ipAddress}) cannot connect. ${device.lastConnectionMessage || ''}`.trim(),
              time: formatTimeStamp(device.lastTestedAt ? new Date(device.lastTestedAt) : new Date()),
            });
          });
      }

      if (settings.employeesMissing) {
        const [summary, shifts] = await Promise.all([
          getAttendanceSummary({ startDate: today, endDate: today, deviceId: 'all' }),
          getShifts(),
        ]);
        const shiftsByCode = new Map(shifts.map((shift) => [shift.shiftCode || shift.code, shift]));
        const now = new Date();

        summary
          .filter((row) => row.status === 'missing-out' || !row.out)
          .filter((row) => {
            const shift = shiftsByCode.get(row.shift);
            return shift ? now > buildShiftEnd(row.date, shift) : true;
          })
          .forEach((row) => {
            nextNotifications.push({
              id: `employee-missing:${row.sourceDeviceName}:${row.employeeCode}:${row.date}:${row.shift}:${row.in}`,
              type: 'employeesMissing',
              severity: 'warning',
              title: 'Employee missing OUT',
              message: `${row.employeeCode} - ${row.name} has no OUT punch for ${row.date}, shift ${row.shift}.`,
              time: formatTimeStamp(),
            });
          });
      }

      setSystemNotifications(nextNotifications);
    } catch {
      setSystemNotifications((current) => current);
    }
  }, [settings.deviceDisconnected, settings.employeesMissing]);

  useEffect(() => {
    const handleSettingsChanged = () => setSettings(getNotificationSettings());
    window.addEventListener('notification-settings-changed', handleSettingsChanged);
    return () => window.removeEventListener('notification-settings-changed', handleSettingsChanged);
  }, []);

  useEffect(() => {
    refreshSystemNotifications();
    const intervalId = window.setInterval(refreshSystemNotifications, 15000);
    return () => window.clearInterval(intervalId);
  }, [refreshSystemNotifications]);

  useEffect(() => {
    const handleNotificationEvent = (event) => {
      const notification = event.detail;

      if (!notification || settings[notification.type] === false) {
        return;
      }

      setEventNotifications((current) => [
        {
          id: `${notification.type}:${Date.now()}`,
          severity: notification.severity || 'info',
          title: notification.title,
          message: notification.message,
          type: notification.type,
          time: formatTimeStamp(),
        },
        ...current,
      ].slice(0, 20));
    };

    window.addEventListener(NOTIFICATION_EVENT, handleNotificationEvent);
    return () => window.removeEventListener(NOTIFICATION_EVENT, handleNotificationEvent);
  }, [settings]);

  const notifications = useMemo(
    () => [...eventNotifications, ...systemNotifications],
    [eventNotifications, systemNotifications],
  );

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !readIds.has(notification.id)).length,
    [notifications, readIds],
  );

  const markAllRead = useCallback(() => {
    setReadIds(new Set(notifications.map((notification) => notification.id)));
  }, [notifications]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    markAllRead,
    refreshNotifications: refreshSystemNotifications,
  }), [markAllRead, notifications, refreshSystemNotifications, unreadCount]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    return {
      notifications: [],
      unreadCount: 0,
      markAllRead: () => {},
      refreshNotifications: () => {},
    };
  }

  return context;
};

export default NotificationProvider;
