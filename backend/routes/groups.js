const express = require('express');
const { createGroup, getGroups, inviteMember, getGroupStreaks } = require('../controllers/groupController');

const router = express.Router();

router.get('/', getGroups);
router.post('/', createGroup);
router.post('/:id/invite', inviteMember);
router.get('/:id/streaks', getGroupStreaks);

module.exports = router;
