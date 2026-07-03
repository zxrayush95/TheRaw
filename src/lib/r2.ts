import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || "",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "the-raw";

export async function listFiles(prefix = "") {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
  });
  const response = await r2Client.send(command);
  return response.Contents || [];
}

export async function getFile(key: string) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  const response = await r2Client.send(command);
  return response;
}

export async function uploadFile(key: string, body: Buffer, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  return await r2Client.send(command);
}

export async function deleteFile(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  return await r2Client.send(command);
}

// Create a new repository by initializing it with a default README.md
export async function createRepository(repoName: string) {
  const cleanRepoName = repoName.replace(/[\/\s]/g, "-").toLowerCase();
  const readmeKey = `${cleanRepoName}/README.md`;
  
  const content = `# ${cleanRepoName}\n\nWelcome to your new repository! Open this repo to upload or create files.\n`;
  const buffer = Buffer.from(content);
  
  return await uploadFile(readmeKey, buffer, "text/markdown; charset=utf-8");
}

// Delete an entire repository (deletes all objects matching the prefix)
export async function deleteRepository(repoName: string) {
  const prefix = `${repoName}/`;
  const contents = await listFiles(prefix);
  if (contents.length === 0) return;

  const deleteParams = {
    Bucket: BUCKET_NAME,
    Delete: {
      Objects: contents
        .map((item) => ({ Key: item.Key }))
        .filter((obj): obj is { Key: string } => typeof obj.Key === "string" && obj.Key !== ""),
      Quiet: true,
    },
  };

  const command = new DeleteObjectsCommand(deleteParams);
  return await r2Client.send(command);
}
