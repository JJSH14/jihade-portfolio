// config/gridfs.js - GridFS configuration
const mongoose = require('mongoose');
const GridFSBucket = require('mongodb').GridFSBucket;

let videoBucket, researchBucket;

// Initialize GridFS buckets after MongoDB connection
const initGridFS = () => {
  const db = mongoose.connection.db;
  
  // Create separate buckets for videos and research files
  videoBucket = new GridFSBucket(db, {
    bucketName: 'videos'
  });
  
  researchBucket = new GridFSBucket(db, {
    bucketName: 'research'
  });
  
  console.log('GridFS initialized successfully');
};

const getVideoBucket = () => videoBucket;
const getResearchBucket = () => researchBucket;

module.exports = {
  initGridFS,
  getVideoBucket,
  getResearchBucket
};