import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import connectDB from './config/db.js';
import AttendanceLog from './models/AttendanceLog.js';
import Department from './models/Department.js';
import Device from './models/Device.js';
import Employee from './models/Employee.js';
import Shift from './models/Shift.js';
import User from './models/User.js';
import {
  deleteUserFromDevice,
  pushUserToDevice,
  syncAttendanceFromDevice,
  syncUsersFromDevice,
} from './services/zktecoService.js';
import { buildAttendanceSummary } from './utils/attendanceSummary.js';
import testDeviceConnection from './utils/testDeviceConnection.js';

dotenv.config();

const pad = (value) => String(value).padStart(2, '0');

const timeToMinutes = (value) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000);

const parseDisplayDate = (value) => {
  const [day, month, year] = value.split('/').map(Number);
  return new Date(year, month - 1, day);
};

const buildShiftEndDate = (displayDate, shift) => {
  const baseDate = parseDisplayDate(displayDate);
  const shiftEnd = addMinutes(baseDate, timeToMinutes(shift.endTime));

  if (shift.isOvernight || timeToMinutes(shift.endTime) <= timeToMinutes(shift.startTime)) {
    shiftEnd.setDate(shiftEnd.getDate() + 1);
  }

  return shiftEnd;
};

const buildDateFilter = ({ date, startDate, endDate }) => {
  const fromDate = startDate || date;
  const toDate = endDate || date || startDate;
  const filter = {};

  if (fromDate || toDate) {
    const start = new Date(`${fromDate || toDate}T00:00:00`);
    const end = new Date(start);
    if (toDate) {
      const selectedEnd = new Date(`${toDate}T00:00:00`);
      end.setTime(selectedEnd.getTime());
    }
    end.setDate(end.getDate() + 1);
    filter.recordTime = { $gte: start, $lt: end };
  }

  return {
    filter,
    fromDate,
    toDate,
  };
};

const extendFilterForOvernightShifts = (filter, shifts) => {
  if (!filter.recordTime?.$lt) {
    return filter;
  }

  const maxOvernightLateMinutes = shifts.reduce((maxMinutes, shift) => {
    const isOvernight = shift.isOvernight || timeToMinutes(shift.endTime) <= timeToMinutes(shift.startTime);

    if (!isOvernight) {
      return maxMinutes;
    }

    return Math.max(maxMinutes, timeToMinutes(shift.endTime) + Number(shift.allowedLateMinutes || 0));
  }, 0);

  if (maxOvernightLateMinutes > 0) {
    filter.recordTime.$lt = addMinutes(filter.recordTime.$lt, maxOvernightLateMinutes);
  }

  return filter;
};

const getShiftContextDates = ({ fromDate, toDate, shifts }) => {
  const start = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
  const end = toDate ? new Date(`${toDate}T00:00:00`) : null;
  const hasOvernightShift = shifts.some((shift) => {
    return shift.isOvernight || timeToMinutes(shift.endTime) <= timeToMinutes(shift.startTime);
  });

  if (hasOvernightShift && start) {
    start.setDate(start.getDate() - 1);
  }

  if (hasOvernightShift && end) {
    end.setDate(end.getDate() + 1);
  }

  return {
    calculationStartDate: start,
    calculationEndDate: end,
  };
};

const extendFilterForShiftContext = (filter, shifts) => {
  extendFilterForOvernightShifts(filter, shifts);

  if (!filter.recordTime?.$gte) {
    return filter;
  }

  const hasOvernightShift = shifts.some((shift) => {
    return shift.isOvernight || timeToMinutes(shift.endTime) <= timeToMinutes(shift.startTime);
  });

  if (hasOvernightShift) {
    filter.recordTime.$gte = addMinutes(filter.recordTime.$gte, -24 * 60);
  }

  return filter;
};

await connectDB();
await Employee.collection.dropIndex('employeeCode_1').catch(() => {});
const employeesMissingDisplayName = await Employee.find({
  $or: [{ displayName: { $exists: false } }, { displayName: '' }],
}).catch((error) => {
  console.warn(`Employee display name migration warning: ${error.message}`);
  return [];
});

