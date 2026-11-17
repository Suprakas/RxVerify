const { Router } = require('express');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { prescriptionFile } = require('../middleware/upload');
const { ROLES } = require('../constants');
const s = require('../validation/schemas');
const c = require('../controllers/prescriptionController');

const router = Router();
const { CUSTOMER, PHARMACIST, ADMIN } = ROLES;

router.use(requireAuth);

// Customer
router.post('/', requireRole(CUSTOMER), prescriptionFile(), validate({ body: s.createPrescriptionBody }), c.create);
router.get('/mine', requireRole(CUSTOMER), validate({ query: s.listMineQuery }), c.listMine);
router.put('/:id/file', requireRole(CUSTOMER), validate({ params: s.idParams }), prescriptionFile(), validate({ body: s.reuploadBody }), c.reupload);

// Pharmacist (admins can look, only pharmacists can act)
router.get('/queue', requireRole(PHARMACIST, ADMIN), validate({ query: s.queueQuery }), c.listQueue);
router.post('/:id/claim', requireRole(PHARMACIST), validate({ params: s.idParams }), c.claim);
router.post('/:id/release', requireRole(PHARMACIST), validate({ params: s.idParams }), c.release);
router.patch('/:id/status', requireRole(PHARMACIST), validate({ params: s.idParams, body: s.decisionBody }), c.decide);
router.post('/:id/extract', requireRole(PHARMACIST), validate({ params: s.idParams }), c.retryExtraction);

// Anyone allowed to see it (customers only their own; checked in the service)
router.get('/:id', validate({ params: s.idParams }), c.getOne);
router.get('/:id/file', validate({ params: s.idParams }), c.getFile);
router.get('/:id/audit', validate({ params: s.idParams }), c.getAudit);

module.exports = router;
