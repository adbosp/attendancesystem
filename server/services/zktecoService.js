import { createRequire } from 'module';
import AttendanceLog from '../models/AttendanceLog.js';
import Employee from '../models/Employee.js';

const require = createRequire(import.meta.url);
const ZKLib = require('zklib-js');

const normalizeDeviceUser = (user, device) => {
  const employeeCode = String(user.userId ?? user.userid ?? user.uid ?? '').trim();
  const fallbackName = employeeCode ? `Employee ${employeeCode}` : `Employee ${user.uid}`;

  return {
    employeeCode,
    deviceUserId: employeeCode,
    uid: Number.isFinite(Number(user.uid)) ? Number(user.uid) : null,
    name: String(user.name || fallbackName).trim(),
    cardNumber: String(user.cardno ?? user.cardNo ?? '').trim(),
    role: Number.isFinite(Number(user.role)) ? Number(user.role) : 0,
    password: String(user.password ?? ''),
    sourceDevice: device._id,
    sourceDeviceName: device.name,
    sourceDeviceIp: device.ipAddress,
    lastSyncedAt: new Date(),
    isActive: true,
  };
};

export const syncUsersFromDevice = async (device) => {
  const zk = new ZKLib(device.ipAddress, device.port, 8000, 5000);

  try {
    await zk.createSocket();
    const users = await zk.getUsers();
    const rows = Array.isArray(users?.data) ? users.data : users;
    const normalizedUsers = rows
      .map((user) => normalizeDeviceUser(user, device))
      .filter((employee) => employee.employeeCode);

    let upserted = 0;

    for (const employee of normalizedUsers) {
      await Employee.findOneAndUpdate(
        { sourceDevice: device._id, employeeCode: employee.employeeCode },
        {
          $set: employee,
          $setOnInsert: {
            displayName: employee.name,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
      upserted += 1;
    }

    device.lastConnectionStatus = 'connected';
    device.lastConnectionMessage = `Synced ${upserted} users`;
    device.lastTestedAt = new Date();
    device.lastSyncedAt = new Date();
    await device.save();

    return {
      connected: true,
      synced: upserted,
      message: `Synced ${upserted} users from ${device.name}`,
    };
  } finally {
    try {
      await zk.disconnect();
    } catch {
      // Device may already close the socket after failed commands.
    }
  }
};

export const syncAttendanceFromDevice = async (device) => {
  const zk = new ZKLib(device.ipAddress, device.port, 12000, 5000);

  try {
    await zk.createSocket();
    const logs = await zk.getAttendances();
    const rows = Array.isArray(logs?.data) ? logs.data : logs;
    let upserted = 0;

    for (const row of rows) {
      const employeeCode = String(row.deviceUserId ?? row.userId ?? row.uid ?? '').trim();
      const recordTime = new Date(row.recordTime ?? row.attTime);

      if (!employeeCode || Number.isNaN(recordTime.getTime())) {
        continue;
      }

      const employee = await Employee.findOne({
        sourceDevice: device._id,
        employeeCode,
      });

      await AttendanceLog.findOneAndUpdate(
        {
          sourceDevice: device._id,
          employeeCode,
          recordTime,
        },
        {
          $set: {
            sourceDevice: device._id,
            sourceDeviceName: device.name,
            sourceDeviceIp: device.ipAddress,
            employee: employee?._id || null,
            employeeCode,
            employeeName: employee?.displayName || employee?.name || `Employee ${employeeCode}`,
            cardNumber: employee?.cardNumber || '',
            uid: Number.isFinite(Number(row.userSn)) ? Number(row.userSn) : employee?.uid || null,
            recordTime,
            verifyMode: String(row.verifyMode ?? row.status ?? ''),
            raw: row,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
      upserted += 1;
    }

    device.lastConnectionStatus = 'connected';
    device.lastConnectionMessage = `Synced ${upserted} attendance logs`;
    device.lastTestedAt = new Date();
    device.lastSyncedAt = new Date();
    await device.save();

    return {
      connected: true,
      synced: upserted,
      message: `Synced ${upserted} attendance logs from ${device.name}`,
    };
  } finally {
    try {
      await zk.disconnect();
    } catch {
      // Device may already close the socket after failed commands.
    }
  }
};

export const pushUserToDevice = async (employee, device) => {
  const zk = new ZKLib(device.ipAddress, device.port, 8000, 5000);
  const uid = Number(employee.uid || employee.employeeCode);
  const employeeCode = String(employee.employeeCode);
  const name = String(employee.name || employeeCode).slice(0, 24);
  const password = String(employee.password || '').slice(0, 8);
  const role = Number(employee.role || 0);
  const cardNumber = Number(employee.cardNumber || 0);

  if (!Number.isFinite(uid) || uid <= 0 || uid > 3000) {
    throw new Error('UID must be a number from 1 to 3000 before syncing to device');
  }

  if (!Number.isFinite(cardNumber) || cardNumber < 0 || cardNumber > 4294967295) {
    throw new Error('Card number must be a valid 32-bit number before syncing to device');
  }

  try {
    await zk.createSocket();
    const command = Buffer.alloc(72);
    command.writeUInt16LE(uid, 0);
    command.writeUInt8(role, 2);
    command.write(password, 3, 8, 'ascii');
    command.write(name, 11, 24, 'ascii');
    command.writeUInt32LE(cardNumber, 35);
    command.write(employeeCode.slice(0, 9), 48, 9, 'ascii');
    const result = await zk.executeCmd(8, command);

    employee.lastSyncedAt = new Date();
    employee.sourceDeviceName = device.name;
    employee.sourceDeviceIp = device.ipAddress;
    await employee.save();

    device.lastConnectionStatus = 'connected';
    device.lastConnectionMessage = `Updated user ${employee.employeeCode}`;
    device.lastTestedAt = new Date();
    device.lastSyncedAt = new Date();
    await device.save();

    return {
      success: Boolean(result),
      message: `Synced ${employee.employeeCode} to ${device.name}`,
    };
  } finally {
    try {
      await zk.disconnect();
    } catch {
      // Device may already close the socket after failed commands.
    }
  }
};

export const deleteUserFromDevice = async (employee, device) => {
  const zk = new ZKLib(device.ipAddress, device.port, 8000, 5000);
  const uid = Number(employee.uid);

  if (!Number.isFinite(uid) || uid <= 0 || uid > 3000) {
    throw new Error('UID must be a number from 1 to 3000 before deleting from device');
  }

  try {
    await zk.createSocket();
    const command = Buffer.alloc(2);
    command.writeUInt16LE(uid, 0);
    await zk.executeCmd(18, command);

    device.lastConnectionStatus = 'connected';
    device.lastConnectionMessage = `Deleted user ${employee.employeeCode}`;
    device.lastTestedAt = new Date();
    device.lastSyncedAt = new Date();
    await device.save();

    return {
      success: true,
      message: `Deleted ${employee.employeeCode} from ${device.name}`,
    };
  } finally {
    try {
      await zk.disconnect();
    } catch {
      // Device may already close the socket after failed commands.
    }
  }
};
