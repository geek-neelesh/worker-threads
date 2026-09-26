const mongoose = require('mongoose');

const scheduledJobSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    day: { type: String, required: true },
    time: { type: String, required: true },
    scheduledFor: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'inserted', 'failed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ScheduledJob', scheduledJobSchema);