for (const employee of employeesMissingDisplayName) {
  employee.displayName = employee.name;
  await employee.save();
}
await Employee.syncIndexes().catch((error) => {
  console.warn(`Employee index sync warning: ${error.message}`);
});
await AttendanceLog.syncIndexes().catch((error) => {
  console.warn(`Attendance index sync warning: ${error.message}`);
});
await Shift.collection.dropIndex('code_1').catch(() => {});
const legacyShifts = await Shift.find({
  $or: [{ shiftCode: { $exists: false } }, { shiftName: { $exists: false } }],
});

for (const shift of legacyShifts) {
  shift.shiftCode = shift.shiftCode || shift.code || String(shift._id).slice(-4);
  shift.shiftName = shift.shiftName || shift.name || shift.shiftCode;
  shift.allowedEarlyMinutes = shift.allowedEarlyMinutes ?? shift.earlyLeaveGraceMinutes ?? 30;
  shift.allowedLateMinutes = shift.allowedLateMinutes ?? shift.lateGraceMinutes ?? 30;
  shift.name = shift.shiftName;
  shift.code = shift.shiftCode;
  await shift.save();
}

await Shift.syncIndexes().catch((error) => {
  console.warn(`Shift index sync warning: ${error.message}`);
});

const defaultShiftSeeds = [
  {
    shiftCode: '1',
    shiftName: 'Ca 1',
    startTime: '06:00',
    endTime: '14:00',
    allowedEarlyMinutes: 30,
    allowedLateMinutes: 30,
    isOvernight: false,
    isActive: true,
  },
  {
    shiftCode: '2',
    shiftName: 'Ca 2',
    startTime: '14:00',
    endTime: '22:00',
    allowedEarlyMinutes: 30,
    allowedLateMinutes: 30,
    isOvernight: false,
    isActive: true,
  },
  {
    shiftCode: '3',
    shiftName: 'Ca 3',
    startTime: '22:00',
    endTime: '06:00',
    allowedEarlyMinutes: 30,
    allowedLateMinutes: 30,
    isOvernight: true,
    isActive: true,
  },
];

for (const shift of defaultShiftSeeds) {
  await Shift.findOneAndUpdate(
    { shiftCode: shift.shiftCode },
    {
      $setOnInsert: {
        ...shift,
        code: shift.shiftCode,
        name: shift.shiftName,
      },
    },
    { upsert: true },
  );
}

const app = express();
const port = process.env.PORT || 5000;
const allowedOrigins = new Set([
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'http://localhost',
  'http://127.0.0.1',
  'http://192.168.1.90',
  'http://192.168.1.90:5173',
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  optionsSuccessStatus: 200,
}));
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    message: 'Backend Connected',
    database: 'AttendanceDB',
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: 'AttendanceDB',
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { account, password } = req.body;

  if (!account || !password) {
    return res.status(400).json({ message: 'Account and password are required' });
  }

  const user = await User.findOne({ username: account.toLowerCase() }).select('+password');

  if (!user || !user.isActive) {
    return res.status(401).json({ message: 'Invalid account or password' });
  }

  const isPasswordValid = await user.matchPassword(password);

  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Invalid account or password' });
  }

  return res.json({
    message: 'Login successful',
    user: {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  });
});

app.get('/api/admin', async (_req, res) => {
  const admin = await User.findOne({ role: 'admin' }).select('-password');

  if (!admin) {
    return res.status(404).json({ message: 'Admin account not found' });
  }

  return res.json(admin);
});

app.get('/api/devices', async (_req, res) => {
  const devices = await Device.find().sort({ createdAt: -1 });
  return res.json(devices);
});

app.post('/api/devices', async (req, res) => {
  const { name, brand, model, ipAddress, port, protocol, commKey, location, isActive } = req.body;

  if (!name || !model || !ipAddress || !port) {
    return res.status(400).json({ message: 'Name, model, IP address, and port are required' });
  }

  const device = await Device.create({
    name,
    brand: brand || 'ZKTeco',
    model,
    ipAddress,
    port,
    protocol: protocol || 'TCP/IP',
    commKey: commKey || '0',
    location,
    isActive,
  });

  return res.status(201).json(device);
});

