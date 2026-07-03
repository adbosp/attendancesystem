import BadgeIcon from '@mui/icons-material/Badge';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DownloadIcon from '@mui/icons-material/Download';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PrintIcon from '@mui/icons-material/Print';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAttendanceSummary } from '../api/api.js';
import useDepartments from '../hooks/useDepartments.js';
import useDevices from '../hooks/useDevices.js';

const today = new Date();
const pad = (value) => String(value).padStart(2, '0');
const toInputDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const currentDate = toInputDate(today);
const currentMonth = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
const currentYear = String(today.getFullYear());

const reportModeLabels = {
  day: 'Daily report',
  month: 'Monthly report',
  year: 'Yearly report',
};

const csvColumns = [
  ['employeeCode', 'Employee code'],
  ['name', 'Name'],
  ['department', 'Department'],
  ['deviceName', 'Device'],
  ['date', 'Date'],
  ['day', 'Day'],
  ['in', 'In'],
  ['out', 'Out'],
  ['totalHours', 'Total hours'],
  ['totalMinutes', 'Total minutes'],
  ['shift', 'Shift'],
  ['status', 'Status'],
];

const reportFilterGridSx = {
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',
    sm: 'repeat(2, minmax(0, 1fr))',
    lg: 'repeat(6, minmax(0, 1fr))',
  },
  gap: 2,
  width: '100%',
  alignItems: 'start',
};

const reportStatsGridSx = {
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',
    sm: 'repeat(2, minmax(0, 1fr))',
    lg: 'repeat(4, minmax(0, 1fr))',
  },
  gap: 3,
  width: '100%',
};

const getMonthRange = (value) => {
  const [year, month] = value.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    startDate: toInputDate(start),
    endDate: toInputDate(end),
  };
};

const getYearRange = (value) => ({
  startDate: `${value}-01-01`,
  endDate: `${value}-12-31`,
});

const escapeCsvValue = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
};

const escapeHtml = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
};

