const { parentPort, workerData } = require('worker_threads');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const ExcelJS = require('exceljs');

const Agent = require('../models/Agent');
const User = require('../models/User');
const Account = require('../models/Account');
const Lob = require('../models/Lob');
const Carrier = require('../models/Carrier');
const PolicyInfo = require('../models/PolicyInfo');

const { filePath, mongoUri } = workerData;

async function parseFile(fp) {
  const ext = path.extname(fp).toLowerCase();
  if (ext === '.csv') {
    const content = fs.readFileSync(fp, 'utf-8');
    return parse(content, {
      columns: (header) => header.map((h) => String(h).trim().toLowerCase()),
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    });
  }
  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(fp);
    const sheet = workbook.worksheets[0];
    const headers = sheet.getRow(1).values.slice(1).map((h) => String(h).trim().toLowerCase());
    const rows = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const normalized = {};
      row.values.slice(1).forEach((v, i) => {
        normalized[headers[i]] = v && typeof v === 'object' && v.text ? v.text : v;
      });
      rows.push(normalized);
    });
    return rows;
  }
  throw new Error(`Unsupported file type: ${ext}`);
}

function val(row, ...keys) {
  for (const key of keys) {
    const v = row[key];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      return String(v).trim();
    }
  }
  return '';
}

function toDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

async function upsert(Model, filter, doc, cache, cacheKey) {
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const found = await Model.findOneAndUpdate(filter, doc, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });
  cache.set(cacheKey, found._id);
  return found._id;
}

async function run() {
  await mongoose.connect(mongoUri);

  const rows = await parseFile(filePath);
  const stats = {
    rowsProcessed: 0,
    agents: 0,
    users: 0,
    accounts: 0,
    lobs: 0,
    carriers: 0,
    policies: 0,
    errors: [],
  };

  const agentCache = new Map();
  const userCache = new Map();
  const accountCache = new Map();
  const lobCache = new Map();
  const carrierCache = new Map();

  for (const row of rows) {
    try {
      const agentName = val(row, 'agent');
      const agentId = agentName
        ? await upsert(Agent, { agentName }, { agentName }, agentCache, agentName)
        : null;
      if (agentId) stats.agents = agentCache.size;

      const firstName = val(row, 'firstname', 'first_name', 'first name');
      const email = val(row, 'email').toLowerCase();
      const dob = toDate(val(row, 'dob', 'date of birth'));
      const phoneNumber = val(row, 'phone', 'phonenumber', 'phone number');
      const userDoc = {
        firstName,
        dob,
        address: val(row, 'address'),
        phoneNumber,
        state: val(row, 'state'),
        zipCode: val(row, 'zip', 'zipcode', 'zip code'),
        email,
        gender: val(row, 'gender'),
        userType: val(row, 'usertype', 'user_type', 'user type'),
        agentId,
      };
      const userKey = email || `${firstName}|${userDoc.dob}|${phoneNumber}`;
      const userFilter = email
        ? { email }
        : { firstName, dob: userDoc.dob, phoneNumber };
      const userId = await upsert(User, userFilter, userDoc, userCache, userKey);
      stats.users = userCache.size;

      const accountName = val(row, 'account_name', 'accountname', 'account name');
      if (accountName) {
        const accountDoc = {
          accountName,
          accountType: val(row, 'account_type', 'accounttype', 'account type'),
          userId,
        };
        const accountKey = `${accountName}|${userId}`;
        await upsert(
          Account,
          { accountName, userId },
          accountDoc,
          accountCache,
          accountKey
        );
        stats.accounts = accountCache.size;
      }

      const categoryName = val(row, 'category_name', 'categoryname', 'category', 'lob');
      const lobId = categoryName
        ? await upsert(
            Lob,
            { categoryName },
            { categoryName },
            lobCache,
            categoryName
          )
        : null;
      stats.lobs = lobCache.size;

      const companyName = val(row, 'company_name', 'companyname', 'company', 'carrier');
      const carrierId = companyName
        ? await upsert(
            Carrier,
            { companyName },
            { companyName },
            carrierCache,
            companyName
          )
        : null;
      stats.carriers = carrierCache.size;

      const policyNumber = val(row, 'policy_number', 'policynumber', 'policy number');
      if (policyNumber) {
        await PolicyInfo.findOneAndUpdate(
          { policyNumber },
          {
            policyNumber,
            policyStartDate: toDate(val(row, 'policy_start_date', 'policystartdate', 'policy start date')),
            policyEndDate: toDate(val(row, 'policy_end_date', 'policyenddate', 'policy end date')),
            policyCategoryId: lobId,
            companyCollectionId: carrierId,
            userId,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        stats.policies += 1;
      }

      stats.rowsProcessed += 1;
    } catch (err) {
      stats.errors.push({ row: stats.rowsProcessed + 1, message: err.message });
    }
  }

  await mongoose.disconnect();
  parentPort.postMessage({ success: true, stats });
}

run().catch(async (err) => {
  try {
    await mongoose.disconnect();
  } catch (_) {}
  parentPort.postMessage({ success: false, error: err.message });
});