app.patch('/api/devices/:id', async (req, res) => {
  const device = await Device.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!device) {
    return res.status(404).json({ message: 'Device not found' });
  }

  return res.json(device);
});

app.delete('/api/devices/:id', async (req, res) => {
  const device = await Device.findByIdAndDelete(req.params.id);

  if (!device) {
    return res.status(404).json({ message: 'Device not found' });
  }

  return res.json({ message: 'Device deleted' });
});

app.get('/api/departments', async (_req, res) => {
  const departments = await Department.find()
    .sort({ departmentName: 1 })
    .collation({ locale: 'en', numericOrdering: true });
  return res.json(departments);
});

app.post('/api/departments', async (req, res) => {
  const { departmentCode, departmentName, description, isActive } = req.body;

  if (!departmentCode || !departmentName) {
    return res.status(400).json({ message: 'Department code and name are required' });
  }

  const department = await Department.create({
    departmentCode,
    departmentName,
    description,
    isActive,
  });

  return res.status(201).json(department);
});

app.patch('/api/departments/:id', async (req, res) => {
  const department = await Department.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!department) {
    return res.status(404).json({ message: 'Department not found' });
  }

  await Employee.updateMany(
    { department: department._id },
    { departmentName: department.departmentName },
  );

  return res.json(department);
});

app.delete('/api/departments/:id', async (req, res) => {
  const employeeCount = await Employee.countDocuments({ department: req.params.id });

  if (employeeCount > 0) {
    return res.status(400).json({
      message: `Cannot delete department. ${employeeCount} employee records are using it.`,
    });
  }

  const department = await Department.findByIdAndDelete(req.params.id);

  if (!department) {
    return res.status(404).json({ message: 'Department not found' });
  }

  return res.json({ message: 'Department deleted' });
});

app.get('/api/employees', async (_req, res) => {
  const employees = await Employee.find()
    .populate('sourceDevice', 'name ipAddress model')
    .populate('department', 'departmentCode departmentName')
    .sort({ employeeCode: 1 })
    .collation({ locale: 'en', numericOrdering: true });
  return res.json(employees);
});

app.post('/api/employees', async (req, res) => {
  const {
    employeeCode,
    name,
    displayName,
    department,
    cardNumber,
    uid,
    role,
    password,
    sourceDevice,
    isActive,
  } = req.body;

  if (!employeeCode || !name || !sourceDevice) {
    return res.status(400).json({ message: 'Employee code, name, and source device are required' });
  }

  const device = await Device.findById(sourceDevice);

  if (!device) {
    return res.status(404).json({ message: 'Device not found' });
  }

  const departmentDoc = department ? await Department.findById(department) : null;

  if (department && !departmentDoc) {
    return res.status(404).json({ message: 'Department not found' });
  }

  const employee = await Employee.create({
    employeeCode,
    deviceUserId: employeeCode,
    uid: uid === '' || uid === null || uid === undefined ? Number(employeeCode) : Number(uid),
    name,
    displayName: displayName || name,
    department: departmentDoc?._id || null,
    departmentName: departmentDoc?.departmentName || '',
    cardNumber,
    role: Number(role || 0),
    password,
    sourceDevice: device._id,
    sourceDeviceName: device.name,
    sourceDeviceIp: device.ipAddress,
    isActive,
  });

  return res.status(201).json(employee);
});

app.patch('/api/employees/:id', async (req, res) => {
  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    return res.status(404).json({ message: 'Employee not found' });
  }

  const allowedFields = ['employeeCode', 'name', 'displayName', 'cardNumber', 'uid', 'role', 'password', 'isActive'];

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      employee[field] = field === 'role' || field === 'uid' ? Number(req.body[field]) : req.body[field];
    }
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'department')) {
    const departmentDoc = req.body.department ? await Department.findById(req.body.department) : null;

    if (req.body.department && !departmentDoc) {
      return res.status(404).json({ message: 'Department not found' });
    }

    employee.department = departmentDoc?._id || null;
    employee.departmentName = departmentDoc?.departmentName || '';
  }

  employee.displayName = employee.displayName || employee.name;
  employee.deviceUserId = employee.employeeCode;
  await employee.save();

  return res.json(employee);
});

