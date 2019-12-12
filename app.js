const path = require('path');
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');

const errorController = require('./controllers/error');
const User = require('./models/user');
const shopController = require('./controllers/shop');
const isAuth = require('./middleware/is-auth');

const app = express();
const store = new MongoDBStore({
  uri: process.env.MONGODB_URI,
  collection: 'sessions'
});
app.use(helmet());
app.use(compression());
app.use(cors());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const csrfProtection = csrf();
// const fileStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, './images');
//   },
//   filename: (req, file, cb) => {
//     cb(null, new Date().getTime() + '-' + file.originalname);
//   }
// });

// const fileFilter = (req, file, cb) => {
//   if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
//     cb(null, true);
//   } else {
//     cb(null, false);
//   }
// };

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

app.use(bodyParser.urlencoded({ extended: true }));
// app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('imageUrl'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(
  session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store
  })
);

app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  next();
});

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch(err => {
      next(new Error(err));
    });
});

app.post('/create-order', isAuth, shopController.postOrder);

app.use(csrfProtection);
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get('/500', errorController.get500);
app.use(errorController.get404);

app.use((err, req, res) => {
  res.status(500).render('500', {
    pageTitle: 'Error',
    path: '/500',
    isAuthenticated: req.session.isLoggedIn
  });
});

mongoose
  .connect(process.env.MONGODB_URI, { useNewUrlParser: true })
  .then(() => {
    app.listen(process.env.PORT || 3000);
  })
  .catch(err => {
    console.log(err);
  });
