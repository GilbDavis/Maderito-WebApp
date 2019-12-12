const path = require('path');

const express = require('express');
const { body } = require('express-validator/check')

const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');

const fileFilter = (req, file, cb) => {
   if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
      cb(null, true);
   } else {
      cb(null, false);
   }
};
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, fileFilter: fileFilter });

const router = express.Router();

// /admin/add-product => GET
router.get('/add-product', isAuth, adminController.getAddProduct);

// /admin/products => GET
router.get('/products', isAuth, adminController.getProducts);

router.get("/agenda", isAuth, adminController.getProducts);

// /admin/add-product => POST
router.post('/add-product', upload.single("imageUrl"),
   [body('title')
      .isString()
      .isLength({ min: 3 })
      .trim(),
   body('description')
      .isLength({ min: 8, max: 250 })
      .trim()
   ], isAuth, adminController.postAddProduct);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

router.post('/edit-product', upload.single("imageUrl"),
   [body('title')
      .isString()
      .isLength({ min: 3 })
      .trim(),
   body('description')
      .isLength({ min: 8, max: 250 })
      .trim()
   ], isAuth, adminController.postEditProduct);

router.post('/delete-product', upload.single("imageUrl"), isAuth, adminController.deleteProduct);

module.exports = router;
