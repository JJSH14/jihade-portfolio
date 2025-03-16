require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const fileUpload = require('express-fileupload');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const app = express();

// Database connection
connectDB();

// Middleware
app.use(helmet());
app.use(compression());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  limits: { fileSize: process.env.UPLOAD_LIMIT || '50MB' }
}));

// Rate limiting for admin routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later'
});
app.use('/admin*', limiter);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', 'views');

// Routes
app.use('/', require('./routes/index'));
app.use('/projects', require('./routes/projects'));
app.use('/admin', require('./routes/admin'));
app.use('/myresearch', require('./routes/MyResearch'));  // Correctly points to MyResearch.js

// Error handling
app.use((req, res, next) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The requested page could not be found'
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Server Error',
    message: 'An unexpected error occurred'
  });
});

// Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});