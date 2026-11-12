import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsBase = path.resolve(__dirname, '../../uploads/chat');
const imagesDir = path.join(uploadsBase, 'images');
const audioDir = path.join(uploadsBase, 'audio');

// Ensure directories exist
fs.mkdirSync(imagesDir, { recursive: true });
fs.mkdirSync(audioDir, { recursive: true });

// Image storage
const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, imagesDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `img-${uniqueSuffix}${ext}`);
  },
});

const imageFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    const err = new Error('Invalid image format. Allowed formats: JPEG, PNG, WebP');
    err.statusCode = 400;
    cb(err, false);
  }
};

export const chatImageUpload = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Audio storage
const audioStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, audioDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.mimetype.includes('ogg') ? '.ogg' : file.mimetype.includes('mp3') ? '.mp3' : '.webm');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `audio-${uniqueSuffix}${ext}`);
  },
});

const audioFilter = (_req, file, cb) => {
  const allowed = [
    'audio/webm',
    'audio/ogg',
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/wav',
    'audio/x-m4a',
    'video/webm', // MediaRecorder often tags audio-only recording as video/webm in some Chromium builds
  ];
  if (allowed.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    const err = new Error('Invalid audio format. Allowed formats: WebM, OGG, MP3, WAV');
    err.statusCode = 400;
    cb(err, false);
  }
};

export const chatAudioUpload = multer({
  storage: audioStorage,
  fileFilter: audioFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
