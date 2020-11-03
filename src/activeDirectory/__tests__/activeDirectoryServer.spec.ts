import ldap from 'ldapjs';
import { serverMock } from '../testHelpers';
import { ILdapConfig } from '../../interfaces';
import { isLeft, isRight } from '../../tools';
import { activeDirectoryClient } from '../activeDirectoryClient';
import { optionsMock, user1 } from '../../mocks';

const ldapMockSettings: ILdapConfig = {
  serverUrl: 'ldap://0.0.0.0:1234',
  suffix: 'DC=example, DC=com',
  bindDN: 'CN=Administrator,CN=Users,DC=example,DC=com',
  bindPwd: 'ldap-password',
};

describe('active directory', () => {
  describe('login', () => {
    it('returns error when provided user credentials are incorrect', async () => {
      const server = await serverMock(1234, ldapMockSettings, user1);
      const result = await activeDirectoryClient(ldapMockSettings).login(user1.username, 'xx', optionsMock());
      await server.close();

      expect(isLeft(result)).toEqual(true);
      expect(result.value).toEqual(new ldap.InvalidCredentialsError());
    });

    it('returns user details when all goes right', async () => {
      const server = await serverMock(1234, ldapMockSettings, user1);
      const result = await activeDirectoryClient(ldapMockSettings).login(user1.username, user1.password, optionsMock());
      await server.close();

      expect(isRight(result)).toEqual(true);
      expect(result.value).toEqual({
        distinguishedName: 'CN=John Snow,OU=Users,DC=example, DC=com',
        username: 'user',
        mail: 'joe@email',
        telephoneNumber: '123456789',
        givenName: 'John',
        sn: 'Snow',
        memberOf: ['CN=Admins,CN=Groups,DC=example,DC=com', 'CN=Audit,CN=Groups,DC=example,DC=com'],
        userPrincipalName: 'joe@email',
      });
    });
  });

  describe('search', () => {
    it('should search for user in Active Directory server', async () => {
      const server = await serverMock(1234, ldapMockSettings, user1);
      const result = await activeDirectoryClient(ldapMockSettings).search(user1.username, optionsMock());
      await server.close();

      expect(isRight(result)).toEqual(true);
      expect(result.value).toEqual([
        {
          distinguishedName: 'CN=John Snow,OU=Users,DC=example, DC=com',
          givenName: 'John',
          mail: 'joe@email',
          memberOf: ['CN=Admins,CN=Groups,DC=example,DC=com', 'CN=Audit,CN=Groups,DC=example,DC=com'],
          sn: 'Snow',
          telephoneNumber: '123456789',
          userPrincipalName: 'joe@email',
        },
      ]);
    });

    it('should search for user in Active Directory server and returns only memberOf attribute', async () => {
      const server = await serverMock(1234, ldapMockSettings, user1);
      const result = await activeDirectoryClient(ldapMockSettings).search(user1.username, optionsMock({ attributes: ['memberOf'] }));
      await server.close();

      expect(isRight(result)).toEqual(true);
      expect(result.value).toEqual([
        {
          memberOf: ['CN=Admins,CN=Groups,DC=example,DC=com', 'CN=Audit,CN=Groups,DC=example,DC=com'],
        },
      ]);
    });
  });
});