app.delete('/api/employees/:id', async (req, res) => {
  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    return res.status(404).json({ message: 'Employee not found' });
  }

  if (req.query.systemOnly !== 'true') {
    const device = await Device.findById(employee.sourceDevice);

    if (!device) {
      return res.status(404).json({ message: 'Source device not found' });
    }

    try {
      await deleteUserFromDevice(employee, device);
    } catch (error) {
      device.lastConnectionStatus = 'failed';
      device.lastConnectionMessage = error.message;
      device.lastTestedAt = new Date();
      await device.save();

      return res.status(500).json({
        message: `Cannot delete user from device: ${error.message}`,
      });
    }
  }

  await employee.deleteOne();

  return res.json({
    message: 'Employee deleted from system database and source device.',
  });
});

app.post('/api/employees/sync', async (_req, res) => {
  const devices = await Device.find({ isActive: true });

  if (devices.length === 0) {
    return res.status(400).json({ message: 'No active devices configured' });
  }

  const results = [];

  for (const device of devices) {
    try {
      const result = await syncUsersFromDevice(device);
      results.push({
        deviceId: device._id,
        deviceName: device.name,
        success: true,
        ...result,
      });
    } catch (error) {
      device.lastConnectionStatus = 'failed';
      device.lastConnectionMessage = error.message;
      device.lastTestedAt = new Date();
      await device.save();

      results.push({
        deviceId: device._id,
        deviceName: device.name,
        success: false,
        synced: 0,
        message: error.message,
      });
    }
  }

  const totalSynced = results.reduce((total, result) => total + result.synced, 0);
  const employees = await Employee.find()
    .populate('sourceDevice', 'name ipAddress model')
    .populate('department', 'departmentCode departmentName')
    .sort({ employeeCode: 1 })
    .collation({ locale: 'en', numericOrdering: true });

  return res.json({
    message: `Sync completed. ${totalSynced} user records processed.`,
    totalSynced,
    results,
    employees,
  });
});

app.post('/api/employees/:id/sync-to-device', async (req, res) => {
  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    return res.status(404).json({ message: 'Employee not found' });
  }

  const device = await Device.findById(employee.sourceDevice);

  if (!device) {
    return res.status(404).json({ message: 'Source device not found' });
  }

  try {
    const result = await pushUserToDevice(employee, device);
    return res.json(result);
  } catch (error) {
    device.lastConnectionStatus = 'failed';
    device.lastConnectionMessage = error.message;
    device.lastTestedAt = new Date();
    await device.save();

    return res.status(500).json({ message: error.message });
  }
});

app.post('/api/devices/:id/test-connection', async (req, res) => {
  const device = await Device.findById(req.params.id);

  if (!device) {
    return res.status(404).json({ message: 'Device not found' });
  }

  const result = await testDeviceConnection({
    ipAddress: device.ipAddress,
    port: device.port,
  });

  device.lastConnectionStatus = result.connected ? 'connected' : 'failed';
  device.lastConnectionMessage = result.message;
  device.lastTestedAt = new Date();
  await device.save();

  return res.json({
    connected: result.connected,
    message: result.message,
    device,
  });
});

app.get('/api/attendance', async (req, res) => {
  const { date, startDate, endDate, deviceId, departmentId } = req.query;
  const filter = {};

  const fromDate = startDate || date;
  const toDate = endDate || date || startDate;

  if (fromDate || toDate) {
    const start = new Date(`${fromDate || toDate}T00:00:00`);
    const end = new Date(start);
    if (toDate) {
      const selectedEnd = new Date(`${toDate}T00:00:00`);
      end.setTime(selectedEnd.getTime());
    }
    end.setDate(end.getDate() + 1);
    filter.recordTime = { $gte: start, $lt: end };
  }

  if (deviceId && deviceId !== 'all') {
    filter.sourceDevice = deviceId;
  }

  if (departmentId && departmentId !== 'all') {
    const employees = await Employee.find({ department: departmentId }).select('_id');
    filter.employee = { $in: employees.map((employee) => employee._id) };
  }

  const logs = await AttendanceLog.find(filter)
    .populate('sourceDevice', 'name ipAddress model')
    .populate('employee', 'name employeeCode cardNumber')
    .sort({ recordTime: -1 })
    .limit(1000);

  return res.json(logs);
});

