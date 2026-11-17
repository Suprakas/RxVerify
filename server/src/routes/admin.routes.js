const { Router } = require('express');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ROLES } = require('../constants');
const s = require('../validation/schemas');
const admin = require('../controllers/adminController');

const router = Router();

router.use(requireAuth, requireRole(ROLES.ADMIN));

router.get('/users', validate({ query: s.usersQuery }), admin.listUsers);
router.post('/pharmacists', validate({ body: s.createPharmacistBody }), admin.createPharmacist);
router.patch('/users/:id', validate({ params: s.idParams, body: s.updateUserBody }), admin.updateUser);
router.get('/stats', admin.stats);

module.exports = router;
