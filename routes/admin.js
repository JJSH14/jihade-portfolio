const express = require('express');
const router = express.Router();
const Project = require('../models/Project');

// Middleware to check the secret number
const checkSecret = (req, res, next) => {
  const secret = req.query.secret;
  if (secret === '196748') {
    req.secret = secret; // Pass the secret to the next middleware
    next();
  } else {
    // Render the error page if the secret is incorrect or missing
    res.status(403).render('error', {
      title: 'Access Denied',
      message: 'You are not allowed to access this page. Please provide the correct secret number.'
    });
  }
};

// Apply the middleware to the admin route
router.get('/', checkSecret, async (req, res) => {
  try {
    const projects = await Project.find().sort('-date');
    res.render('admin', { 
      projects,
      title: 'Admin Dashboard',
      secret: req.secret // Pass the secret to the EJS template
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'Server Error',
      message: 'An unexpected error occurred.'
    });
  }
});

// Add a route for the "Add New Research" button
router.get('/research/new', (req, res) => {
  res.render('research-form', { title: 'Add New Research' });
});

module.exports = router;