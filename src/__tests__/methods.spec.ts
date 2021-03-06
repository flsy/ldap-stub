import { getGroups, getUserAttributes, searchResult } from '../methods';
import { optionsMock } from '../mocks';

const ldapAttributesMock = [
  {
    type: 'distinguishedName',
    vals: ['CN=John Snow,OU=Users,DC=example, DC=com'],
  },
  {
    type: 'memberOf',
    vals: ['CN=Admins,CN=Groups,DC=example,DC=com', 'CN=Audit,CN=Groups,DC=example,DC=com'],
  },
  { type: 'givenName', vals: ['John'] },
  { type: 'sn', vals: ['Snow'] },
  { type: 'mail', vals: ['joe@email'] },
  { type: 'telephoneNumber', vals: ['123456789'] },
  { type: 'userPrincipalName', vals: ['joe@email'] },
];

describe('methods test suite', () => {
  describe('getGroups function', () => {
    it('should return empty array when bad group format passed in', () => {
      const result = getGroups(['some wrong group dn']);

      expect(result).toEqual([]);
    });

    it('should return empty array when format passed in', () => {
      const result = getGroups(['OU=Admins,DC=example,DC=com']);

      expect(result).toEqual([]);
    });

    it('should convert non-array value using OU=IT in DN', () => {
      const result = getGroups(['CN=Admins, OU=IT, DC=example, DC=com']);

      expect(result).toEqual(['Admins']);
    });

    it('should convert non-array value using CN=IT in DN', () => {
      const result = getGroups(['CN=Admins, CN=IT, DC=example, DC=com']);

      expect(result).toEqual(['Admins']);
    });

    it('should return name of the LDAP groups', () => {
      const result = getGroups(['CN=Admins, OU=IT, DC=example, DC=com', 'CN=Marketing, CN=Finance, DC=example, DC=com']);

      expect(result).toEqual(['Admins', 'Marketing']);
    });
  });

  describe('getUserAttributes function', () => {
    it('should return empty object when wrong attribute passed in', () => {
      const result = getUserAttributes(optionsMock, [
        {
          type: 'wrongAttribute',
          vals: ['CN=John Snow,OU=Users,DC=example, DC=com'],
        },
      ]);

      expect(result).toEqual({});
    });

    it('should return partial result', () => {
      const result = getUserAttributes(optionsMock, [
        {
          type: 'wrongAttribute',
          vals: ['CN=John Snow,CN=Users,DC=example, DC=com'],
        },
        { type: 'givenName', vals: ['John'] },
      ]);

      expect(result).toEqual({ givenName: ['John'] });
    });

    it('should return ldap attributes using OU=Users in DN', () => {
      const result = getUserAttributes(optionsMock, ldapAttributesMock);

      expect(result).toEqual({
        distinguishedName: ['CN=John Snow,OU=Users,DC=example, DC=com'],
        givenName: ['John'],
        mail: ['joe@email'],
        memberOf: ['CN=Admins,CN=Groups,DC=example,DC=com', 'CN=Audit,CN=Groups,DC=example,DC=com'],
        sn: ['Snow'],
        telephoneNumber: ['123456789'],
        userPrincipalName: ['joe@email'],
      });
    });

    it('should return ldap attributes using CN=Users in DN', () => {
      const result = getUserAttributes(optionsMock, [
        {
          type: 'distinguishedName',
          vals: ['CN=John Snow,OU=Users,DC=example, DC=com'],
        },
        {
          type: 'memberOf',
          vals: ['CN=Admins,OU=Groups,DC=example,DC=com', 'CN=Audit,OU=Groups,DC=example,DC=com'],
        },
      ]);

      expect(result).toEqual({
        distinguishedName: ['CN=John Snow,OU=Users,DC=example, DC=com'],
        memberOf: ['CN=Admins,OU=Groups,DC=example,DC=com', 'CN=Audit,OU=Groups,DC=example,DC=com'],
      });
    });
  });

  describe('searchResult', () => {
    it('r works', () => {
      const result = searchResult([{ attributes: [{ toString: () => '{}' }] } as any], '?');
      expect(result).toEqual([{}]);
    });

    it('works', () => {
      const result = searchResult([{ attributes: [{ toString: () => '{"type":"mine","vals":["a", "b"]}' }] } as any], 'mine');
      expect(result).toEqual([{ mine: ['a', 'b'] }]);
    });
  });
});