app.get('/api/attendance/summary', async (req, res) => {
  const { date, startDate, endDate, deviceId, departmentId } = req.query;
  const { filter, fromDate, toDate } = buildDateFilter({ date, startDate, endDate });
  const shifts = await Shift.find({ isActive: true });
  extendFilterForShiftContext(filter, shifts);
  const { calculationStartDate, calculationEndDate } = getShiftContextDates({ fromDate, toDate, shifts });

  if (deviceId && deviceId !== 'all') {
    filter.sourceDevice = deviceId;
  }

  if (departmentId && departmentId !== 'all') {
    const employees = await Employee.find({ department: departmentId }).select('_id');
    filter.employee = { $in: employees.map((employee) => employee._id) };
  }

  const logs = await AttendanceLog.find(filter)
    .populate('sourceDevice', 'name ipAddress model')
    .populate('employee', 'name displayName employeeCode departmentName department')
    .sort({ recordTime: 1 })
    .limit(5000);
  const summary = buildAttendanceSummary({
    logs,
    shifts,
    startDate: calculationStartDate,
    endDate: calculationEndDate,
    outputStartDate: fromDate ? new Date(`${fromDate}T00:00:00`) : undefined,
    outputEndDate: toDate ? new Date(`${toDate}T00:00:00`) : undefined,
  });

  return res.json(summary);
});

app.post('/api/attendance/sync', async (_req, res) => {
  const devices = await Device.find({ isActive: true });

  if (devices.length === 0) {
    return res.status(400).json({ message: 'No active devices configured' });
  }

  const results = [];

  for (const device of devices) {
    try {
      const result = await syncAttendanceFromDevice(device);
      results.push({
        deviceId: device._id,
        deviceName: device.name,
        success: true,
        ...result,
      });
    } catch (error) {
      device.lastConnectionStatus = 'failed';
      device.lastConnectionMessage = error.message;
      device.lastTestedAt = new Date();
      await device.save();

      results.push({
        deviceId: device._id,
        deviceName: device.name,
        success: false,
        synced: 0,
        message: error.message,
      });
    }
  }

  const totalSynced = results.reduce((total, result) => total + result.synced, 0);

  return res.json({
    message: `Attendance sync completed. ${totalSynced} records processed.`,
    totalSynced,
    results,
  });
});

