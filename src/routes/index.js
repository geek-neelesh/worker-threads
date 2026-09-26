const express = require('express');
const { upload, uploadFile } = require('../controllers/uploadController');
const { searchByUsername, aggregateByUser } = require('../controllers/policyController');
const { schedulePost, listMessages, listJobs } = require('../controllers/messageController');

const router = express.Router();

router.post('/upload', upload.single('file'), uploadFile);
router.get('/policies/search', searchByUsername);
router.get('/policies/aggregate', aggregateByUser);
router.post('/messages/schedule', schedulePost);

module.exports = router;
