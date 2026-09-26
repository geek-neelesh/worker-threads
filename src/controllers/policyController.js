const User = require('../models/User');
const PolicyInfo = require('../models/PolicyInfo');
require('../models/Lob');
require('../models/Carrier');

async function searchByUsername(req, res, next) {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ error: 'Query param "username" is required' });
    }

    const regex = new RegExp(username.trim(), 'i');
    const users = await User.find({ $or: [{ firstName: regex }, { email: regex }] }).select('_id');

    const policies = await PolicyInfo.find({ userId: { $in: users.map((u) => u._id) } })
      .populate('userId')
      .populate('policyCategoryId')
      .populate('companyCollectionId');

    res.json({ count: policies.length, policies });
  } catch (err) {
    next(err);
  }
}

async function aggregateByUser(req, res, next) {
  try {
    const result = await PolicyInfo.aggregate([
      {
        $group: {
          _id: '$userId',
          totalPolicies: { $sum: 1 },
          policyNumbers: { $push: '$policyNumber' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          totalPolicies: 1,
          policyNumbers: 1,
          'user.firstName': 1,
          'user.email': 1,
          'user.userType': 1,
        },
      },
      { $sort: { totalPolicies: -1 } },
    ]);

    res.json({ count: result.length, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { searchByUsername, aggregateByUser };
