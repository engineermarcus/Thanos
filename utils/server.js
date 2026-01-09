import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

const media = express.Router();
const URL = "https://psychic-yodel-q747jxrwpwgq2x79r-9000.app.github.dev";
const DOWNLOADS_DIR = './downloads';
const EXPIRY_TIME = 2 * 60 * 1000; // 2 minutes

// Store file metadata with expiry times
const fileRegistry = new Map();

// Ensure downloads directory exists
async function initDownloadsDir() {
  try {
    await fs.mkdir(DOWNLOADS_DIR, { recursive: true });
    console.log('✅ Downloads directory ready');
  } catch (error) {
    console.error('❌ Failed to create downloads directory:', error.message);
  }
}

// Generate unique token for file access
function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

// Create download link for a file
export async function createDownloadLink(filePath, serverUrl = URL) {
  try {
    const fileName = path.basename(filePath);
    const token = generateToken();
    const expiryTime = Date.now() + EXPIRY_TIME;
    
    // Move file to downloads directory
    const destPath = path.join(DOWNLOADS_DIR, `${token}_${fileName}`);
    await fs.copyFile(filePath, destPath);
    
    // Register file with expiry
    fileRegistry.set(token, {
      fileName: fileName,
      filePath: destPath,
      expiryTime: expiryTime,
      createdAt: Date.now()
    });
    
    // Schedule deletion after 2 minutes
    setTimeout(async () => {
      await deleteExpiredFile(token);
    }, EXPIRY_TIME);
    
    const downloadUrl = `${serverUrl}/download/${token}`;
    
    console.log(`\n✅ Download link created:`);
    console.log(`   URL: ${downloadUrl}`);
    console.log(`   Expires in: 2 minutes`);
    
    return {
      url: downloadUrl,
      token: token,
      expiresAt: new Date(expiryTime).toISOString(),
      expiresIn: '2 minutes'
    };
    
  } catch (error) {
    console.error('❌ Failed to create download link:', error.message);
    throw error;
  }
}

// Delete expired file
async function deleteExpiredFile(token) {
  const fileData = fileRegistry.get(token);
  
  if (fileData) {
    try {
      await fs.unlink(fileData.filePath);
      fileRegistry.delete(token);
      console.log(`🗑️  Deleted expired file: ${fileData.fileName}`);
    } catch (error) {
      console.error(`⚠️  Failed to delete ${fileData.fileName}:`, error.message);
    }
  }
}

// Clean up all expired files (runs periodically)
async function cleanupExpiredFiles() {
  const now = Date.now();
  
  for (const [token, fileData] of fileRegistry.entries()) {
    if (now > fileData.expiryTime) {
      await deleteExpiredFile(token);
    }
  }
}

// Download endpoint
media.get('/download/:token', async (req, res) => {
  const { token } = req.params;
  const fileData = fileRegistry.get(token);
  
  if (!fileData) {
    return res.status(404).json({
      error: 'File not found or link expired',
      message: 'This download link is no longer valid'
    });
  }
  
  const now = Date.now();
  
  if (now > fileData.expiryTime) {
    await deleteExpiredFile(token);
    return res.status(410).json({
      error: 'Link expired',
      message: 'This download link has expired (2 minute limit)'
    });
  }
  
  try {
    console.log(`📥 Serving: ${fileData.fileName}`);
    res.download(fileData.filePath, fileData.fileName);
  } catch (error) {
    console.error('❌ Download error:', error.message);
    res.status(500).json({ error: 'Download failed' });
  }
});

// Health check endpoint
media.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    activeFiles: fileRegistry.size,
    downloadsDir: DOWNLOADS_DIR
  });
});


export default media;