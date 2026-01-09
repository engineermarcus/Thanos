import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import { search } from './search.js';
import { uploadToCatbox } from './store.js';

const execPromise = promisify(exec);

// Configuration
async function configure(url, title, mediaType) {
  const extension = mediaType === 'mp3' ? 'mp3' : 'mp4';
  const config = {
    cookiesUrl: 'https://files.catbox.moe/02cukk.txt',
    cookiesFile: 'cookies.txt',
    url: url,
    outputFile: `Downloads/${title}.${extension}`,
    mediaType: mediaType,
    maxRetries: 2,
    retryDelay: 3000
  };
  return config;
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
  
  let command;
  if (config.mediaType === 'mp3') {
    // Audio only - extract and convert to mp3
    command = `pip install yt-dlp && yt-dlp --cookies "${config.cookiesFile}" --extract-audio --audio-format mp3 -o "${config.outputFile}" "${config.url}"`;
  } else {
    // Video - use your original working command
    command = `pip install yt-dlp && yt-dlp --cookies "${config.cookiesFile}" --no-part --merge-output-format mp4 --format "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]" -o "${config.outputFile}" "${config.url}"`;
  }
  
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
export async function downloader(query, mediaType = 'mp4', uploadToCloud = true, deleteAfterUpload = true) {
  // Validate mediaType parameter
  if (mediaType !== 'mp3' && mediaType !== 'mp4') {
    throw new Error('Invalid mediaType. Must be either "mp3" or "mp4"');
  }
  
  const startTime = Date.now();
  const meta = await search(query);
  const url = meta.url;
  const title = meta.title;
  const config = await configure(url, title, mediaType);
  
  try {
    console.log('🚀 YouTube Downloader with Catbox Integration\n');
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
    
    // Upload to Catbox if enabled
    let uploadResult = null;
    if (uploadToCloud) {
      uploadResult = await uploadToCatbox(config.outputFile);
      
      if (uploadResult.success) {
        console.log('\n📋 Catbox Upload Results:');
        console.log(`   Download URL: ${uploadResult.url}`);
        console.log('   ✅ Permanent link - never expires!');
        return uploadResult.url;
      }
    }
    
    // Delete local file after upload if enabled
    if (uploadToCloud && deleteAfterUpload && uploadResult?.success) {
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
        localFile: deleteAfterUpload ? null : config.outputFile,
        size: fileSize
      },
      catbox: uploadResult
    };
    
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
    
    throw error;
  }
}