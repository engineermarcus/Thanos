import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { search } from './search.js';
import { uploadToTerabox } from './store.js';

const execPromise = promisify(exec);

// Configuration
async function configure(url, title) {
  const config = {
    cookiesUrl: 'https://files.catbox.moe/02cukk.txt',
    cookiesFile: path.join('downloads', 'cookies.txt'),
    url: url,
    outputFile: path.join('downloads', `${title}.mp4`),
    maxRetries: 2,
    retryDelay: 3000
  };
  return config;
}

// Ensure downloads directory exists
async function ensureDownloadsDir() {
  try {
    await fs.mkdir('downloads', { recursive: true });
    console.log('✅ Downloads directory ready');
  } catch (error) {
    console.error('❌ Failed to create downloads directory:', error.message);
    throw error;
  }
}

// Download file from URL using curl/wget
async function downloadFile(url, filepath) {
  console.log(`📥 Downloading cookies from: ${url}`);
  
  try {
    await execPromise(`curl -L -o "${filepath}" "${url}"`);
    console.log('✅ Downloaded using curl');
    return;
  } catch (curlError) {
    console.log('⚠️  curl failed, trying wget...');
    
    try {
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
async function validateCookies(config) {
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
async function downloadVideo(config, attempt = 1) {
  console.log(`\n🎬 Starting download (attempt ${attempt}/${config.maxRetries})...`);
  
  const command = `pip install yt-dlp && yt-dlp --cookies "${config.cookiesFile}" --no-part --merge-output-format mp4 --format "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]" -o "${config.outputFile}" "${config.url}"`;
  
  console.log(`🔐 Using cookies from ${config.cookiesFile}`);
  
  try {
    const { stdout, stderr } = await execPromise(command, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 300000 // 5 minute timeout
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
      return downloadVideo(config, attempt + 1);
    }
    
    throw error;
  }
}

// Main execution
export async function downloader(query) {
  const startTime = Date.now();
  
  try {
    // Ensure downloads directory exists
    await ensureDownloadsDir();
    
    const meta = await search(query);
    const url = meta.url;
    const title = meta.title.replace(/[/\\?%*:|"<>]/g, '-'); // Sanitize filename
    const config = await configure(url, title);
    
    console.log('🚀 YouTube to TeraBox Uploader\n');
    console.log(`🎵 Video: ${title}`);
    console.log(`🔗 URL: ${url}\n`);
    
    // Download cookies file if not present
    if (!await fileExists(config.cookiesFile)) {
      await downloadFile(config.cookiesUrl, config.cookiesFile);
      console.log(`✅ Cookies downloaded to ${config.cookiesFile}`);
    } else {
      console.log(`✅ Using existing ${config.cookiesFile}`);
    }
    
    // Validate cookies
    if (!await validateCookies(config)) {
      throw new Error('Invalid cookies file');
    }
    
    // Download video
    await downloadVideo(config);
    console.log('\n✅ Download complete!');
    
    const fileSize = await getFileSize(config.outputFile);
    console.log(`📦 File size: ${fileSize} MB`);
    
    // Upload to TeraBox
    const uploadResult = await uploadToTerabox(config.outputFile);
    
    // Delete local file after successful upload
    if (uploadResult.success) {
      console.log('\n🗑️  Deleting local file...');
      await fs.unlink(config.outputFile);
      console.log('✅ Local file deleted');
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 All done in ${duration}s!`);
    
    return {
      success: true,
      video: {
        title,
        url,
        size: fileSize
      },
      terabox: uploadResult
    };
    
  } catch (error) {
    console.error('\n❌ Process failed:', error.message);
    
    // Cleanup partial download if it exists
    try {
      const meta = await search(query);
      const title = meta.title.replace(/[/\\?%*:|"<>]/g, '-');
      const outputFile = path.join('downloads', `${title}.mp4`);
      
      if (await fileExists(outputFile)) {
        const size = await getFileSize(outputFile);
        if (parseFloat(size) < 0.1) {
          console.log('🗑️  Cleaning up partial download...');
          await fs.unlink(outputFile);
        }
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    throw error;
  }
}