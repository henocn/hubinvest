// Vidéo de repli du grand écran : d'où elle vient, et comment la lire en boucle, sans son.
// - YouTube : lecteur intégré, lancé muet et en boucle.
// - Google Drive : Google refuse qu'une autre page lise une vidéo Drive. Un lien Drive est donc importé par le serveur
//   à l'enregistrement, et l'écran lit ensuite le fichier chargé.
// - Fichier chargé sur la plateforme, ou adresse d'un fichier vidéo : lu directement.

const YOUTUBE = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

export const videoSource = (url) => {
  const value = String(url || '').trim();
  const youtube = value.match(YOUTUBE);
  if (youtube) {
    const id = youtube[1];
    const options = new URLSearchParams({ autoplay: '1', mute: '1', loop: '1', playlist: id, controls: '0', rel: '0', playsinline: '1', iv_load_policy: '3', disablekb: '1' });
    return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${id}?${options}` };
  }
  return value ? { kind: 'file', src: value } : null;
};
