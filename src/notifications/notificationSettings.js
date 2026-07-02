const STORAGE_KEY = 'attendance_notification_settings';

export const defaultNotificationSettings = {
  deviceDisconnected: true,
  syncEmployees: true,
  syncAttendance: true,
  employeesMissing: true,
};

export const getNotificationSettings = () => {
  try {
    const savedSettings = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      ...defaultNotificationSettings,
      ...savedSettings,
    };
  } catch {
    return defaultNotificationSettings;
  }
};

export const saveNotificationSettings = (settings) => {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...defaultNotificationSettings,
      ...settings,
    }),
  );
  window.dispatchEvent(new CustomEvent('notification-settings-changed'));
};

export const NOTIFICATION_EVENT = 'attendance-notification';
