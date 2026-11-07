const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const cloudinary = require('cloudinary').v2;

const UPLOAD_ROOT = path.resolve(__dirname, '../uploads');
const REQUEST_TYPES = ['leave', 'od', 'bonafide', 'complaint'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 3;
const MIME_TYPES = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  png: 'image/png',
};

const isCloudinaryConfigured = () => (
  Boolean(process.env.CLOUDINARY_CLOUD_NAME?.trim())
  && Boolean(process.env.CLOUDINARY_API_KEY?.trim())
  && Boolean(process.env.CLOUDINARY_API_SECRET?.trim())
);

const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
};

const detectMimeType = (buffer) => {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    return MIME_TYPES.pdf;
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return MIME_TYPES.jpg;
  }
  if (
    buffer.length >= 8
    && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return MIME_TYPES.png;
  }
  return null;
};

const sanitizeOriginalName = (value) => {
  const name = String(value || '')
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .trim()
    .slice(0, 120);
  return name || 'attachment';
};

const cloudinaryUpload = (file, folder, publicId) => new Promise((resolve, reject) => {
  configureCloudinary();
  const uploadStream = cloudinary.uploader.upload_stream(
    {
      folder,
      public_id: publicId,
      resource_type: 'raw',
      type: 'authenticated',
      access_mode: 'authenticated',
      overwrite: false,
      use_filename: false,
      unique_filename: false,
    },
    (error, result) => {
      if (error) {
        reject(error);
      } else if (!result?.public_id) {
        reject(new Error('Cloudinary did not return an attachment identifier'));
      } else {
        resolve(result.public_id);
      }
    }
  );
  Readable.from(file.buffer).pipe(uploadStream);
});

const saveLocalFile = async (file, relativePath) => {
  const destination = path.resolve(UPLOAD_ROOT, relativePath);
  if (!destination.startsWith(`${UPLOAD_ROOT}${path.sep}`)) {
    throw new Error('Invalid local attachment path');
  }
  await fs.promises.mkdir(path.dirname(destination), { recursive: true });
  try {
    await fs.promises.writeFile(destination, file.buffer, { flag: 'wx' });
  } catch (error) {
    await fs.promises.rm(destination, { force: true }).catch((cleanupError) => {
      console.error('[attachments] Failed to clean a partial local upload:', cleanupError.message);
    });
    throw error;
  }
};

const uploadAttachments = async (files, requestType) => {
  if (!files?.length) return [];
  if (!REQUEST_TYPES.includes(requestType)) throw new Error('Invalid attachment request type');

  const uploaded = [];
  try {
    for (const file of files) {
      const mimeType = detectMimeType(file.buffer);
      if (!mimeType) {
        const error = new Error('Attachments must be PDF, JPG or PNG files.');
        error.status = 400;
        throw error;
      }

      const extension = mimeType === MIME_TYPES.pdf ? 'pdf' : mimeType === MIME_TYPES.jpg ? 'jpg' : 'png';
      const identifier = crypto.randomUUID();
      const originalName = sanitizeOriginalName(file.originalname);
      let storageKey;

      if (isCloudinaryConfigured()) {
        const publicId = await cloudinaryUpload(
          file,
          `smart-student-service-portal/attachments/${requestType}`,
          identifier
        );
        storageKey = `cloudinary:${publicId}`;
      } else if (process.env.NODE_ENV === 'production') {
        const error = new Error('File uploads are unavailable because Cloudinary is not configured.');
        error.status = 503;
        throw error;
      } else {
        const relativePath = `${requestType}/${identifier}.${extension}`;
        await saveLocalFile(file, relativePath);
        storageKey = `local:${relativePath}`;
      }

      uploaded.push({
        originalName,
        mimeType,
        size: file.size,
        storageKey,
        uploadedAt: new Date(),
      });
    }
    return uploaded;
  } catch (error) {
    await deleteAttachments(uploaded).catch((cleanupError) => {
      console.error('[attachments] Failed to clean uploads after an upload error:', cleanupError.message);
    });
    throw error;
  }
};

const deleteAttachment = async (attachment) => {
  const storageKey = attachment?.storageKey;
  if (typeof storageKey !== 'string') throw new Error('Attachment storage reference is invalid');

  if (storageKey.startsWith('cloudinary:')) {
    if (!isCloudinaryConfigured()) {
      throw new Error('Cloudinary is not configured to remove this attachment');
    }
    configureCloudinary();
    const publicId = storageKey.slice('cloudinary:'.length);
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw',
      type: 'authenticated',
      invalidate: true,
    });
    if (!['ok', 'not found'].includes(result?.result)) {
      throw new Error('Cloudinary could not remove the attachment');
    }
    return;
  }

  if (!storageKey.startsWith('local:')) {
    throw new Error('Attachment storage reference is invalid');
  }
  const relativePath = storageKey.slice('local:'.length);
  const destination = path.resolve(UPLOAD_ROOT, relativePath);
  if (!destination.startsWith(`${UPLOAD_ROOT}${path.sep}`)) {
    throw new Error('Invalid local attachment path');
  }
  await fs.promises.rm(destination, { force: true });
};

const deleteAttachments = async (attachments) => {
  const results = await Promise.allSettled(attachments.map(deleteAttachment));
  const failedDeletion = results.find((result) => result.status === 'rejected');
  if (failedDeletion) {
    throw failedDeletion.reason;
  }
};

const createRequestWithAttachments = async (Model, fields, files, requestType) => {
  const attachments = await uploadAttachments(files, requestType);
  try {
    return await Model.create(attachments.length ? { ...fields, attachments } : fields);
  } catch (error) {
    await deleteAttachments(attachments).catch((cleanupError) => {
      console.error('[attachments] Failed to clean uploads after request creation failed:', cleanupError.message);
    });
    throw error;
  }
};

const downloadAttachment = async (attachment) => {
  if (attachment.storageKey.startsWith('cloudinary:')) {
    if (!isCloudinaryConfigured()) {
      throw new Error('Cloudinary is not configured to download this attachment');
    }
    configureCloudinary();
    const extension = attachment.mimeType === MIME_TYPES.pdf
      ? 'pdf'
      : attachment.mimeType === MIME_TYPES.jpg
        ? 'jpg'
        : 'png';
    return {
      redirectUrl: cloudinary.utils.private_download_url(
        attachment.storageKey.slice('cloudinary:'.length),
        extension,
        {
          resource_type: 'raw',
          type: 'authenticated',
          expires_at: Math.floor(Date.now() / 1000) + 60,
          attachment: true,
        }
      ),
    };
  }
  if (!attachment.storageKey.startsWith('local:')) {
    throw new Error('Attachment storage reference is invalid');
  }
  const relativePath = attachment.storageKey.slice('local:'.length);
  const filePath = path.resolve(UPLOAD_ROOT, relativePath);
  if (!filePath.startsWith(`${UPLOAD_ROOT}${path.sep}`)) {
    throw new Error('Invalid local attachment path');
  }
  return { filePath };
};

module.exports = {
  MAX_FILE_SIZE,
  MAX_FILES,
  REQUEST_TYPES,
  createRequestWithAttachments,
  deleteAttachment,
  deleteAttachments,
  detectMimeType,
  downloadAttachment,
  isCloudinaryConfigured,
  sanitizeOriginalName,
  uploadAttachments,
};
