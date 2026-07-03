require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mime = require('mime-types');
const { 
  S3Client, 
  ListObjectsV2Command, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand
} = require('@aws-sdk/client-s3');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configure Multer for file uploads (stored in memory as buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Configure S3 client for Cloudflare R2
let s3Client = null;
const bucketName = process.env.CLOUDFLARE_BUCKET_NAME || process.env.R2_BUCKET_NAME || 'the-raw-storage';

function getS3Client() {
  if (s3Client) return s3Client;

  const accessKeyId = process.env.CLOUDFLARE_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;
  let endpoint = "";

  if (process.env.CLOUDFLARE_ACCOUNT_ID) {
    endpoint = `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  } else if (process.env.R2_ENDPOINT) {
    endpoint = process.env.R2_ENDPOINT;
  }

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    console.warn("WARNING: Cloudflare R2 credentials are not configured or are still placeholders. Please update your .env file.");
    return null;
  }

  s3Client = new S3Client({
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey
    },
    region: 'auto',
  });

  return s3Client;
}

// Helper to verify or create bucket
async function ensureBucketExists() {
  const client = getS3Client();
  if (!client) return false;

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucketName }));
    console.log(`R2 Bucket "${bucketName}" exists and is accessible.`);
    return true;
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      console.log(`Bucket "${bucketName}" not found. Attempting to create it...`);
      try {
        await client.send(new CreateBucketCommand({ Bucket: bucketName }));
        console.log(`R2 Bucket "${bucketName}" successfully created.`);
        return true;
      } catch (createErr) {
        console.error(`Failed to create bucket "${bucketName}":`, createErr.message);
        return false;
      }
    } else {
      console.error(`Error checking bucket "${bucketName}":`, error.message);
      return false;
    }
  }
}

// Ensure credentials check on startup
setTimeout(() => {
  ensureBucketExists().catch(err => console.error("Error ensuring bucket exists on startup:", err));
}, 1000);

// API Endpoints

// 1. List all files
app.get('/api/files', async (req, res) => {
  const client = getS3Client();
  if (!client) {
    return res.status(500).json({ error: "R2 client is not configured. Please check environment variables." });
  }

  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
    });
    const response = await client.send(command);
    
    const files = (response.Contents || []).map(item => {
      const mimeType = mime.lookup(item.Key) || 'application/octet-stream';
      return {
        key: item.Key,
        size: item.Size,
        lastModified: item.LastModified,
        mimeType
      };
    });

    res.json({ files });
  } catch (error) {
    console.error("List files error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Upload file
app.post('/api/upload', upload.single('file'), async (req, res) => {
  const client = getS3Client();
  if (!client) {
    return res.status(500).json({ error: "R2 client is not configured. Please check environment variables." });
  }

  if (!req.file) {
    return res.status(400).json({ error: "No file provided." });
  }

  // Allow custom path prefix if passed (e.g. folder/subfolder)
  let filePath = req.body.path || '';
  if (filePath && !filePath.endsWith('/')) {
    filePath += '/';
  }
  
  // Clean path to remove leading slash
  if (filePath.startsWith('/')) {
    filePath = filePath.substring(1);
  }

  const key = filePath + (req.body.filename || req.file.originalname);
  const mimeType = mime.lookup(key) || req.file.mimetype || 'application/octet-stream';

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: req.file.buffer,
      ContentType: mimeType,
    });

    await client.send(command);
    res.status(200).json({ 
      success: true, 
      message: "File uploaded successfully",
      file: {
        key,
        size: req.file.size,
        mimeType
      }
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Delete file
app.delete('/api/files/*', async (req, res) => {
  const client = getS3Client();
  if (!client) {
    return res.status(500).json({ error: "R2 client is not configured." });
  }

  const key = req.params[0];
  if (!key) {
    return res.status(400).json({ error: "No file key specified." });
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key
    });
    await client.send(command);
    res.json({ success: true, message: `File ${key} deleted successfully.` });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Raw file sharing endpoint: GET /api/raw/v1/*
app.get('/api/raw/v1/*', async (req, res) => {
  const client = getS3Client();
  if (!client) {
    return res.status(500).send("R2 client is not configured on this server.");
  }

  const key = req.params[0];
  if (!key) {
    return res.status(400).send("File path is missing.");
  }

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    });

    const response = await client.send(command);
    
    // Set response headers based on file metadata
    const mimeType = response.ContentType || mime.lookup(key) || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    
    // Set headers to permit viewing text files directly in browser or download binaries
    if (mimeType.startsWith('text/') || mimeType === 'application/javascript' || mimeType === 'application/json' || mimeType.startsWith('image/')) {
      res.setHeader('Content-Disposition', 'inline');
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="${key.split('/').pop()}"`);
    }

    if (response.ContentLength) {
      res.setHeader('Content-Length', response.ContentLength);
    }

    // Stream the body back to client
    response.Body.pipe(res);
  } catch (error) {
    console.error(`Raw fetch error for key "${key}":`, error);
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      res.status(404).send(`404 Not Found: File "${key}" does not exist in R2 bucket.`);
    } else {
      res.status(500).send(`500 Internal Server Error: ${error.message}`);
    }
  }
});

// Fallback to client routing
app.get('*', (req, res, next) => {
  // If it's an API request or raw request, don't serve index.html
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Raw files endpoint format: http://localhost:${PORT}/api/raw/v1/YourFileName`);
});
