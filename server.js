require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const fileUpload = require('express-fileupload');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const { initGridFS } = require('./config/gridfs');
const app = express();

// Database connection
connectDB();

// Initialize GridFS after database connection
mongoose.connection.once('open', () => {
  console.log('MongoDB Connected');
  initGridFS();
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// File upload middleware with 1GB limit (for GridFS storage)
app.use(fileUpload({
  useTempFiles: false, // Don't use temp files, keep in memory for GridFS
  limits: { 
    fileSize: 1024 * 1024 * 1024 // 1GB in bytes
  },
  abortOnLimit: true,
  responseOnLimit: "File size limit has been reached (1GB max)"
}));

// Rate limiting for admin routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
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
app.use('/myresearch', require('./routes/MyResearch'));

// Error handling
app.use((req, res, next) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The requested page could not be found'
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Handle file upload size errors specifically
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).render('error', {
      title: 'File Too Large',
      message: 'The uploaded file exceeds the 1GB size limit'
    });
  }
  
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
