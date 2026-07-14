import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Ensure uploads/videos directory exists
const videosDir = path.join(__dirname, '..', 'uploads', 'videos');
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}

// Disk storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'videoFile' || file.mimetype.startsWith('video/')) {
      cb(null, videosDir);
    } else {
      cb(null, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filters
const galleryFilter = (req, file, cb) => {
  const allowedTypes = ['.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, JPEG, and PNG images are allowed for the gallery'), false);
  }
};

const admissionsFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.pdf', '.png', '.jpg', '.jpeg'];
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type for ${file.fieldname}. Only PDF, JPG, JPEG, and PNG files are allowed.`), false);
  }
};

const notesFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed for library notes.'), false);
  }
};

const videoFilter = (req, file, cb) => {
  const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only MP4, WEBM, OGG, and MOV video files are allowed.'), false);
  }
};

const memoryStorage = multer.memoryStorage();

const materialFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.pdf', '.zip', '.rar', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.png', '.jpg', '.jpeg', '.txt'];
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type for study material. Only PDF, Office, ZIP, and images are allowed.'), false);
  }
};

export const uploadGallery = multer({
  storage,
  fileFilter: galleryFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export const uploadAdmissions = multer({
  storage: memoryStorage,
  fileFilter: admissionsFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export const uploadNotes = multer({
  storage,
  fileFilter: notesFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export const uploadMaterial = multer({
  storage,
  fileFilter: materialFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

export const uploadVideo = multer({
  storage,
  fileFilter: videoFilter,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit for videos
});
