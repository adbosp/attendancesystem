import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      required: true,
      default: 'ZKTeco',
      trim: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    ipAddress: {
      type: String,
      required: true,
      trim: true,
    },
    port: {
      type: Number,
      required: true,
      default: 4370,
      min: 1,
      max: 65535,
    },
    protocol: {
      type: String,
      enum: ['TCP/IP', 'UDP'],
      default: 'TCP/IP',
    },
    commKey: {
      type: String,
      default: '0',
      trim: true,
    },
    location: {
      type: String,
      default: '',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastConnectionStatus: {
      type: String,
      enum: ['not_tested', 'connected', 'failed'],
      default: 'not_tested',
    },
    lastConnectionMessage: {
      type: String,
      default: '',
      trim: true,
    },
    lastTestedAt: {
      type: Date,
      default: null,
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const Device = mongoose.model('Device', deviceSchema);

export default Device;
