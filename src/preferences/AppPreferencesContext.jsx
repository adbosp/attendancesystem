import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const THEME_STORAGE_KEY = 'attendance_theme_mode';
const LANGUAGE_STORAGE_KEY = 'attendance_language';

const AppPreferencesContext = createContext(null);

const viDictionary = new Map(Object.entries({
  'Dashboard': 'Tổng quan',
  'Employees': 'Nhân viên',
  'Attendance': 'Chấm công',
  'Devices': 'Thiết bị',
  'Shifts': 'Ca làm',
  'Departments': 'Phòng ban',
  'Reports': 'Báo cáo',
  'Settings': 'Cài đặt',
  'Basic Setup': 'Thiết lập cơ bản',
  'Overview of the attendance management workspace.': 'Tổng quan hệ thống quản lý chấm công.',
  'Backend Connected': 'Đã kết nối backend',
  'Cannot connect to server': 'Không thể kết nối máy chủ',
  'Checking backend connection...': 'Đang kiểm tra kết nối backend...',
  'Attendance Today': 'Chấm công hôm nay',
  'Raw Events': 'Log thô',
  'Connected Devices': 'Thiết bị đã kết nối',
  'Missing OUT': 'Thiếu giờ ra',
  'Pending OUT': 'Chờ bấm giờ ra',
  'Work Hours Today': 'Giờ công hôm nay',
  'Last Sync': 'Đồng bộ cuối',
  'Department Coverage': 'Phân bổ phòng ban',
  'Employee grouping progress across departments.': 'Tiến độ phân nhóm nhân viên theo phòng ban.',
  'Assigned employees': 'Nhân viên đã phân nhóm',
  'Device Health': 'Trạng thái thiết bị',
  'Live status of configured attendance devices.': 'Trạng thái trực tiếp của các thiết bị chấm công.',
  'Recent Sessions': 'Phiên chấm công gần đây',
  'Latest calculated attendance rows for today.': 'Các dòng chấm công mới nhất hôm nay.',
  'No attendance sessions calculated today.': 'Chưa có phiên chấm công nào hôm nay.',
  'Connected': 'Đã kết nối',
  'Failed': 'Lỗi',
  'Not tested': 'Chưa kiểm tra',
  'Refresh': 'Làm mới',
  'Sync ZKTeco Logs': 'Đồng bộ log ZKTeco',
  'Syncing...': 'Đang đồng bộ...',
  'Fix Missing': 'Sửa thiếu giờ ra',
  'Fixing...': 'Đang sửa...',
  'From Date': 'Từ ngày',
  'To Date': 'Đến ngày',
  'All devices': 'Tất cả thiết bị',
  'All departments': 'Tất cả phòng ban',
  'Calculated Attendance': 'Bảng công đã tính',
  'First valid log is IN. Last valid log is OUT. Middle logs are ignored.': 'Log hợp lệ đầu tiên là giờ vào. Log hợp lệ cuối cùng là giờ ra. Các log giữa tạm bỏ qua.',
  'No attendance sessions found for this date range.': 'Không có phiên chấm công trong khoảng ngày này.',
  'Employee code': 'Mã nhân viên',
  'Name': 'Tên',
  'Department': 'Phòng ban',
  'Device': 'Thiết bị',
  'Date': 'Ngày',
  'Day': 'Thứ',
  'In': 'Vào',
  'Out': 'Ra',
  'Total hours': 'Tổng giờ',
  'Total minutes': 'Tổng phút',
  'Shift': 'Ca',
  'Status': 'Trạng thái',
  'Complete': 'Đủ công',
  'Attendance summaries and exports by day, month, or year.': 'Tổng hợp và xuất báo cáo chấm công theo ngày, tháng hoặc năm.',
  'Daily report': 'Báo cáo ngày',
  'Monthly report': 'Báo cáo tháng',
  'Yearly report': 'Báo cáo năm',
  'Report Type': 'Loại báo cáo',
  'By day': 'Theo ngày',
  'By month': 'Theo tháng',
  'By year': 'Theo năm',
  'Month': 'Tháng',
  'Year': 'Năm',
  'From': 'Từ ngày',
  'To': 'Đến ngày',
  'Print': 'In',
  'Export CSV': 'Xuất CSV',
  'Report Rows': 'Dòng báo cáo',
  'No attendance report data found for this period.': 'Không có dữ liệu báo cáo trong kỳ này.',
  'Employees by Device': 'Nhân viên theo thiết bị',
  'Manage employees by source device and sync user data with ZKTeco devices.': 'Quản lý nhân viên theo thiết bị nguồn và đồng bộ dữ liệu người dùng với ZKTeco.',
  'Pull from Devices': 'Lấy từ thiết bị',
  'Filter Device': 'Lọc thiết bị',
  'Add Employee': 'Thêm nhân viên',
  'Edit Employee': 'Sửa nhân viên',
  'Source Device': 'Thiết bị nguồn',
  'Employee Code': 'Mã nhân viên',
  'Device Name': 'Tên trên thiết bị',
  'Display Name': 'Tên hiển thị',
  'Unassigned': 'Chưa phân nhóm',
  'Card Number': 'Số thẻ',
  'Password': 'Mật khẩu',
  'Role': 'Vai trò',
  'Saving...': 'Đang lưu...',
  'Update': 'Cập nhật',
  'Add': 'Thêm',
  'Cancel': 'Hủy',
  'Actions': 'Thao tác',
  'Edit': 'Sửa',
  'Delete': 'Xóa',
  'Monitor configured ZKTeco attendance devices in near realtime.': 'Theo dõi thiết bị chấm công ZKTeco gần thời gian thực.',
  'Total Devices': 'Tổng thiết bị',
  'Active Devices': 'Thiết bị hoạt động',
  'Device Status': 'Trạng thái thiết bị',
  'Data refreshes automatically every 5 seconds.': 'Dữ liệu tự làm mới mỗi 5 giây.',
  'Network': 'Mạng',
  'Protocol': 'Giao thức',
  'Test': 'Kiểm tra',
  'Testing...': 'Đang kiểm tra...',
  'Total Shifts': 'Tổng ca',
  'Active Shifts': 'Ca hoạt động',
  'Inactive Shifts': 'Ca tạm tắt',
  'Add Shift': 'Thêm ca',
  'Edit Shift': 'Sửa ca',
  'Shift Code': 'Mã ca',
  'Shift Name': 'Tên ca',
  'Start Time': 'Giờ bắt đầu',
  'End Time': 'Giờ kết thúc',
  'Allowed Early': 'Cho phép sớm',
  'Allowed Late': 'Cho phép trễ',
  'Overnight Shift': 'Ca qua đêm',
  'Active': 'Hoạt động',
  'Save Shift': 'Lưu ca',
  'Update Shift': 'Cập nhật ca',
  'Custom Shift Rules': 'Quy tắc ca làm',
  'Code': 'Mã',
  'Time': 'Thời gian',
  'Allowed Range': 'Khoảng cho phép',
  'Overnight': 'Qua đêm',
  'Yes': 'Có',
  'No': 'Không',
  'Inactive': 'Tạm tắt',
  'Department List': 'Danh sách phòng ban',
  'Department Code': 'Mã phòng ban',
  'Department Name': 'Tên phòng ban',
  'Description': 'Mô tả',
  'Bulk Assign Employees': 'Cập nhật hàng loạt nhân viên',
  'Notification Management': 'Quản lý thông báo',
  'Admin Login': 'Đăng nhập quản trị',
  'Sign in to access the admin dashboard.': 'Đăng nhập để truy cập hệ thống quản trị.',
  'Account': 'Tài khoản',
  'Sign in': 'Đăng nhập',
  'Signing in...': 'Đang đăng nhập...',
  'Cannot login. Please check the server.': 'Không thể đăng nhập. Vui lòng kiểm tra máy chủ.',
}));

