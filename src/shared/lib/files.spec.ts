import { Attachment } from '@shared/api';
import { attachmentKind, fileSize, fitBox } from './files';

const att = (p: Partial<Attachment>): Attachment => ({ id: 'a', filename: 'f', size: 1, content_type: 'application/octet-stream', ...p });

describe('files', () => {
  it('writes sizes in Russian units', () => {
    expect([0, 512, 1024, 1536, 10 * 1024, 25 * 1024 * 1024, 3 * 1024 ** 3].map(fileSize))
      .toEqual(['0 Б', '512 Б', '1 КБ', '1,5 КБ', '10 КБ', '25 МБ', '3 ГБ']);
  });

  it('shows only what the server marked as a picture or a video', () => {
    expect(attachmentKind(att({ content_type: 'image/png', width: 10, height: 10 }))).toBe('image');
    expect(attachmentKind(att({ content_type: 'image/png' }))).toBe('file'); // too large or broken: no size
    expect(attachmentKind(att({ content_type: 'video/webm' }))).toBe('video');
    expect(attachmentKind(att({ content_type: 'text/xml; charset=utf-8' }))).toBe('file');
  });

  it('fits pictures without enlarging them', () => {
    expect(fitBox(800, 400, 400, 300)).toEqual({ width: 400, height: 200 });
    expect(fitBox(300, 900, 400, 300)).toEqual({ width: 100, height: 300 });
    expect(fitBox(40, 20, 400, 300)).toEqual({ width: 40, height: 20 });
  });
});
