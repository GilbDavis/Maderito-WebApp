const express = require('express');
const { check, body } = require('express-validator/check');

const authController = require('../controllers/auth');
const User = require('../models/user');

const router = express.Router();

router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.post('/login',
   body('email')
      .isEmail()
      .withMessage('Please enter a valid email!')
      .normalizeEmail({ gmail_remove_dots: false, all_lowercase: true }),
   body('password',
      'The password must be 5+ characters long, can contain numbers and letters.')
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim()
   , authController.postLogin);

router.post('/signup', [check('email')
   .isEmail()
   .withMessage('Please enter a valid email.')
   .custom((value, { req }) => {
      // if (value === 'test@test.com') {
      //    throw new Error('This email address is forbidden.');
      // }
      // return true;
      return User.findOne({ email: value })
         .then(userDoc => {
            if (userDoc) {
               return Promise.reject('E-Mail exists already, please pick a different one.');
            }
         });
   })
   .normalizeEmail({ gmail_remove_dots: false, all_lowercase: true }),
body('password',
   'please enter a password with only numbers and text and at least 5 characters.').isLength({ min: 5 }).isAlphanumeric(),
body('confirmPassword').trim().custom((value, { req }) => {
   if (value !== req.body.password) {
      throw new Error('Password have to match!');
   }
   return true;
})
   .isAlphanumeric()
   .trim(),
check('nombre').not().isEmpty().isString(),
check('direccion').not().isEmpty().isString()],
   authController.postSignup);

router.post('/logout', authController.postLogout);

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:token', authController.getNewPassword);

router.post('/new-password', authController.postNewPassword);

module.exports = router;