app.post('/api/attendance/fix-missing', async (req, res) => {
  const { date, startDate, endDate, deviceId, departmentId } = req.body || {};
  const { filter, fromDate, toDate } = buildDateFilter({ date, startDate, endDate });
  const shifts = await Shift.find({ isActive: true });
  extendFilterForShiftContext(filter, shifts);
  const { calculationStartDate, calculationEndDate } = getShiftContextDates({ fromDate, toDate, shifts });

  if (deviceId && deviceId !== 'all') {
    filter.sourceDevice = deviceId;
  }

  if (departmentId && departmentId !== 'all') {
    const employees = await Employee.find({ department: departmentId }).select('_id');
    filter.employee = { $in: employees.map((employee) => employee._id) };
  }

  const logs = await AttendanceLog.find(filter)
    .populate('sourceDevice', 'name ipAddress model')
    .populate('employee', 'name displayName employeeCode departmentName department')
    .sort({ recordTime: 1 })
    .limit(5000);
  const summary = buildAttendanceSummary({
    logs,
    shifts,
    startDate: calculationStartDate,
    endDate: calculationEndDate,
    outputStartDate: fromDate ? new Date(`${fromDate}T00:00:00`) : undefined,
    outputEndDate: toDate ? new Date(`${toDate}T00:00:00`) : undefined,
  });
  const shiftsByCode = new Map(shifts.map((shift) => [shift.shiftCode || shift.code, shift]));
  const missingRows = summary.filter((row) => row.status === 'missing-out' || !row.out);
  const results = [];

  for (const row of missingRows) {
    const shift = shiftsByCode.get(row.shift);
    const sourceDeviceId = row.sourceDevice?._id || row.sourceDevice;

    if (!shift || !sourceDeviceId) {
      results.push({
        employeeCode: row.employeeCode,
        fixed: false,
        message: 'Missing shift or source device',
      });
      continue;
    }

    const shiftEnd = buildShiftEndDate(row.date, shift);
    const maxLateMinutes = Math.max(1, Number(shift.allowedLateMinutes || 30));
    const randomMinuteOffset = Math.floor(Math.random() * (maxLateMinutes + 1));
    const fixedOutTime = addMinutes(shiftEnd, randomMinuteOffset);
    const device = await Device.findById(sourceDeviceId);
    const employee = await Employee.findOne({
      sourceDevice: sourceDeviceId,
      employeeCode: row.employeeCode,
    });

    if (!device) {
      results.push({
        employeeCode: row.employeeCode,
        fixed: false,
        message: 'Source device not found',
      });
      continue;
    }

    const existingLog = await AttendanceLog.findOne({
      sourceDevice: sourceDeviceId,
      employeeCode: row.employeeCode,
      recordTime: fixedOutTime,
    });

    if (existingLog) {
      results.push({
        employeeCode: row.employeeCode,
        fixed: false,
        message: 'Generated OUT time already exists',
      });
      continue;
    }

    await AttendanceLog.create({
      sourceDevice: device._id,
      sourceDeviceName: device.name,
      sourceDeviceIp: device.ipAddress,
      employee: employee?._id || null,
      employeeCode: row.employeeCode,
      employeeName: employee?.displayName || employee?.name || row.name,
      cardNumber: employee?.cardNumber || '',
      uid: employee?.uid ?? null,
      recordTime: fixedOutTime,
      verifyMode: 'system-fix',
      raw: {
        source: 'fix-missing-out',
        fixedFrom: {
          date: row.date,
          in: row.in,
          shift: row.shift,
          shiftName: row.shiftName,
        },
        randomMinuteOffset,
        fixedAt: new Date(),
      },
    });

    results.push({
      employeeCode: row.employeeCode,
      name: row.name,
      deviceName: device.name,
      shift: row.shift,
      fixed: true,
      out: `${pad(fixedOutTime.getHours())}:${pad(fixedOutTime.getMinutes())}`,
      randomMinuteOffset,
    });
  }

  const fixedCount = results.filter((result) => result.fixed).length;

  return res.json({
    message:
      fixedCount > 0
        ? `Fixed ${fixedCount} missing OUT record${fixedCount > 1 ? 's' : ''}.`
        : 'No missing OUT records were fixed.',
    fixedCount,
    totalMissing: missingRows.length,
    results,
  });
});

app.get('/api/shifts', async (_req, res) => {
  const shifts = await Shift.find().sort({ startTime: 1, shiftCode: 1 });
  return res.json(shifts);
});

app.post('/api/shifts', async (req, res) => {
  const {
    shiftCode,
    shiftName,
    startTime,
    endTime,
    allowedEarlyMinutes,
    allowedLateMinutes,
    isOvernight,
    isActive,
  } = req.body;

  if (!shiftCode || !shiftName || !startTime || !endTime) {
    return res.status(400).json({ message: 'Shift code, shift name, start time, and end time are required' });
  }

  const shift = await Shift.create({
    shiftCode,
    shiftName,
    code: shiftCode,
    name: shiftName,
    startTime,
    endTime,
    allowedEarlyMinutes,
    allowedLateMinutes,
    isOvernight,
    isActive,
  });
  return res.status(201).json(shift);
});

app.patch('/api/shifts/:id', async (req, res) => {
  const payload = {
    ...req.body,
  };

  if (payload.shiftCode) {
    payload.code = payload.shiftCode;
  }

  if (payload.shiftName) {
    payload.name = payload.shiftName;
  }

  const shift = await Shift.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });

  if (!shift) {
    return res.status(404).json({ message: 'Shift not found' });
  }

  return res.json(shift);
});

app.delete('/api/shifts/:id', async (req, res) => {
  const shift = await Shift.findByIdAndDelete(req.params.id);

  if (!shift) {
    return res.status(404).json({ message: 'Shift not found' });
  }

  return res.json({ message: 'Shift deleted' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});
