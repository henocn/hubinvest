const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const multer = require('multer');
const AppError = require('../../shared/app-error');

// Photos des produits ou du stand, affichées en carrousel sur la fiche publique.
const galleryDirectory = path.resolve(__dirname, '..', '..', '..', 'uploads', 'gallery');
fs.mkdirSync(galleryDirectory, { recursive: true });

const extensions = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: galleryDirectory,
    filename: (request, file, callback) => callback(null, `${randomUUID()}${extensions.get(file.mimetype)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (request, file, callback) => {
    if (!extensions.has(file.mimetype)) {
      return callback(new AppError(422, 'INVALID_GALLERY_IMAGE', 'Choisissez une image JPG, PNG ou WebP.'));
    }
    return callback(null, true);
  },
}).single('image');

module.exports = (request, response, next) => {
  upload(request, response, (error) => {
    if (!error) return next();
    if (error instanceof AppError) return next(error);
    return next(new AppError(422, 'INVALID_GALLERY_IMAGE', 'L’image ne peut pas être utilisée. Sa taille maximale est de 5 Mo.'));
  });
};

module.exports.galleryDirectory = galleryDirectory;
