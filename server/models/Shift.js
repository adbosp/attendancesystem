import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: '',
      trim: true,
    },
    code: {
      type: String,
      default: '',
      uppercase: true,
      trim: true,
    },
    shiftCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    shiftName: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: String,
      required: true,
      trim: true,
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
    },
    breakStart: {
      type: String,
      default: '',
      trim: true,
    },
    breakEnd: {
      type: String,
      default: '',
      trim: true,
    },
    lateGraceMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    earlyLeaveGraceMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    allowedEarlyMinutes: {
      type: Number,
      default: 30,
      min: 0,
    },
    allowedLateMinutes: {
      type: Number,
      default: 30,
      min: 0,
    },
    minimumWorkMinutes: {
      type: Number,
      default: 480,
      min: 0,
    },
    workingDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5, 6],
    },
    isOvernight: {
      type: Boolean,
      default: false,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const Shift = mongoose.model('Shift', shiftSchema);

export default Shift;
