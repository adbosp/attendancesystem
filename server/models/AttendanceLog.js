import mongoose from 'mongoose';

const attendanceLogSchema = new mongoose.Schema(
  {
    sourceDevice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: true,
    },
    sourceDeviceName: {
      type: String,
      required: true,
      trim: true,
    },
    sourceDeviceIp: {
      type: String,
      required: true,
      trim: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    employeeCode: {
      type: String,
      required: true,
      trim: true,
    },
    employeeName: {
      type: String,
      default: 'Unknown Employee',
      trim: true,
    },
    cardNumber: {
      type: String,
      default: '',
      trim: true,
    },
    uid: {
      type: Number,
      default: null,
    },
    recordTime: {
      type: Date,
      required: true,
    },
    verifyMode: {
      type: String,
      default: '',
      trim: true,
    },
    raw: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

attendanceLogSchema.index({ sourceDevice: 1, employeeCode: 1, recordTime: 1 }, { unique: true });

const AttendanceLog = mongoose.model('AttendanceLog', attendanceLogSchema);

export default AttendanceLog;
