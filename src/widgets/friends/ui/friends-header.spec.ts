import { tabLabel } from './friends-header';

describe('friends header', () => {
  it('counts requests on the requests tab only', () => {
    expect(tabLabel('pending', 'Заявки', 2)).toBe('Заявки · 2');
    expect(tabLabel('pending', 'Заявки', 0)).toBe('Заявки');
    expect(tabLabel('all', 'Все', 5)).toBe('Все');
  });

  it('caps the count at 99+', () => {
    expect(tabLabel('pending', 'Заявки', 140)).toBe('Заявки · 99+');
  });
});
