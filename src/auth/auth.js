const AUTH_STORAGE_KEY = 'attendance_admin_user';

export const getStoredUser = () => {
  const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const storeUser = (user) => {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
};

export const clearStoredUser = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};
