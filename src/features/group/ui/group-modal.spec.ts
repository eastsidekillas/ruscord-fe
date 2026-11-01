import { groupRoom, roomText } from './group-modal';

describe('group modal', () => {
  it('leaves room for nine friends in a new group, none in a full one', () => {
    expect(groupRoom(1)).toBe(9);
    expect(groupRoom(3)).toBe(7);
    expect(groupRoom(10)).toBe(0);
    expect(groupRoom(12)).toBe(0);
  });

  it('says how many more can join', () => {
    expect(roomText(7)).toBe('Только друзья. Можно добавить ещё 7.');
    expect(roomText(0)).toBe('В группе уже 10 человек.');
  });
});
