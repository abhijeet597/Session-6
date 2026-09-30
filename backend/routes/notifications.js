const express = require('express');
const { getNotifications, respondToInvite } = require('../controllers/notificationController');

const router = express.Router();

router.get('/', getNotifications);
router.post('/:id/respond', respondToInvite);

module.exports = router;