const enDictionary = new Map(Array.from(viDictionary.entries()).map(([en, vi]) => [vi, en]));

const translateDocument = (language) => {
  const dictionary = language === 'vi' ? viDictionary : enDictionary;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }

  for (const node of nodes) {
    const value = node.nodeValue?.trim();
    if (value && dictionary.has(value)) {
      node.nodeValue = node.nodeValue.replace(value, dictionary.get(value));
    }
  }
};

const getStoredValue = (key, fallback) => {
  try {
    return window.localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

const createAppTheme = (mode) =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: '#2563eb',
      },
      secondary: {
        main: '#0f766e',
      },
      background: {
        default: mode === 'dark' ? '#101624' : '#f6f8fb',
        paper: mode === 'dark' ? '#172033' : '#ffffff',
      },
      text: {
        primary: mode === 'dark' ? '#e5edf7' : '#172033',
        secondary: mode === 'dark' ? '#9fb0c7' : '#64748b',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: {
        fontWeight: 700,
      },
      h6: {
        fontWeight: 700,
      },
      button: {
        fontWeight: 700,
        textTransform: 'none',
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            width: '100%',
            maxWidth: '100%',
            boxShadow:
              mode === 'dark'
                ? '0 12px 30px rgba(0, 0, 0, 0.28)'
                : '0 12px 30px rgba(15, 23, 42, 0.08)',
            '@media (max-width:600px)': {
              marginLeft: 'auto',
              marginRight: 'auto',
              maxWidth: 'calc(100vw - 24px)',
            },
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            width: '100%',
          },
        },
      },
      MuiGrid: {
        styleOverrides: {
          root: {
            '&.MuiGrid-container': {
              '@media (max-width:600px)': {
                width: '100%',
                marginLeft: 0,
                marginTop: 0,
                rowGap: 16,
              },
            },
            '&.MuiGrid-container > .MuiGrid-item': {
              '@media (max-width:600px)': {
                paddingLeft: '0 !important',
                paddingTop: '0 !important',
              },
            },
            '&.MuiGrid-item': {
              minWidth: 0,
              '@media (max-width:600px)': {
                display: 'flex',
                justifyContent: 'center',
                '& > *': {
                  width: '100%',
                  maxWidth: '100%',
                },
              },
            },
          },
        },
      },
      MuiButtonBase: {
        defaultProps: {
          disableRipple: true,
        },
      },
    },
  });

function AppPreferencesProvider({ children }) {
  const [themeMode, setThemeModeState] = useState(() => getStoredValue(THEME_STORAGE_KEY, 'light'));
  const [language, setLanguageState] = useState(() => getStoredValue(LANGUAGE_STORAGE_KEY, 'vi'));
  const theme = useMemo(() => createAppTheme(themeMode), [themeMode]);

  useEffect(() => {
    window.setTimeout(() => translateDocument(language), 0);
    const observer = new MutationObserver(() => {
      window.setTimeout(() => translateDocument(language), 0);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [language]);

  const setThemeMode = (nextMode) => {
    setThemeModeState(nextMode);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextMode);
  };

  const toggleThemeMode = () => {
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  };

  const setLanguage = (nextLanguage) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      setThemeMode,
      themeMode,
      toggleThemeMode,
    }),
    [language, themeMode],
  );

  return (
    <AppPreferencesContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppPreferencesContext.Provider>
  );
}

export const useAppPreferences = () => useContext(AppPreferencesContext);

export default AppPreferencesProvider;
