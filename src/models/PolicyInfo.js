const mongoose = require('mongoose');

const policyInfoSchema = new mongoose.Schema(
  {
    policyNumber: { type: String, required: true, unique: true, trim: true },
    policyStartDate: { type: Date },
    policyEndDate: { type: Date },
    policyCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lob' },
    companyCollectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Carrier' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PolicyInfo', policyInfoSchema);