const downloadCsv = ({ rows, filename, title, startDate, endDate, deviceLabel, departmentLabel }) => {
  const reportInfo = [
    [title],
    ['From', startDate, 'To', endDate],
    ['Device', deviceLabel, 'Department', departmentLabel],
    [],
  ].map((row) => row.map(escapeCsvValue).join(','));
  const header = csvColumns.map(([, label]) => escapeCsvValue(label)).join(',');
  const body = rows.map((row) =>
    csvColumns.map(([key]) => escapeCsvValue(key === 'status' ? row.status || 'complete' : row[key])).join(','),
  );
  const csv = ['\ufeff' + reportInfo[0], ...reportInfo.slice(1), header, ...body].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const printReport = ({ rows, title, startDate, endDate, deviceLabel, departmentLabel }) => {
  const rowsHtml = rows
    .map((row) => {
      const isMissingOut = row.status === 'missing-out' || !row.out;
      const statusLabel = isMissingOut ? 'Missing OUT' : 'Complete';
      return `
        <tr class="${isMissingOut ? 'missing' : ''}">
          <td class="strong">${escapeHtml(row.employeeCode)}</td>
          <td>${escapeHtml(row.name)}</td>
          <td>${escapeHtml(row.department)}</td>
          <td>${escapeHtml(row.deviceName || row.sourceDeviceName)}</td>
          <td>${escapeHtml(row.date)}</td>
          <td>${escapeHtml(row.day)}</td>
          <td>${escapeHtml(row.in)}</td>
          <td>${escapeHtml(isMissingOut ? 'Missing OUT' : row.out)}</td>
          <td>${escapeHtml(isMissingOut ? '-' : row.totalHours)}</td>
          <td>${escapeHtml(row.totalMinutes)}</td>
          <td>${escapeHtml(row.shift)}</td>
          <td><span class="status ${isMissingOut ? 'danger' : 'success'}">${statusLabel}</span></td>
        </tr>
      `;
    })
    .join('');

  const printWindow = window.open('', '_blank', 'width=1200,height=800');

  if (!printWindow) {
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 24px;
            font-family: Arial, Helvetica, sans-serif;
            color: #001638;
            background: #f4f6f8;
          }
          .report-card {
            background: #ffffff;
            border-radius: 8px;
            padding: 24px 28px;
            box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
          }
          .header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 24px;
            margin-bottom: 24px;
          }
          h1 {
            margin: 0 0 8px;
            font-size: 22px;
            line-height: 1.25;
          }
          .range,
          .meta {
            color: #38517a;
            font-size: 14px;
          }
          .meta {
            text-align: right;
            line-height: 1.7;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
          }
          th {
            text-align: left;
            font-weight: 600;
            padding: 14px 16px;
            border-bottom: 1px solid #d9dee8;
            white-space: nowrap;
          }
          td {
            padding: 15px 16px;
            border-bottom: 1px solid #d9dee8;
            white-space: nowrap;
          }
          tr.missing {
            background: #fff1f2;
          }
          .strong {
            font-weight: 700;
          }
          .status {
            display: inline-flex;
            align-items: center;
            border-radius: 999px;
            padding: 4px 10px;
            color: #ffffff;
            font-weight: 700;
            font-size: 12px;
          }
          .success { background: #2e7d32; }
          .danger { background: #d32f2f; }
          .empty {
            padding: 28px;
            text-align: center;
            color: #38517a;
            border: 1px dashed #cbd5e1;
            border-radius: 8px;
          }
          @media print {
            body { padding: 0; background: #ffffff; }
            .report-card { box-shadow: none; border-radius: 0; }
            @page { size: landscape; margin: 12mm; }
          }
        </style>
      </head>
      <body>
        <section class="report-card">
          <div class="header">
            <div>
              <h1>${escapeHtml(title)}</h1>
              <div class="range">${escapeHtml(startDate)} to ${escapeHtml(endDate)}</div>
            </div>
            <div class="meta">
              <div>Device: ${escapeHtml(deviceLabel)}</div>
              <div>Department: ${escapeHtml(departmentLabel)}</div>
              <div>Total rows: ${rows.length}</div>
            </div>
          </div>
          ${
            rows.length > 0
              ? `<table>
                  <thead>
                    <tr>
                      <th>Employee code</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Device</th>
                      <th>Date</th>
                      <th>Day</th>
                      <th>In</th>
                      <th>Out</th>
                      <th>Total hours</th>
                      <th>Total minutes</th>
                      <th>Shift</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>${rowsHtml}</tbody>
                </table>`
              : '<div class="empty">No attendance report data found for this period.</div>'
          }
        </section>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

function Reports() {
  const [mode, setMode] = useState('day');
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedDevice, setSelectedDevice] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { devices } = useDevices({ pollingInterval: 10000 });
  const { departments } = useDepartments({ pollingInterval: 10000 });

  const reportRange = useMemo(() => {
    if (mode === 'month') {
      return getMonthRange(selectedMonth);
    }

    if (mode === 'year') {
      return getYearRange(selectedYear);
    }

    return {
      startDate: selectedDate,
      endDate: selectedDate,
    };
  }, [mode, selectedDate, selectedMonth, selectedYear]);

  const loadReport = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const data = await getAttendanceSummary({
        startDate: reportRange.startDate,
        endDate: reportRange.endDate,
        deviceId: selectedDevice,
        departmentId: selectedDepartment,
      });
      setSummary(data);
      setError('');
    } catch {
      setError('Cannot load attendance report from server.');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [reportRange.endDate, reportRange.startDate, selectedDepartment, selectedDevice]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const stats = useMemo(() => {
    const employeeKeys = new Set(
      summary.map((row) => `${row.sourceDevice?._id || row.sourceDevice}:${row.employeeCode}`),
    );
    const completeRows = summary.filter((row) => row.status !== 'missing-out' && row.out);
    const missingOutRows = summary.filter((row) => row.status === 'missing-out' || !row.out);
    const totalMinutes = completeRows.reduce((total, row) => total + Number(row.totalMinutes || 0), 0);

    return {
      rows: summary.length,
      employees: employeeKeys.size,
      complete: completeRows.length,
      missingOut: missingOutRows.length,
      totalHours: `${Math.floor(totalMinutes / 60)}:${pad(totalMinutes % 60)}`,
    };
  }, [summary]);

  const reportTitle = reportModeLabels[mode];
  const exportName = `attendance-${mode}-${reportRange.startDate}-to-${reportRange.endDate}.csv`;
  const selectedDeviceLabel = useMemo(() => {
    if (selectedDevice === 'all') {
      return 'All devices';
    }

    const device = devices.find((item) => item._id === selectedDevice);
    return device ? `${device.name} - ${device.ipAddress}` : 'Selected device';
  }, [devices, selectedDevice]);
  const selectedDepartmentLabel = useMemo(() => {
    if (selectedDepartment === 'all') {
      return 'All departments';
    }

    const department = departments.find((item) => item._id === selectedDepartment);
    return department?.departmentName || 'Selected department';
  }, [departments, selectedDepartment]);
  const reportExportOptions = {
    rows: summary,
    filename: exportName,
    title: reportTitle,
    startDate: reportRange.startDate,
    endDate: reportRange.endDate,
    deviceLabel: selectedDeviceLabel,
    departmentLabel: selectedDepartmentLabel,
  };

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h4" sx={{ mb: 0.5 }}>
            Reports
          </Typography>
          <Typography color="text.secondary">
            Attendance summaries and exports by day, month, or year.
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' } }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadReport()}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => printReport(reportExportOptions)}
            disabled={loading}
          >
            Print
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => downloadCsv(reportExportOptions)}
            disabled={loading || summary.length === 0}
          >
            Export CSV
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <CardContent>
          <Box sx={reportFilterGridSx}>
            <Box>
              <FormControl fullWidth>
                <InputLabel>Report Type</InputLabel>
                <Select label="Report Type" value={mode} onChange={(event) => setMode(event.target.value)}>
                  <MenuItem value="day">By day</MenuItem>
                  <MenuItem value="month">By month</MenuItem>
                  <MenuItem value="year">By year</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box>
              {mode === 'day' && (
                <TextField
                  label="Date"
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              )}
              {mode === 'month' && (
                <TextField
                  label="Month"
                  type="month"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              )}
              {mode === 'year' && (
                <TextField
                  label="Year"
                  type="number"
                  value={selectedYear}
                  onChange={(event) => setSelectedYear(event.target.value)}
                  fullWidth
                  inputProps={{ min: 2000, max: 2100 }}
                />
              )}
            </Box>
            <Box>
              <TextField
                label="From"
                value={reportRange.startDate}
                fullWidth
                InputProps={{ readOnly: true }}
              />
            </Box>
            <Box>
              <TextField
                label="To"
                value={reportRange.endDate}
                fullWidth
                InputProps={{ readOnly: true }}
              />
            </Box>
            <Box>
              <FormControl fullWidth>
                <InputLabel>Device</InputLabel>
                <Select
                  label="Device"
                  value={selectedDevice}
                  onChange={(event) => setSelectedDevice(event.target.value)}
                >
                  <MenuItem value="all">All devices</MenuItem>
                  {devices.map((device) => (
                    <MenuItem key={device._id} value={device._id}>
                      {device.name} - {device.ipAddress}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  label="Department"
                  value={selectedDepartment}
                  onChange={(event) => setSelectedDepartment(event.target.value)}
                >
                  <MenuItem value="all">All departments</MenuItem>
                  {departments.map((department) => (
                    <MenuItem key={department._id} value={department._id}>
                      {department.departmentName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Box sx={reportStatsGridSx}>
        {[
          { label: 'Report Rows', value: stats.rows, icon: <EventAvailableIcon />, color: '#2563eb' },
          { label: 'Employees', value: stats.employees, icon: <BadgeIcon />, color: '#0f766e' },
          { label: 'Total Hours', value: stats.totalHours, icon: <CalendarMonthIcon />, color: '#7c3aed' },
          {
            label: 'Missing OUT',
            value: stats.missingOut,
            icon: <WarningAmberIcon />,
            color: stats.missingOut > 0 ? '#dc2626' : '#64748b',
          },
        ].map((card) => (
            <Card key={card.label}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {card.label}
                    </Typography>
                    <Typography variant="h4" sx={{ mt: 1 }}>
                      {card.value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1,
                      display: 'grid',
                      placeItems: 'center',
                      color: card.color,
                      bgcolor: `${card.color}17`,
                    }}
                  >
                    {card.icon}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
        ))}
      </Box>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h6">{reportTitle}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {reportRange.startDate} to {reportRange.endDate}
                </Typography>
              </Box>
              {loading && <CircularProgress size={22} />}
            </Stack>

            {!loading && summary.length === 0 && (
              <Alert severity="info">No attendance report data found for this period.</Alert>
            )}

            {summary.length > 0 && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Employee code</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Department</TableCell>
                      <TableCell>Device</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Day</TableCell>
                      <TableCell>In</TableCell>
                      <TableCell>Out</TableCell>
                      <TableCell>Total hours</TableCell>
                      <TableCell>Total minutes</TableCell>
                      <TableCell>Shift</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summary.map((row) => {
                      const isMissingOut = row.status === 'missing-out' || !row.out;

                      return (
                        <TableRow
                          key={`${row.sourceDeviceName}-${row.employeeCode}-${row.date}-${row.shift}-${row.in}`}
                          hover
                          sx={{
                            bgcolor: isMissingOut ? 'rgba(220, 38, 38, 0.08)' : 'inherit',
                            '&:hover': {
                              bgcolor: isMissingOut ? 'rgba(220, 38, 38, 0.12)' : undefined,
                            },
                          }}
                        >
                          <TableCell>
                            <Typography fontWeight={700}>{row.employeeCode}</Typography>
                          </TableCell>
                          <TableCell>{row.name}</TableCell>
                          <TableCell>{row.department}</TableCell>
                          <TableCell>{row.deviceName || row.sourceDeviceName}</TableCell>
                          <TableCell>{row.date}</TableCell>
                          <TableCell>{row.day}</TableCell>
                          <TableCell>{row.in}</TableCell>
                          <TableCell>{isMissingOut ? 'Missing OUT' : row.out}</TableCell>
                          <TableCell>{isMissingOut ? '-' : row.totalHours}</TableCell>
                          <TableCell>{row.totalMinutes}</TableCell>
                          <TableCell>{row.shift}</TableCell>
                          <TableCell>
                            <Chip
                              color={isMissingOut ? 'error' : 'success'}
                              label={isMissingOut ? 'Missing OUT' : 'Complete'}
                              size="small"
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

export default Reports;
