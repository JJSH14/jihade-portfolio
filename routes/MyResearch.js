const express = require('express');
const router = express.Router();
const MyResearch = require('../models/MyResearch');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Create upload directories if they don't exist
const researchUploadDir = path.join(__dirname, '..', 'public', 'uploads', 'research');
const thumbnailsDir = path.join(__dirname, '..', 'public', 'uploads', 'thumbnails');

if (!fs.existsSync(researchUploadDir)) {
  fs.mkdirSync(researchUploadDir, { recursive: true });
}

if (!fs.existsSync(thumbnailsDir)) {
  fs.mkdirSync(thumbnailsDir, { recursive: true });
}

// Helper function to generate PDF thumbnail (using pdftoppm if available)
async function generatePdfThumbnail(pdfPath, outputPath) {
  try {
    // Check if pdftoppm is available (comes with poppler-utils)
    await execAsync('pdftoppm -v');
    
    // Generate thumbnail from first page of PDF
    const command = `pdftoppm -jpeg -f 1 -l 1 -scale-to 300 "${pdfPath}" "${outputPath}"`;
    await execAsync(command);
    
    // pdftoppm adds suffix, so we need to find the generated file
    const files = fs.readdirSync(path.dirname(outputPath));
    const thumbnailFile = files.find(file => 
      file.startsWith(path.basename(outputPath)) && file.endsWith('.jpg')
    );
    
    if (thumbnailFile) {
      return path.join(path.dirname(outputPath), thumbnailFile).replace('public/', '');
    }
    
    return null;
  } catch (err) {
    console.error('PDF thumbnail generation failed:', err);
    return null;
  }
}

// Get all research entries
router.get('/', async (req, res) => {
  try {
    const researchEntries = await MyResearch.find().sort('-date');
    res.render('research', {
      title: 'Research Collection',
      researchEntries
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Render new research form
router.get('/new', (req, res) => {
  res.render('research-form', {
    title: 'Add New Research'
  });
});

// Handle research submission
router.post('/', async (req, res) => {
  try {
    const { title, description } = req.body;
    const newResearch = new MyResearch({ title, description });
    const timestamp = Date.now();

    // Check if a PDF file was uploaded
    if (req.files && req.files.researchPdf) {
      const researchPdf = req.files.researchPdf;
      const uploadPath = `public/uploads/research/${timestamp}_${researchPdf.name}`;
      
      // Move the uploaded file to the specified path
      await researchPdf.mv(uploadPath);
      
      // Store the file path in the database (relative to public folder)
      newResearch.researchPdf = uploadPath.replace('public/', '');
      
      // Check if a custom thumbnail was uploaded
      if (req.files && req.files.customThumbnail) {
        const customThumbnail = req.files.customThumbnail;
        const thumbnailPath = `public/uploads/thumbnails/${timestamp}_${customThumbnail.name}`;
        
        // Move the custom thumbnail to the thumbnails directory
        await customThumbnail.mv(thumbnailPath);
        
        // Store the thumbnail path in the database
        newResearch.thumbnailUrl = thumbnailPath.replace('public/', '');
      } else {
        // No custom thumbnail provided, generate one from the PDF
        try {
          const thumbnailBasePath = `public/uploads/thumbnails/${timestamp}_thumbnail`;
          const thumbnailPath = await generatePdfThumbnail(uploadPath, thumbnailBasePath);
          
          if (thumbnailPath) {
            newResearch.thumbnailUrl = thumbnailPath;
          } else {
            // Fallback: Set a default thumbnail or placeholder
            newResearch.thumbnailUrl = 'images/pdf-placeholder.png';
          }
        } catch (thumbnailErr) {
          console.error('Thumbnail generation error:', thumbnailErr);
          // Set default thumbnail
          newResearch.thumbnailUrl = 'images/pdf-placeholder.png';
        }
      }
    }

    await newResearch.save();
    res.redirect('/myresearch');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;