 
const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
// Add this at the top of projects.js
const fs = require('fs');
const path = require('path');

// Create upload directory if it doesn't exist
const videoUploadDir = path.join(__dirname, '..', 'public', 'uploads', 'videos');
if (!fs.existsSync(videoUploadDir)) {
  fs.mkdirSync(videoUploadDir, { recursive: true });
}
// Get all projects

// Handle project creation
router.post('/', async (req, res) => {
    try {
      const { title, description, technologies, projectUrl, githubUrl } = req.body;
      
      const newProject = new Project({
        title,
        description,
        technologies: technologies.split(','),
        projectUrl,
        githubUrl
      });
  
      // Check if a video file was uploaded
      if (req.files && req.files.video) {
        const videoFile = req.files.video;
        const uploadPath = `public/uploads/videos/${Date.now()}_${videoFile.name}`;
        
        // Move the uploaded file to the specified path
        await videoFile.mv(uploadPath);
        
        // Store the video path in the database (relative to public folder)
        newProject.videoUrl = uploadPath.replace('public/', '');
      } else if (req.body.videoUrl) {
        // If no file but URL was provided, use that
        newProject.videoUrl = req.body.videoUrl;
      }
  
      await newProject.save();
      res.redirect('/projects');
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
  });

router.get('/', async (req, res) => {
  try {
    const projects = await Project.find().sort('-date');
    res.render('projects', {
      title: 'Projects - Jihade Shtayyeh',
      projects
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Add new project form
router.get('/new', (req, res) => {
  res.render('project-form', {
    title: 'Add New Project'
  });
});

// Handle project creation
router.post('/', async (req, res) => {
  try {
    const { title, description, technologies, projectUrl, githubUrl, videoUrl } = req.body;
    
    const newProject = new Project({
      title,
      description,
      technologies: technologies.split(','),
      projectUrl,
      githubUrl,
      videoUrl
    });

    await newProject.save();
    res.redirect('/projects');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;