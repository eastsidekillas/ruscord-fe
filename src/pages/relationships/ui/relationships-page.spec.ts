import { RelType } from '@shared/api';
import { requestNote } from './relationships-page';

describe('relationships page', () => {
  it('says which side a request waits on', () => {
    expect(requestNote(RelType.Incoming)).toBe(' · хочет дружить');
    expect(requestNote(RelType.Outgoing)).toBe(' · ждёт ответа');
    expect(requestNote(RelType.Blocked)).toBe('');
  });
});
