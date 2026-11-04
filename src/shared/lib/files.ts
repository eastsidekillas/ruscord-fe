import { Attachment } from '@shared/api';

/** A size in bytes the way people read it: «512 Б», «1,4 КБ», «25 МБ». */
export function fileSize(bytes: number): string {
  const units = ['Б', 'КБ', 'МБ', 'ГБ'];
  let n = bytes;
  let u = 0;
  while (n >= 1024 && u < units.length - 1) {
    n /= 1024;
    u++;
  }
  const text = u === 0 || n >= 10 ? Math.round(n).toString() : n.toFixed(1).replace('.', ',').replace(/,0$/, '');
  return `${text} ${units[u]}`;
}

const SHOWN_IMAGES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const SHOWN_VIDEOS = ['video/mp4', 'video/webm'];

/**
 * How the feed shows an attachment. The server decides what is a picture
 * (it sends width and height only for those) and what is a video; anything
 * else is a file to download, whatever its type says.
 */
export function attachmentKind(a: Attachment): 'image' | 'video' | 'file' {
  if (SHOWN_IMAGES.includes(a.content_type) && a.width && a.height) return 'image';
  if (SHOWN_VIDEOS.includes(a.content_type)) return 'video';
  return 'file';
}

/** The size a w×h picture is shown at, at most maxW×maxH, never enlarged. */
export function fitBox(w: number, h: number, maxW: number, maxH: number): { width: number; height: number } {
  const k = Math.min(1, maxW / w, maxH / h);
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}
