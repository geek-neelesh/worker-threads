const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    accountName: { type: String, required: true, trim: true },
    accountType: { type: String, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Account', accountSchema);
