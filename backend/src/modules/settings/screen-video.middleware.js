const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const multer = require('multer');
const AppError = require('../../shared/app-error');

// Vidéo de repli du grand écran, chargée depuis les Paramètres : MP4 ou WebM, 500 Mo au plus.
// Le serveur web doit laisser passer cette taille sur cette adresse (client_max_body_size).
const MAX_SIZE = 500 * 1024 * 1024;
const directory = path.resolve(__dirname, '..', '..', '..', 'uploads', 'screen');
fs.mkdirSync(directory, { recursive: true });

const extensions = new Map([
  ['video/mp4', '.mp4'],
  ['video/webm', '.webm'],
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: directory,
    filename: (request, file, callback) => callback(null, `${randomUUID()}${extensions.get(file.mimetype)}`),
  }),
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter: (request, file, callback) => {
    if (!extensions.has(file.mimetype)) return callback(new AppError(422, 'INVALID_SCREEN_VIDEO', 'Choisissez une vidéo MP4 ou WebM.'));
    return callback(null, true);
  },
}).single('video');

module.exports = (request, response, next) => {
  upload(request, response, (error) => {
    if (!error) return next();
    if (error instanceof AppError) return next(error);
    if (error.code === 'LIMIT_FILE_SIZE') return next(new AppError(422, 'SCREEN_VIDEO_TOO_LARGE', 'La vidéo ne doit pas dépasser 500 Mo.'));
    return next(new AppError(422, 'INVALID_SCREEN_VIDEO', 'La vidéo n’a pas pu être chargée.'));
  });
};

module.exports.directory = directory;
