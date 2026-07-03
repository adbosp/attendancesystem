const AUTH_STORAGE_KEY = 'attendance_admin_user';
const LOGIN_SYNC_STORAGE_KEY = 'attendance_login_sync_pending';
const REMEMBERED_LOGIN_STORAGE_KEY = 'attendance_remembered_login';

export const getStoredUser = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  const storedUser = sessionStorage.getItem(AUTH_STORAGE_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const storeUser = (user) => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  sessionStorage.setItem(LOGIN_SYNC_STORAGE_KEY, 'true');
};

export const clearStoredUser = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(LOGIN_SYNC_STORAGE_KEY);
};

export const consumeLoginSyncPending = () => {
  const isPending = sessionStorage.getItem(LOGIN_SYNC_STORAGE_KEY) === 'true';
  sessionStorage.removeItem(LOGIN_SYNC_STORAGE_KEY);
  return isPending;
};

export const getRememberedLogin = () => {
  try {
    return JSON.parse(localStorage.getItem(REMEMBERED_LOGIN_STORAGE_KEY) || 'null');
  } catch {
    localStorage.removeItem(REMEMBERED_LOGIN_STORAGE_KEY);
    return null;
  }
};

export const saveRememberedLogin = (credentials) => {
  localStorage.setItem(REMEMBERED_LOGIN_STORAGE_KEY, JSON.stringify(credentials));
};

export const clearRememberedLogin = () => {
  localStorage.removeItem(REMEMBERED_LOGIN_STORAGE_KEY);
};
