import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';

// Upload file to Catbox (anonymous - files kept for minimum 1 year)
export async function uploadToCatbox(filePath) {
  try {
    console.log('\n📤 Uploading to Catbox...');
    
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', fs.createReadStream(filePath));
    
    const response = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 300000 // 5 minute timeout
    });
    
    const url = response.data;
    
    if (url.startsWith('https://files.catbox.moe/')) {
      console.log('✅ Upload successful!');
      console.log('🔗 Download link:', url);
      return {
        success: true,
        url: url,
        message: 'File uploaded successfully. Link is permanent.'
      };
    }
    
    throw new Error('Upload failed: ' + url);
    
  } catch (error) {
    console.error('❌ Catbox upload error:', error.message);
    throw error;
  }
}

// Upload file to Catbox with user account (optional - files kept forever)
export async function uploadToCatboxWithAccount(filePath, userHash) {
  try {
    console.log('\n📤 Uploading to Catbox (with account)...');
    
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('userhash', userHash);
    form.append('fileToUpload', fs.createReadStream(filePath));
    
    const response = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 300000
    });
    
    const url = response.data;
    
    if (url.startsWith('https://files.catbox.moe/')) {
      console.log('✅ Upload successful!');
      console.log('🔗 Download link:', url);
      return {
        success: true,
        url: url,
        message: 'File uploaded to your account. Link is permanent.'
      };
    }
    
    throw new Error('Upload failed: ' + url);
    
  } catch (error) {
    console.error('❌ Catbox upload error:', error.message);
    throw error;
  }
}

// Delete file from Catbox (requires user account)
export async function deleteFromCatbox(fileName, userHash) {
  try {
    console.log('\n🗑️  Deleting from Catbox...');
    
    const form = new FormData();
    form.append('reqtype', 'deletefiles');
    form.append('userhash', userHash);
    form.append('files', fileName);
    
    const response = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders()
    });
    
    const result = response.data;
    console.log('✅ Delete response:', result);
    
    return { success: true, message: result };
    
  } catch (error) {
    console.error('❌ Delete error:', error.message);
    throw error;
  }
}

// Upload from URL (Catbox downloads it for you)
export async function uploadURLToCatbox(url) {
  try {
    console.log('\n📤 Uploading URL to Catbox...');
    
    const form = new FormData();
    form.append('reqtype', 'urlupload');
    form.append('url', url);
    
    const response = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders(),
      timeout: 300000
    });
    
    const catboxUrl = response.data;
    
    if (catboxUrl.startsWith('https://files.catbox.moe/')) {
      console.log('✅ URL uploaded successfully!');
      console.log('🔗 Download link:', catboxUrl);
      return {
        success: true,
        url: catboxUrl
      };
    }
    
    throw new Error('Upload failed: ' + catboxUrl);
    
  } catch (error) {
    console.error('❌ URL upload error:', error.message);
    throw error;
  }
}