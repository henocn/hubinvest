const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { importFromDrive, driveId, videoExtension } = require('../src/modules/settings/screen-video.drive');
const { directory } = require('../src/modules/settings/screen-video.middleware');

// Réponse de Google Drive simulée : un en-tête, puis le contenu.
const driveReply = (context, { status = 200, type = 'application/octet-stream', body }) => {
  const calls = [];
  context.mock.method(global, 'fetch', async (url) => {
    calls.push(String(url));
    return new Response(body, { status, headers: { 'content-type': type } });
  });
  return calls;
};

test('un lien Google Drive est reconnu sous ses différentes formes, et une vidéo par ses premiers octets', () => {
  assert.equal(driveId('https://drive.google.com/file/d/1vXM3klojubCUV-zJCKAiJ7aqVCSr_cLs/view?usp=sharing'), '1vXM3klojubCUV-zJCKAiJ7aqVCSr_cLs');
  assert.equal(driveId('https://drive.google.com/open?id=1vXM3klojubCUV-zJCKAiJ7aqVCSr_cLs'), '1vXM3klojubCUV-zJCKAiJ7aqVCSr_cLs');
  assert.equal(driveId('https://youtu.be/dQw4w9WgXcQ'), null);
  assert.equal(videoExtension(Buffer.from('\0\0\0\x20ftypisom', 'latin1')), '.mp4');
  assert.equal(videoExtension(Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01])), '.webm');
  assert.equal(videoExtension(Buffer.from('<!DOCTYPE html>')), null);
});

test('une vidéo Drive est téléchargée par le serveur avec la confirmation, puis enregistrée comme un fichier chargé', async (context) => {
  const calls = driveReply(context, { body: Buffer.concat([Buffer.from('\0\0\0\x20ftypisom', 'latin1'), Buffer.alloc(2048)]) });
  const filename = await importFromDrive('https://drive.google.com/file/d/1vXM3klojubCUV-zJCKAiJ7aqVCSr_cLs/view?usp=sharing');
  context.after(() => fs.rmSync(path.join(directory, filename), { force: true }));
  assert.match(calls[0], /drive\.usercontent\.google\.com\/download\?id=1vXM3klojubCUV-zJCKAiJ7aqVCSr_cLs&export=download&confirm=t/);
  assert.match(filename, /^[a-f0-9-]+\.mp4$/);
  assert.equal(fs.statSync(path.join(directory, filename)).size, 2060);
});

test('un fichier Drive privé, ou qui n’est pas une vidéo, est refusé sans rien laisser sur le serveur', async (context) => {
  const before = fs.readdirSync(directory).length;
  driveReply(context, { type: 'text/html; charset=utf-8', body: '<!DOCTYPE html><title>Google Drive</title>' });
  await assert.rejects(importFromDrive('https://drive.google.com/file/d/1AAAAAAAAAAAAAAAAAAAAAAAAAA/view'), (error) => error.code === 'SCREEN_VIDEO_DRIVE_REFUSED');
  driveReply(context, { body: Buffer.from('ceci n’est pas une vidéo') });
  await assert.rejects(importFromDrive('https://drive.google.com/file/d/1AAAAAAAAAAAAAAAAAAAAAAAAAA/view'), (error) => error.code === 'INVALID_SCREEN_VIDEO');
  await assert.rejects(importFromDrive('https://youtu.be/dQw4w9WgXcQ'), (error) => error.code === 'SCREEN_VIDEO_NOT_DRIVE');
  assert.equal(fs.readdirSync(directory).length, before);
});

test('au démarrage, seules les vidéos de repli abandonnées sont supprimées, jamais la vidéo actuelle', async (context) => {
  const settingsService = require('../src/modules/settings/settings.service');
  const kept = 'aaaaaaaa-0000-4000-8000-000000000001.mp4';
  const names = [kept, 'bbbbbbbb-0000-4000-8000-000000000002.mp4', 'cccccccc-0000-4000-8000-000000000003.part'];
  // Les vidéos déjà présentes (celle de l'environnement de travail) sont mises de côté le temps du test.
  const existing = fs.readdirSync(directory);
  const aside = fs.mkdtempSync(path.join(directory, '..', 'screen-aside-'));
  for (const name of existing) fs.renameSync(path.join(directory, name), path.join(aside, name));
  context.after(() => {
    for (const name of fs.readdirSync(directory)) fs.rmSync(path.join(directory, name), { force: true });
    for (const name of existing) fs.renameSync(path.join(aside, name), path.join(directory, name));
    fs.rmSync(aside, { recursive: true, force: true });
  });
  for (const name of names) fs.writeFileSync(path.join(directory, name), 'x');

  const removed = await settingsService.cleanScreenVideos(`/uploads/screen/${kept}`);
  assert.deepEqual(removed.sort(), names.slice(1).sort());
  assert.deepEqual(fs.readdirSync(directory), [kept]);

  // Vidéo de repli YouTube (ou aucune) : plus aucun fichier n'a de raison de rester.
  await settingsService.cleanScreenVideos('https://youtu.be/dQw4w9WgXcQ');
  assert.deepEqual(fs.readdirSync(directory), []);
});
