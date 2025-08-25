// models/MyResearch.js - Updated for GridFS storage
const mongoose = require('mongoose');

const myResearchSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  // GridFS file IDs instead of file paths
  pdfFileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'research.files', // Reference to GridFS files collection
    required: true
  },
  pdfFileName: {
    type: String, // Store original filename for display
    required: true
  },
  thumbnailFileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'research.files' // Reference to GridFS files collection for thumbnails
  },
  thumbnailFileName: {
    type: String // Store original thumbnail filename
  },
  // Keep legacy fields for backward compatibility
  researchPdf: { 
    type: String // Legacy field for old file-based PDFs
  }, 
  thumbnailUrl: {  
    type: String // Legacy field for old thumbnail paths
  },
  date: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('MyResearch', myResearchSchema);
