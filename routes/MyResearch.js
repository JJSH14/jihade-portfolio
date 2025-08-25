const express = require('express');
const router = express.Router();
const MyResearch = require('../models/MyResearch');
const { getResearchBucket } = require('../config/gridfs');
const mongoose = require('mongoose');
const sharp = require('sharp'); // For image processing (install: npm install sharp)

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

// Helper function to generate PDF thumbnail using PDF.js (browser-based approach)
async function generatePdfThumbnailBuffer(pdfBuffer) {
  try {
    // For server-side PDF processing, you can use pdf-poppler or pdf2pic
    // For now, we'll create a simple placeholder
    // You can enhance this later with actual PDF processing
    
    // Create a simple PDF icon placeholder using Sharp
    const thumbnailBuffer = await sharp({
      create: {
        width: 300,
        height: 400,
        channels: 3,
        background: { r: 240, g: 240, b: 240 }
      }
    })
    .png()
    .toBuffer();
    
    return thumbnailBuffer;
  } catch (err) {
    console.error('PDF thumbnail generation failed:', err);
    return null;
  }
}

// Handle research submission with GridFS
router.post('/', async (req, res) => {
  try {
    const { title, description } = req.body;
    const newResearch = new MyResearch({ title, description });
    const researchBucket = getResearchBucket();
    
    if (!researchBucket) {
      throw new Error('GridFS not initialized');
    }

    // Handle PDF file upload to GridFS
    if (req.files && req.files.researchPdf) {
      const researchPdf = req.files.researchPdf;
      const timestamp = Date.now();
      const pdfFilename = `${timestamp}_${researchPdf.name}`;
      
      // Upload PDF to GridFS
      const pdfUploadStream = researchBucket.openUploadStream(pdfFilename, {
        contentType: researchPdf.mimetype || 'application/pdf',
        metadata: {
          originalName: researchPdf.name,
          researchTitle: title,
          uploadDate: new Date(),
          fileType: 'pdf'
        }
      });

      // Handle PDF upload completion
      const pdfUploadPromise = new Promise((resolve, reject) => {
        pdfUploadStream.on('finish', () => {
          resolve(pdfUploadStream.id);
        });
        
        pdfUploadStream.on('error', (error) => {
          reject(error);
        });
      });

      // Write PDF data to GridFS
      pdfUploadStream.end(researchPdf.data);
      
      // Wait for PDF upload to complete
      const pdfFileId = await pdfUploadPromise;
      
      // Store PDF GridFS file ID in research document
      newResearch.pdfFileId = pdfFileId;
      newResearch.pdfFileName = researchPdf.name;

      // Handle thumbnail
      if (req.files && req.files.customThumbnail) {
        // Custom thumbnail provided
        const customThumbnail = req.files.customThumbnail;
        const thumbnailFilename = `${timestamp}_thumbnail_${customThumbnail.name}`;
        
        // Upload custom thumbnail to GridFS
        const thumbnailUploadStream = researchBucket.openUploadStream(thumbnailFilename, {
          contentType: customThumbnail.mimetype || 'image/jpeg',
          metadata: {
            originalName: customThumbnail.name,
            researchTitle: title,
            uploadDate: new Date(),
            fileType: 'thumbnail'
          }
        });

        const thumbnailUploadPromise = new Promise((resolve, reject) => {
          thumbnailUploadStream.on('finish', () => {
            resolve(thumbnailUploadStream.id);
          });
          
          thumbnailUploadStream.on('error', (error) => {
            reject(error);
          });
        });

        // Write thumbnail data to GridFS
        thumbnailUploadStream.end(customThumbnail.data);
        
        // Wait for thumbnail upload to complete
        const thumbnailFileId = await thumbnailUploadPromise;
        
        newResearch.thumbnailFileId = thumbnailFileId;
        newResearch.thumbnailFileName = customThumbnail.name;
        
      } else {
        // Generate thumbnail from PDF
        try {
          const thumbnailBuffer = await generatePdfThumbnailBuffer(researchPdf.data);
          
          if (thumbnailBuffer) {
            const thumbnailFilename = `${timestamp}_generated_thumbnail.png`;
            
            // Upload generated thumbnail to GridFS
            const thumbnailUploadStream = researchBucket.openUploadStream(thumbnailFilename, {
              contentType: 'image/png',
              metadata: {
                originalName: 'generated_thumbnail.png',
                researchTitle: title,
                uploadDate: new Date(),
                fileType: 'generated_thumbnail'
              }
            });

            const thumbnailUploadPromise = new Promise((resolve, reject) => {
              thumbnailUploadStream.on('finish', () => {
                resolve(thumbnailUploadStream.id);
              });
              
              thumbnailUploadStream.on('error', (error) => {
                reject(error);
              });
            });

            // Write thumbnail buffer to GridFS
            thumbnailUploadStream.end(thumbnailBuffer);
            
            const thumbnailFileId = await thumbnailUploadPromise;
            
            newResearch.thumbnailFileId = thumbnailFileId;
            newResearch.thumbnailFileName = 'generated_thumbnail.png';
          }
        } catch (thumbnailErr) {
          console.error('Thumbnail generation error:', thumbnailErr);
          // Don't fail the entire upload if thumbnail generation fails
        }
      }
    }

    await newResearch.save();
    res.redirect('/myresearch');
  } catch (err) {
    console.error('Error creating research:', err);
    res.status(500).render('error', {
      title: 'Upload Error',
      message: 'Failed to upload research files. Please try again.'
    });
  }
});

