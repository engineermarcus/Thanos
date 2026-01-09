import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execPromise = promisify(exec);
const youtube = express.Router();

// Configuration
const config = {
  cookiesUrl: 'https://files.catbox.moe/02cukk.txt',
  cookiesFile: path.join(__dirname, 'cookies.txt'),
  downloadsDir: path.join(__dirname, 'downloads'),
  maxRetries: 2,
  retryDelay: 3000
};

// Ensure downloads directory exists
await fs.mkdir(config.downloadsDir, { recursive: true });

// Helper functions
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getFileSize(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return (stats.size / (1024 * 1024)).toFixed(2);
  } catch {
    return 0;
  }
}

async function downloadCookies() {
  if (await fileExists(config.cookiesFile)) {
    return true;
  }
  
  try {
    await execPromise(`curl -L -o "${config.cookiesFile}" "${config.cookiesUrl}"`);
    return true;
  } catch (error) {
    throw new Error('Failed to download cookies file');
  }
}

async function validateCookies() {
  try {
    const content = await fs.readFile(config.cookiesFile, 'utf-8');
    const lines = content.split('\n').filter(line => 
      line.trim() && !line.startsWith('#')
    );
    return lines.length > 0;
  } catch {
    return false;
  }
}

async function downloadVideo(url, outputPath, attempt = 1) {
  const command = `yt-dlp --cookies "${config.cookiesFile}" --no-part --merge-output-format mp4 --format "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]" -o "${outputPath}" "${url}"`;
  
  try {
    const { stdout } = await execPromise(command, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 180000 // 3 minute timeout
    });
    
    return { success: true, output: stdout };
  } catch (error) {
    if (attempt < config.maxRetries) {
      await new Promise(resolve => setTimeout(resolve, config.retryDelay));
      return downloadVideo(url, outputPath, attempt + 1);
    }
    throw error;
  }
}

async function getVideoInfo(filePath) {
  try {
    const { stdout } = await execPromise(
      `ffprobe -v quiet -show_entries format=duration,size -show_entries stream=width,height,codec_name,codec_type -of json "${filePath}"`
    );
    
    const info = JSON.parse(stdout);
    const video = info.streams?.find(s => s.codec_type === 'video');
    const audio = info.streams?.find(s => s.codec_type === 'audio');
    
    return {
      duration: info.format?.duration ? Math.round(info.format.duration) : null,
      size: info.format?.size ? (info.format.size / (1024 * 1024)).toFixed(2) : null,
      resolution: video ? `${video.width}x${video.height}` : null,
      videoCodec: video?.codec_name || null,
      audioCodec: audio?.codec_name || null
    };
  } catch {
    return null;
  }
}

// API Routes

// POST /api/download - Download a video
youtube.post('/download', async (req, res) => {
  try {
    const { url, filename } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        error: 'Missing required field: url' 
      });
    }
    
    // Validate URL
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      return res.status(400).json({ 
        error: 'Only YouTube URLs are supported' 
      });
    }
    
    // Generate filename
    const videoId = url.match(/(?:shorts\/|v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)?.[1];
    const outputFilename = filename || `video_${videoId}_${Date.now()}.mp4`;
    const outputPath = path.join(config.downloadsDir, outputFilename);
    
    // Check if already downloaded
    if (await fileExists(outputPath)) {
      const fileSize = await getFileSize(outputPath);
      return res.json({
        success: true,
        message: 'Video already exists',
        filename: outputFilename,
        size: `${fileSize} MB`,
        path: `/api/video/${outputFilename}`
      });
    }
    
    // Ensure cookies are available
    await downloadCookies();
    
    if (!await validateCookies()) {
      return res.status(500).json({ 
        error: 'Invalid cookies file' 
      });
    }
    
    // Download video
    await downloadVideo(url, outputPath);
    
    // Get video info
    const videoInfo = await getVideoInfo(outputPath);
    
    res.json({
      success: true,
      message: 'Video downloaded successfully',
      filename: outputFilename,
      videoId: videoId,
      info: videoInfo,
      path: `/api/video/${outputFilename}`
    });
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      error: 'Download failed', 
      details: error.message 
    });
  }
});

// GET /api/video/:filename - Stream or download video
youtube.get('/video/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(config.downloadsDir, filename);
    
    if (!await fileExists(filePath)) {
      return res.status(404).json({ 
        error: 'Video not found' 
      });
    }
    
    const stat = await fs.stat(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    if (range) {
      // Stream video with range support
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      
      const readStream = (await import('fs')).createReadStream(filePath, { start, end });
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      });
      
      readStream.pipe(res);
    } else {
      // Download entire video
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`
      });
      
      const readStream = (await import('fs')).createReadStream(filePath);
      readStream.pipe(res);
    }
    
  } catch (error) {
    console.error('Streaming error:', error);
    res.status(500).json({ 
      error: 'Failed to stream video' 
    });
  }
});

// GET /api/videos - List all downloaded videos
youtube.get('/videos', async (req, res) => {
  try {
    const files = await fs.readdir(config.downloadsDir);
    const videoFiles = files.filter(f => f.endsWith('.mp4'));
    
    const videos = await Promise.all(
      videoFiles.map(async (filename) => {
        const filePath = path.join(config.downloadsDir, filename);
        const size = await getFileSize(filePath);
        const stats = await fs.stat(filePath);
        
        return {
          filename,
          size: `${size} MB`,
          created: stats.birthtime,
          path: `/api/video/${filename}`
        };
      })
    );
    
    res.json({
      success: true,
      count: videos.length,
      videos
    });
    
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ 
      error: 'Failed to list videos' 
    });
  }
});

// DELETE /api/video/:filename - Delete a video
youtube.delete('/video/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(config.downloadsDir, filename);
    
    if (!await fileExists(filePath)) {
      return res.status(404).json({ 
        error: 'Video not found' 
      });
    }
    
    await fs.unlink(filePath);
    
    res.json({
      success: true,
      message: 'Video deleted successfully',
      filename
    });
    
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      error: 'Failed to delete video' 
    });
  }
});

// GET /api/info - Get video info without downloading
youtube.post('/info', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        error: 'Missing required field: url' 
      });
    }
    
    // Ensure cookies are available
    await downloadCookies();
    
    const { stdout } = await execPromise(
      `yt-dlp --cookies "${config.cookiesFile}" --dump-json "${url}"`
    );
    
    const info = JSON.parse(stdout);
    
    res.json({
      success: true,
      title: info.title,
      duration: info.duration,
      uploader: info.uploader,
      views: info.view_count,
      thumbnail: info.thumbnail,
      formats: info.formats?.length || 0
    });
    
  } catch (error) {
    console.error('Info error:', error);
    res.status(500).json({ 
      error: 'Failed to get video info' 
    });
  }
});

export default youtube;