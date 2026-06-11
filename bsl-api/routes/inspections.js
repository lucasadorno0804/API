const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const inspectionsController = require('../controllers/inspectionsController');

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './uploads';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Appending extension
  }
});
const upload = multer({ storage: storage });

router.get('/:appointmentId', inspectionsController.getInspection);
router.post('/', inspectionsController.createInspection);
router.put('/:id', inspectionsController.updateChecklist);
router.put('/:id/vehicle', inspectionsController.updateVehicle);
router.post('/:id/upload', upload.single('image'), inspectionsController.uploadImage);
router.post('/:id/lock', inspectionsController.lockInspection);

module.exports = router;
