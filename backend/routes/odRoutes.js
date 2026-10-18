const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { createODRequest, getMyODRequests, getODRequestById } = require('../controllers/odController');

const router = express.Router();

router.use(authMiddleware);
router.post('/', createODRequest);
router.get('/my', getMyODRequests);
router.get('/:id', getODRequestById);

module.exports = router;
