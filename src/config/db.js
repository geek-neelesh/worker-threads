const mongoose = require('mongoose');

let memoryServer = null;

async function connectDB() {
  let uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/insurance_assignment';

  if (process.env.USE_MEMORY_DB === 'true') {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri('insurance_assignment');
    console.log(`[db] Using in-memory MongoDB at ${uri}`);
  }

  await mongoose.connect(uri);
  console.log(`[db] Connected to MongoDB (${mongoose.connection.name})`);
  return uri;
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

module.exports = { connectDB, disconnectDB };
