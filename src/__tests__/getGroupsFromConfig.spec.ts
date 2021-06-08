import { getGroupsFromConfig } from '../tools';

describe('getGroupsFromConfig', () => {
  it('should not return []', () => {
    const result = getGroupsFromConfig([]);
    expect(result).toEqual([]);
  });

  it('should return 1 result', () => {
    const groups = getGroupsFromConfig([{ name: 'group' }]);
    expect(groups).toEqual([{ name: 'group' }]);
  });

  it('should return groups with memberOf', () => {
    const groups = getGroupsFromConfig([
      {
        name: 'x',
        children: [{ name: 'y' }, { name: 'o' }],
      },
      {
        name: 'z',
      },
    ]);
    expect(groups).toEqual([
      {
        name: 'x',
      },
      {
        name: 'y',
        memberOf: 'x',
      },
      {
        name: 'o',
        memberOf: 'x',
      },
      {
        name: 'z',
      },
    ]);
  });

  it('should return groups with memberOf with nested children', () => {
    const groups = getGroupsFromConfig([
      {
        name: 'x',
        children: [{ name: 'y' }, { name: 'o', children: [{ name: 'nested' }] }],
      },
      { name: 'z' },
    ]);

    expect(groups).toEqual([
      { name: 'x' },
      {
        name: 'y',
        memberOf: 'x',
      },
      {
        name: 'o',
        memberOf: 'x',
      },
      { name: 'nested', memberOf: 'o' },
      { name: 'z' },
    ]);
  });

  it('should return groups with memberOf with tripple nested childrens', () => {
    const groups = getGroupsFromConfig([
      {
        name: 'x',
        children: [{ name: 'y' }, { name: 'o', children: [{ name: 'nested', children: [{ name: 'another nest' }] }] }],
      },
      { name: 'z' },
    ]);

    expect(groups).toEqual([
      { name: 'x' },
      {
        name: 'y',
        memberOf: 'x',
      },
      {
        name: 'o',
        memberOf: 'x',
      },
      { name: 'nested', memberOf: 'o' },
      { name: 'another nest', memberOf: 'nested' },
      { name: 'z' },
    ]);
  });
});
