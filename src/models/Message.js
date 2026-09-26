const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduledJob' },
    insertedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
