import TeraboxUploader from "terabox-upload-tool";

const credentials = {
  ndus: "Y2UXVi3teHuivkKcEkrRLeJv271-oXIR9k-N8AtJ",
  appId: "250528", 
  uploadId: "N1-MTU0LjE1OS4yNTIuMTI0OjE3Njc5NjAyOTg6MjA0OTUwMTIwOTkzMjc5MzEw",
  jsToken: "E0314DFE64922D8677B42441A8F36B5E65BEB3A2AB5CF2561B14D0D57FC3E94B2DE3C15BF6C1CF3ECF50E1888CCFC32AEB540B870B95996CE58E556BB0A9AB1B",
  browserId: "rVzOAgRaVu7Of8sX9VuPvHs_ayu0T4VcIZyCHvGA8Heft5Z_mrNLvsi8Nttu8mivcNajTS3dni1BU6aS"
};

// Upload file to TeraBox
export async function uploadToTerabox(filePath, destinationFolder = '/public-data-base') {
  console.log('\n📤 Uploading to TeraBox...');
  
  const uploader = new TeraboxUploader(credentials);
  
  const progressCallback = (loaded, total) => {
    const percent = ((loaded / total) * 100).toFixed(2);
    console.log(`Upload progress: ${percent}%`);
  };

  try {
    // Upload
    const result = await uploader.uploadFile(filePath, progressCallback, destinationFolder);
    console.log('✅ Upload successful!', result.fileDetails.fs_id);
    
    // Get download link
    const link = await uploader.downloadFile(result.fileDetails.fs_id);
    console.log('📥 Download link:', link);
    
    return {
      success: true,
      fileId: result.fileDetails.fs_id,
      path: result.fileDetails.path,
      size: result.fileDetails.size,
      downloadLink: link
    };
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Get download link for existing file
export async function getDownloadLink(fileId) {
  const uploader = new TeraboxUploader(credentials);
  
  try {
    const link = await uploader.downloadFile(fileId);
    return link;
  } catch (error) {
    console.error('❌ Error getting download link:', error.message);
    throw error;
  }
}