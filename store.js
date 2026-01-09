import TeraboxUploader from "terabox-upload-tool";

const credentials = {
  ndus: "Y2UXVi3teHuivkKcEkrRLeJv271-oXIR9k-N8AtJ",
  appId: "250528", 
  uploadId: "N1-MTU0LjE1OS4yNTIuMTI0OjE3Njc5NjAyOTg6MjA0OTUwMTIwOTkzMjc5MzEw",
  jsToken: "E0314DFE64922D8677B42441A8F36B5E65BEB3A2AB5CF2561B14D0D57FC3E94B2DE3C15BF6C1CF3ECF50E1888CCFC32AEB540B870B95996CE58E556BB0A9AB1B",
  browserId: "rVzOAgRaVu7Of8sX9VuPvHs_ayu0T4VcIZyCHvGA8Heft5Z_mrNLvsi8Nttu8mivcNajTS3dni1BU6aS"
};

const uploader = new TeraboxUploader(credentials);

// Progress callback function
const progressCallback = (loaded, total) => {
  const percent = ((loaded / total) * 100).toFixed(2);
  console.log(`Upload progress: ${percent}% (${loaded}/${total} bytes)`);
};

try {
  // Upload file with progress callback
  const result = await uploader.uploadFile(
    './sza.mp4',           // file path
    progressCallback,      // progress callback (not a boolean!)
    '/my-data-base'        // destination folder
  );
  
  console.log('Upload successful!');
  console.log('Result:', result);
} catch (error) {
  console.error('Upload failed:', error.message);
}