const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const MyResearch = require('../models/MyResearch'); // Add this line to import the MyResearch model

router.get('/', async (req, res) => {
  try {
    const projects = await Project.find().sort('-date').limit(3); // Fetch projects
    const researchEntries = await MyResearch.find().sort('-date'); // Fetch research entries

    res.render('index', { 
      title: 'Jihade Shtayyeh - Portfolio',
      projects,
      researchEntries // Pass research entries to the view
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