// Route to serve PDF files from GridFS with range support
router.get('/pdf/:fileId', async (req, res) => {
  try {
    const researchBucket = getResearchBucket();
    const fileId = new mongoose.Types.ObjectId(req.params.fileId);
    
    // Check if file exists
    const files = await researchBucket.find({ _id: fileId }).toArray();
    
    if (!files || files.length === 0) {
      return res.status(404).render('error', {
        title: 'PDF Not Found',
        message: 'The requested PDF could not be found.'
      });
    }
    
    const file = files[0];
    const fileSize = file.length;
    
    // Parse Range header for PDF streaming support
    const range = req.headers.range;
    
    if (range) {
      // Handle range requests (for PDF viewers)
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': file.contentType || 'application/pdf',
        'Cache-Control': 'public, max-age=3600',
        'Content-Disposition': `inline; filename="${file.metadata?.originalName || 'document.pdf'}"`
      });
      
      const downloadStream = researchBucket.openDownloadStream(fileId, {
        start: start,
        end: end + 1
      });
      
      downloadStream.pipe(res);
      
    } else {
      // Handle full file requests
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': file.contentType || 'application/pdf',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
        'Content-Disposition': `inline; filename="${file.metadata?.originalName || 'document.pdf'}"`
      });
      
      const downloadStream = researchBucket.openDownloadStream(fileId);
      downloadStream.pipe(res);
    }
    
  } catch (err) {
    console.error('Error serving PDF:', err);
    res.status(500).render('error', {
      title: 'Server Error',
      message: 'Failed to load PDF.'
    });
  }
});

// Route to serve thumbnail images from GridFS
router.get('/thumbnail/:fileId', async (req, res) => {
  try {
    const researchBucket = getResearchBucket();
    const fileId = new mongoose.Types.ObjectId(req.params.fileId);
    
    // Check if file exists
    const files = await researchBucket.find({ _id: fileId }).toArray();
    
    if (!files || files.length === 0) {
      return res.status(404).send('Thumbnail not found');
    }
    
    const file = files[0];
    
    // Set appropriate headers for images
    res.set({
      'Content-Type': file.contentType || 'image/jpeg',
      'Content-Length': file.length,
      'Cache-Control': 'public, max-age=86400' // 24 hours cache
    });
    
    // Stream the thumbnail
    const downloadStream = researchBucket.openDownloadStream(fileId);
    downloadStream.pipe(res);
    
  } catch (err) {
    console.error('Error serving thumbnail:', err);
    res.status(500).send('Error loading thumbnail');
  }
});

// Route to delete research files from GridFS
router.delete('/:researchId', async (req, res) => {
  try {
    const research = await MyResearch.findById(req.params.researchId);
    if (!research) {
      return res.status(404).json({ error: 'Research not found' });
    }
    
    const researchBucket = getResearchBucket();
    
    // Delete PDF file
    if (research.pdfFileId) {
      await researchBucket.delete(research.pdfFileId);
    }
    
    // Delete thumbnail file
    if (research.thumbnailFileId) {
      await researchBucket.delete(research.thumbnailFileId);
    }
    
    // Delete research document
    await MyResearch.findByIdAndDelete(req.params.researchId);
    
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error deleting research:', err);
    res.status(500).json({ error: 'Failed to delete research' });
  }
});

module.exports = router;
