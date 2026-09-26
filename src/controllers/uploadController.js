const path = require('path');
const { Worker } = require('worker_threads');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
require('fs').mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.xlsx', '.xls'].includes(ext)) cb(null, true);
    else cb(new Error('Only .csv, .xlsx and .xls files are allowed'));
  },
});

async function uploadFile(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Use form field "file".' });
  }

  const worker = new Worker(path.join(__dirname, '..', 'workers', 'uploadWorker.js'), {
    workerData: {
      filePath: req.file.path,
      mongoUri: req.app.locals.mongoUri,
    },
  });

  worker.once('message', (result) => {
    if (result.success) {
      res.status(200).json({ message: 'File processed successfully', ...result.stats });
    } else {
      res.status(500).json({ error: 'Worker failed', details: result.error });
    }
  });
  worker.once('error', next);
  worker.once('exit', (code) => {
    if (code !== 0) {
      console.error(`[upload] Worker exited with code ${code}`);
    }
  });
}

module.exports = { upload, uploadFile };
