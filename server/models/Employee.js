import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema(
  {
    employeeCode: {
      type: String,
      required: true,
      trim: true,
    },
    deviceUserId: {
      type: String,
      required: true,
      trim: true,
    },
    uid: {
      type: Number,
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    displayName: {
      type: String,
      default: '',
      trim: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    departmentName: {
      type: String,
      default: '',
      trim: true,
    },
    cardNumber: {
      type: String,
      default: '',
      trim: true,
    },
    role: {
      type: Number,
      default: 0,
    },
    password: {
      type: String,
      default: '',
      trim: true,
    },
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
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

employeeSchema.index({ sourceDevice: 1, employeeCode: 1 }, { unique: true });

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;
