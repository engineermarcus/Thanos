import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execPromise = promisify(exec);

// Configuration
const config = {
  cookiesUrl: 'https://files.catbox.moe/02cukk.txt',
  cookiesFile: 'cookies.txt',
  url: 'https://youtube.com/shorts/qYrG2qRyJR0?si=rR2-scgF453qLbbR',
  outputFile: 'mrbean.mp4',
  maxRetries: 2,
  retryDelay: 3000
};

// Download file from URL using curl/wget
async function downloadFile(url, filepath) {
  console.log(`📥 Downloading cookies from: ${url}`);
  
  try {
    // Try curl first
    await execPromise(`curl -L -o "${filepath}" "${url}"`);
    console.log('✅ Downloaded using curl');
    return;
  } catch (curlError) {
    console.log('⚠️  curl failed, trying wget...');
    
    try {
      // Fallback to wget
      await execPromise(`wget -O "${filepath}" "${url}"`);
      console.log('✅ Downloaded using wget');
      return;
    } catch (wgetError) {
      throw new Error('Failed to download cookies file. Install curl or wget.');
    }
  }
}

// Helper function to check if file exists
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Helper function to get file size
async function getFileSize(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return (stats.size / (1024 * 1024)).toFixed(2);
  } catch {
    return 0;
  }
}

// Validate cookies file
async function validateCookies() {
  try {
    const content = await fs.readFile(config.cookiesFile, 'utf-8');
    const lines = content.split('\n').filter(line => 
      line.trim() && !line.startsWith('#')
    );
    
    if (lines.length === 0) {
      throw new Error('Cookies file is empty or invalid');
    }
    
    console.log(`✅ Cookies file validated (${lines.length} entries)`);
    return true;
  } catch (error) {
    console.error('❌ Cookies validation failed:', error.message);
    return false;
  }
}

// Download video with cookies
async function downloadVideo(attempt = 1) {
  console.log(`\n🎬 Starting download (attempt ${attempt}/${config.maxRetries})...`);
  
  // Build command with cookies file
  const command = `yt-dlp --cookies "${config.cookiesFile}" --no-part --merge-output-format mp4 --format "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]" -o "${config.outputFile}" "${config.url}"`;
  
  console.log(`🔐 Using cookies from ${config.cookiesFile}`);
  
  try {
    const { stdout, stderr } = await execPromise(command, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120000 // 2 minute timeout
    });
    
    if (stdout) console.log(stdout);
    if (stderr && stderr.includes('ERROR')) {
      console.error('stderr:', stderr);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Download attempt ${attempt} failed`);
    
    if (error.message.includes('Sign in to confirm')) {
      console.log('\n💡 The cookies may have expired. Try:');
      console.log('1. Export fresh cookies from your browser');
      console.log('2. Make sure you\'re logged into YouTube');
    }
    
    if (attempt < config.maxRetries) {
      console.log(`⏳ Retrying in ${config.retryDelay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, config.retryDelay));
      return downloadVideo(attempt + 1);
    }
    
    throw error;
  }
}

// Verify video integrity
async function verifyVideo() {
  console.log('\n🔍 Verifying video...');
  
  if (!await fileExists(config.outputFile)) {
    throw new Error('Output file not found');
  }
  
  const fileSize = await getFileSize(config.outputFile);
  console.log(`📦 File size: ${fileSize} MB`);
  
  try {
    const { stderr } = await execPromise(
      `ffmpeg -v error -i "${config.outputFile}" -f null - 2>&1`
    );
    
    if (stderr && stderr.trim()) {
      console.log('⚠️  Verification warnings:', stderr);
      return false;
    }
    
    // Get video info
    try {
      const { stdout: probeOutput } = await execPromise(
        `ffprobe -v quiet -show_entries format=duration -show_entries stream=width,height,codec_name -of json "${config.outputFile}"`
      );
      
      const info = JSON.parse(probeOutput);
      console.log('✅ Video is valid!');
      
      if (info.streams && info.streams.length > 0) {
        // Find video stream
        const video = info.streams.find(s => s.codec_type === 'video');
        const audio = info.streams.find(s => s.codec_type === 'audio');
        
        if (video) {
          console.log(`📹 Resolution: ${video.width}x${video.height}`);
          console.log(`🎞️  Video Codec: ${video.codec_name}`);
        }
        
        if (audio) {
          console.log(`🔊 Audio Codec: ${audio.codec_name}`);
        }
      }
      
      if (info.format && info.format.duration) {
        console.log(`⏱️  Duration: ${Math.round(info.format.duration)}s`);
      }
    } catch {
      console.log('⚠️  Could not extract video metadata');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  const startTime = Date.now();
  
  try {
    console.log('🚀 YouTube Downloader with Remote Cookies\n');
    
    // Check if output file already exists
    if (await fileExists(config.outputFile)) {
      console.log('⚠️  Output file already exists!');
      const size = await getFileSize(config.outputFile);
      console.log(`📦 Existing file size: ${size} MB`);
      
      await verifyVideo();
      return;
    }
    
    // Download cookies file if not present
    if (!await fileExists(config.cookiesFile)) {
      await downloadFile(config.cookiesUrl, config.cookiesFile);
      console.log(`✅ Cookies downloaded to ${config.cookiesFile}`);
    } else {
      console.log(`✅ Using existing ${config.cookiesFile}`);
    }
    
    // Validate cookies
    if (!await validateCookies()) {
      throw new Error('Invalid cookies file');
    }
    
    // Download video
    await downloadVideo();
    
    console.log('\n✅ Download complete!');
    
    // Verify
    await verifyVideo();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 All done in ${duration}s!`);
    console.log(`📁 Saved as: ${config.outputFile}`);
    
  } catch (error) {
    console.error('\n❌ Process failed:', error.message);
    
    // Cleanup partial download
    if (await fileExists(config.outputFile)) {
      const size = await getFileSize(config.outputFile);
      if (size < 0.1) {
        console.log('🗑️  Cleaning up partial download...');
        await fs.unlink(config.outputFile);
      }
    }
    
    process.exit(1);
  }
}

main();