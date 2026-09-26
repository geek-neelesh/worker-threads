const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true },
    dob: { type: Date },
    address: { type: String, trim: true },
    phoneNumber: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    gender: { type: String, trim: true },
    userType: { type: String, trim: true },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
