const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const multer = require('multer');
const AppError = require('../../shared/app-error');

const coverDirectory = path.resolve(__dirname, '..', '..', '..', 'uploads', 'covers');
fs.mkdirSync(coverDirectory, { recursive: true });

const extensions = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: coverDirectory,
    filename: (request, file, callback) => callback(null, `${randomUUID()}${extensions.get(file.mimetype)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (request, file, callback) => {
    if (!extensions.has(file.mimetype)) {
      return callback(new AppError(422, 'INVALID_COVER_IMAGE', 'Choisissez une image JPG, PNG ou WebP.'));
    }
    return callback(null, true);
  },
}).single('coverImage');

module.exports = (request, response, next) => {
  upload(request, response, (error) => {
    if (!error) return next();
    if (error instanceof AppError) return next(error);
    return next(new AppError(422, 'INVALID_COVER_IMAGE', 'L’image ne peut pas être utilisée. Sa taille maximale est de 5 Mo.'));
  });
};
