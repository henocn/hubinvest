const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Readable, Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const AppError = require('../../shared/app-error');
const { directory } = require('./screen-video.middleware');

// Vidéo de repli donnée par un lien Google Drive. Google refuse qu'une page d'un autre site lise une vidéo Drive :
// le serveur la télécharge donc une fois, puis la sert lui-même, comme une vidéo chargée depuis les Paramètres.
const MAX_SIZE = 500 * 1024 * 1024;
const TIMEOUT = 9 * 60 * 1000;
const DRIVE = /drive\.google\.com\/(?:file\/d\/|open\?(?:.*&)?id=|uc\?(?:.*&)?id=)([A-Za-z0-9_-]{10,})/;

const driveId = (url) => String(url || '').match(DRIVE)?.[1] || null;

// Le début du fichier dit s'il s'agit bien d'une vidéo MP4 ou WebM.
const videoExtension = (head) => {
  if (head.length >= 8 && head.toString('latin1', 4, 8) === 'ftyp') return '.mp4';
  if (head.length >= 4 && head.readUInt32BE(0) === 0x1a45dfa3) return '.webm';
  return null;
};

const refused = () => new AppError(422, 'SCREEN_VIDEO_DRIVE_REFUSED', 'Google Drive ne donne pas ce fichier : vérifiez qu’il est partagé à « tous ceux qui ont le lien ».');

// Télécharge la vidéo d'un lien Drive dans le dossier des vidéos de l'écran. Renvoie le nom du fichier enregistré.
const importFromDrive = async (url) => {
  const id = driveId(url);
  if (!id) throw new AppError(422, 'SCREEN_VIDEO_NOT_DRIVE', 'Ce lien n’est pas un lien Google Drive.');
  let response;
  try {
    response = await fetch(`https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`, { redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT) });
  } catch (error) {
    throw new AppError(502, 'SCREEN_VIDEO_DRIVE_UNREACHABLE', 'Google Drive ne répond pas. Réessayez dans un instant.');
  }
  // Fichier privé ou introuvable : Google répond par une page, pas par le fichier.
  if (!response.ok || /text\/html/i.test(response.headers.get('content-type') || '')) throw refused();
  if (Number(response.headers.get('content-length')) > MAX_SIZE) throw new AppError(422, 'SCREEN_VIDEO_TOO_LARGE', 'La vidéo ne doit pas dépasser 500 Mo.');

  const temporary = path.join(directory, `${randomUUID()}.part`);
  let size = 0;
  let head = Buffer.alloc(0);
  const guard = new Transform({
    transform(chunk, encoding, callback) {
      size += chunk.length;
      if (head.length < 16) head = Buffer.concat([head, chunk.subarray(0, 16 - head.length)]);
      if (size > MAX_SIZE) return callback(new AppError(422, 'SCREEN_VIDEO_TOO_LARGE', 'La vidéo ne doit pas dépasser 500 Mo.'));
      return callback(null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(response.body), guard, fs.createWriteStream(temporary));
    const extension = videoExtension(head);
    if (!extension) throw new AppError(422, 'INVALID_SCREEN_VIDEO', 'Ce fichier Drive n’est pas une vidéo MP4 ou WebM.');
    const filename = `${path.basename(temporary, '.part')}${extension}`;
    await fsp.rename(temporary, path.join(directory, filename));
    return filename;
  } catch (error) {
    await fsp.unlink(temporary).catch(() => {});
    if (error instanceof AppError) throw error;
    throw new AppError(502, 'SCREEN_VIDEO_DRIVE_FAILED', 'Le téléchargement depuis Google Drive a échoué. Réessayez.');
  }
};

module.exports = { importFromDrive, driveId, videoExtension };
