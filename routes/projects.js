const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const { getVideoBucket } = require('../config/gridfs');
const mongoose = require('mongoose');

// Get all projects
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

// Handle project creation with GridFS video storage
router.post('/', async (req, res) => {
  try {
    const { title, description, technologies, projectUrl, githubUrl, videoUrl } = req.body;
    
    const newProject = new Project({
      title,
      description,
      technologies: technologies.split(',').map(tech => tech.trim()),
      projectUrl,
      githubUrl
    });

    // Handle video upload to GridFS
    if (req.files && req.files.video) {
      const videoFile = req.files.video;
      const videoBucket = getVideoBucket();
      
      if (!videoBucket) {
        throw new Error('GridFS not initialized');
      }

      // Create a unique filename
      const filename = `${Date.now()}_${videoFile.name}`;
      
      // Upload to GridFS with proper content type
      const uploadStream = videoBucket.openUploadStream(filename, {
        contentType: videoFile.mimetype || 'video/mp4',
        metadata: {
          originalName: videoFile.name,
          projectTitle: title,
          uploadDate: new Date()
        }
      });

      // Handle upload completion
      const uploadPromise = new Promise((resolve, reject) => {
        uploadStream.on('finish', () => {
          resolve(uploadStream.id);
        });
        
        uploadStream.on('error', (error) => {
          reject(error);
        });
      });

      // Write file data to GridFS
      uploadStream.end(videoFile.data);
      
      // Wait for upload to complete
      const fileId = await uploadPromise;
      
      // Store GridFS file ID in project
      newProject.videoFileId = fileId;
      newProject.videoFileName = videoFile.name;
      
    } else if (videoUrl) {
      // If no file but URL was provided, use that
      newProject.videoUrl = videoUrl;
    }

    await newProject.save();
    res.redirect('/projects');
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(500).render('error', {
      title: 'Upload Error',
      message: 'Failed to upload video. Please try again.'
    });
  }
});

// FIXED: Route to serve video files from GridFS with Range Request support
router.get('/video/:fileId', async (req, res) => {
  try {
    const videoBucket = getVideoBucket();
    const fileId = new mongoose.Types.ObjectId(req.params.fileId);
    
    // Check if file exists
    const files = await videoBucket.find({ _id: fileId }).toArray();
    
    if (!files || files.length === 0) {
      return res.status(404).render('error', {
        title: 'Video Not Found',
        message: 'The requested video could not be found.'
      });
    }
    
    const file = files[0];
    const fileSize = file.length;
    
    // Parse Range header for video seeking support
    const range = req.headers.range;
    
    if (range) {
      // Handle range requests (for video seeking)
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      
      // Set partial content headers
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': file.contentType || 'video/mp4',
        'Cache-Control': 'public, max-age=3600'
      });
      
      // Create download stream with range
      const downloadStream = videoBucket.openDownloadStream(fileId, {
        start: start,
        end: end + 1
      });
      
      downloadStream.pipe(res);
      
      downloadStream.on('error', (error) => {
        console.error('Error streaming video range:', error);
        if (!res.headersSent) {
          res.status(500).end();
        }
      });
      
    } else {
      // Handle full file requests
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': file.contentType || 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600'
      });
      
      // Stream the entire file
      const downloadStream = videoBucket.openDownloadStream(fileId);
      downloadStream.pipe(res);
      
      downloadStream.on('error', (error) => {
        console.error('Error streaming video:', error);
        if (!res.headersSent) {
          res.status(500).end();
        }
      });
    }
    
  } catch (err) {
    console.error('Error serving video:', err);
    if (!res.headersSent) {
      res.status(500).render('error', {
        title: 'Server Error',
        message: 'Failed to load video.'
      });
    }
  }
});

// Route to delete video from GridFS
router.delete('/video/:fileId', async (req, res) => {
  try {
    const videoBucket = getVideoBucket();
    const fileId = new mongoose.Types.ObjectId(req.params.fileId);
    
    await videoBucket.delete(fileId);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error deleting video:', err);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

module.exports = router;
