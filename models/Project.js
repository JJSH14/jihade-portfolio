// const mongoose = require('mongoose');

// const projectSchema = new mongoose.Schema({
//   title: { type: String, required: true },
//   description: { type: String, required: true },
//   technologies: [{ type: String }],
//   projectUrl: String,
//   videoUrl: String,
//   githubUrl: String,
//   featured: { type: Boolean, default: false },
//   date: { type: Date, default: Date.now }
// });

// module.exports = mongoose.model('Project', projectSchema);
// models/Project.js - Updated to use GridFS file IDs
const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  technologies: [{
    type: String,
    required: true
  }],
  projectUrl: {
    type: String
  },
  githubUrl: {
    type: String
  },
  // Store GridFS file ID instead of file path
  videoFileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'videos.files' // Reference to GridFS files collection
  },
  videoFileName: {
    type: String // Store original filename for display
  },
  // Keep videoUrl for external URLs (YouTube, etc.)
  videoUrl: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Project', ProjectSchema);
