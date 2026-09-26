const schedule = require('node-schedule');
const ScheduledJob = require('../models/ScheduledJob');
const Message = require('../models/Message');

const WEEKDAYS = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function parseTime(timeStr) {
  const match = String(timeStr)
    .trim()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) throw new Error(`Invalid time format: "${timeStr}". Use HH:mm or h:mm AM/PM.`);
  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3] ? match[3].toLowerCase() : null;
  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) throw new Error(`Invalid time: "${timeStr}"`);
  return { hours, minutes };
}

function computeScheduleDate(day, time) {
  const { hours, minutes } = parseTime(time);
  const now = new Date();
  const dayStr = String(day).trim().toLowerCase();

  let date;
  if (dayStr === 'today') {
    date = new Date(now);
  } else if (dayStr === 'tomorrow') {
    date = new Date(now);
    date.setDate(date.getDate() + 1);
  } else if (WEEKDAYS[dayStr] !== undefined) {
    date = new Date(now);
    let diff = WEEKDAYS[dayStr] - date.getDay();
    if (diff <= 0) diff += 7;
    date.setDate(date.getDate() + diff);
  } else {
    const parsed = new Date(dayStr);
    if (isNaN(parsed.getTime())) {
      throw new Error(
        `Invalid day: "${day}". Use a weekday name, "today", "tomorrow", or a date (YYYY-MM-DD).`
      );
    }
    date = parsed;
  }

  date.setHours(hours, minutes, 0, 0);

  if (dayStr === 'today' && date <= now) {
    throw new Error(`The time "${time}" today has already passed.`);
  }
  if (date <= now && !['today', 'tomorrow'].includes(dayStr) && WEEKDAYS[dayStr] === undefined) {
    throw new Error(`Scheduled time "${day} ${time}" is in the past.`);
  }
  return date;
}

async function executeJob(jobId) {
  const job = await ScheduledJob.findById(jobId);
  if (!job || job.status !== 'pending') return;
  try {
    await Message.create({ message: job.message, jobId: job._id });
    job.status = 'inserted';
    await job.save();
    console.log(`[scheduler] Inserted scheduled message "${job.message}" (job ${job._id})`);
  } catch (err) {
    job.status = 'failed';
    await job.save();
    console.error(`[scheduler] Job ${job._id} failed:`, err.message);
  }
}

function armJob(job) {
  schedule.scheduleJob(job._id.toString(), job.scheduledFor, () => executeJob(job._id));
}

async function scheduleMessage({ message, day, time }) {
  const scheduledFor = computeScheduleDate(day, time);
  const job = await ScheduledJob.create({ message, day, time, scheduledFor });
  armJob(job);
  return job;
}

async function initScheduler() {
  const pending = await ScheduledJob.find({ status: 'pending' });
  const now = new Date();
  for (const job of pending) {
    if (job.scheduledFor <= now) {
      await executeJob(job._id);
    } else {
      armJob(job);
    }
  }
  console.log(`[scheduler] Re-armed ${pending.length} pending job(s)`);
}

module.exports = { scheduleMessage, initScheduler, computeScheduleDate };
