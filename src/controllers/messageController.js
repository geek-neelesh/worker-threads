const Message = require('../models/Message');
const ScheduledJob = require('../models/ScheduledJob');
const { scheduleMessage } = require('../services/scheduler');

async function schedulePost(req, res, next) {
  try {
    const { message, day, time } = req.body;
    if (!message || !day || !time) {
      return res.status(400).json({ error: 'Body params "message", "day" and "time" are required' });
    }
    const job = await scheduleMessage({ message, day, time });
    res.status(201).json({
      message: 'Message scheduled',
      job: {
        id: job._id,
        message: job.message,
        scheduledFor: job.scheduledFor,
        status: job.status,
      },
    });
  } catch (err) {
    if (/Invalid|in the past|already passed/i.test(err.message)) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

module.exports = { schedulePost };
