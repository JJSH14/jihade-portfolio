const mongoose = require('mongoose');

const myResearchSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  thumbnailUrl: {  type: String},
  researchPdf: { type: String ,required:true }, // Stores the file path or URL of the uploaded PDF
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MyResearch', myResearchSchema);