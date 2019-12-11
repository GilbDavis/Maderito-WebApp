require('dotenv').config();
const Product = require('../models/product');
const fileHelper = require('../util/file');
const moment = require('moment');
const AWS = require('aws-sdk');

const { validationResult } = require('express-validator/check');

exports.getAddProduct = (req, res, next) => {
  if (!req.session.isLoggedIn) {
    return res.redirect('/login');
  }
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    isAdmin: req.user.isAdmin,
    hasError: false,
    errorMessage: null,
    validationErrors: []
  });
};

exports.postAddProduct = async (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const fecha = req.body.fecha;
  const description = req.body.description;
  if (!image) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      isAdmin: req.user.isAdmin,
      product: {
        title: title,
        fecha: fecha,
        description: description
      },
      errorMessage: 'Attached file is not an image.',
      validationErrors: []
    });
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      isAdmin: req.user.isAdmin,
      product: {
        title: title,
        fecha: fecha,
        imageUrl: image,
        description: description
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }
  const s3FileURL = process.env.AWS_Uploaded_File_URL_LINK;

  let s3bucket = new AWS.S3({
    accessKeyId: process.env.AWSAccessKeyId,
    secretAccessKey: process.env.AWSSecretKey,
    region: process.env.AWS_REGION
  });

  //Where you want to store your file
  const keyName = new Date().getTime() + image.originalname;
  var params = {
    Bucket: 'maderito-bucket',
    Key: keyName,
    Body: image.buffer,
    ContentType: image.mimetype,
    ACL: "public-read"
  };

  s3bucket.upload(params, function (err, data) {
    if (err) {
      return res.status(422).render('admin/edit-product', {
        pageTitle: 'Add Product',
        path: '/admin/add-product',
        editing: false,
        hasError: true,
        isAdmin: req.user.isAdmin,
        product: {
          title: title,
          fecha: fecha,
          description: description
        },
        errorMessage: 'Attached file is not an image.',
        validationErrors: []
      });
    }
    const product = new Product({
      title: title,
      fecha: fecha,
      description: description,
      imageUrl: s3FileURL + keyName,
      userId: req.user
    });
    product
      .save()
      .then(result => {
        // console.log(result);
        console.log('Created Product');
        res.redirect('/admin/products');
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
  });

};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        isAdmin: req.user.isAdmin,
        hasError: false,
        errorMessage: null,
        validationErrors: []
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  let s3bucket = new AWS.S3({
    accessKeyId: process.env.AWSAccessKeyId,
    secretAccessKey: process.env.AWSSecretKey,
    region: process.env.AWS_REGION
  });
  const s3FileURL = process.env.AWS_Uploaded_File_URL_LINK;
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedFecha = req.body.fecha;
  const image = req.file;
  const updatedDesc = req.body.description;
  const updatedEstado = req.user.isAdmin ? req.body.selectEstado : "En proceso";

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      isAdmin: req.user.isAdmin,
      hasError: true,
      product: {
        title: updatedTitle,
        fecha: updatedFecha,
        description: updatedDesc,
        _id: prodId
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }
  Product.findById(prodId)
    .then(product => {
      if (!req.user.isAdmin) {
        if (product.userId.toString() !== req.user._id.toString()) {
          return res.redirect('/');
        }
      }
      product.title = updatedTitle;
      product.description = updatedDesc;
      product.fecha = updatedFecha;
      product.estado = updatedEstado;
      if (image) {
        const imagePath = product.imageUrl.slice(51);
        s3bucket.deleteObject({
          Bucket: 'maderito-bucket',
          Key: imagePath
        }, (err) => {
          if (err) {
            throw err;
          }
        });
        const keyName = new Date().getTime() + image.originalname;
        var params = {
          Bucket: 'maderito-bucket',
          Key: keyName,
          Body: image.buffer,
          ContentType: image.mimetype,
          ACL: "public-read"
        };
        product.imageUrl = s3FileURL + keyName;
        s3bucket.upload(params, (err) => {
          if (err) {
            throw err;
          }
        });
      }
      return product.save()
        .then(() => {
          console.log('UPDATED PRODUCT!');
          res.redirect('/admin/products');
        });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProducts = async (req, res, next) => {
  if (req.user.isAdmin) {
    Product.find().sort({ fecha: "asc" })
      // .select('title price -_id')
      // .populate('userId', 'name')
      .then(products => {
        res.render('admin/Agenda', {
          prods: products,
          moment: moment,
          isAdmin: req.user.isAdmin,
          pageTitle: 'Citas Castro - Mi Agenda',
          path: '/admin/agenda'
        });
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
  } else if (!req.user.isAdmin) {
    Product.find({ userId: req.user._id })
      // .select('title price -_id')
      // .populate('userId', 'name')
      .then(products => {
        res.render('admin/products', {
          prods: products,
          moment: moment,
          isAdmin: req.user.isAdmin,
          pageTitle: 'Admin Products',
          path: '/admin/products'
        });
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
  }
};

exports.deleteProduct = (req, res, next) => {
  let s3bucket = new AWS.S3({
    accessKeyId: process.env.AWSAccessKeyId,
    secretAccessKey: process.env.AWSSecretKey,
    region: process.env.AWS_REGION
  });
  const prodId = req.body.productId;
  if (req.user.isAdmin) {
    Product.findById(prodId)
      .then(product => {
        if (!product) {
          return next(new Error('Product not found!'));
        }
        const keyName = product.imageUrl.slice(51);
        s3bucket.deleteObject({
          Bucket: 'maderito-bucket',
          Key: keyName
        }, (err) => {
          if (err) {
            throw err;
          }
        });
        return Product.deleteOne({ _id: prodId });
      })
      .then(() => {
        console.log("Producto eliminado!");
        res.redirect("/admin/products");
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
  } else {
    Product.findById(prodId)
      .then(product => {
        if (!product) {
          return next(new Error('Product not found!'));
        }
        const keyName = product.imageUrl.slice(51);
        s3bucket.deleteObject({
          Bucket: 'maderito-bucket',
          Key: keyName
        }, (err) => {
          if (err) {
            throw err;
          }
        });
        return Product.deleteOne({ _id: prodId, userId: req.user._id });
      })
      .then(() => {
        console.log("Producto eliminado!");
        res.redirect("/admin/products");
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
  }
};