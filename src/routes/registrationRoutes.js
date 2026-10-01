const express = require('express');
const {
  createRegistration,
  getMyRegistrations,
  cancelRegistration,
} = require('../controllers/registrationController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth); // every registration route requires a logged-in user

router.post('/', createRegistration);
router.get('/me', getMyRegistrations);
router.patch('/:id/cancel', cancelRegistration);

module.exports = router;
