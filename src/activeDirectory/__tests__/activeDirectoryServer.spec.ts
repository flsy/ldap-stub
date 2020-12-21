import ldap from 'ldapjs';
import { serverMock } from '../testHelpers';
import { ILdapConfig } from '../../interfaces';
import { isLeft, isRight } from '../../tools';
import { activeDirectoryClient } from '../activeDirectoryClient';
import { optionsMock, user } from '../../mocks';

const ldapMockSettings = (imperative?: Partial<ILdapConfig>): ILdapConfig => ({
  serverUrl: 'ldap://0.0.0.0:1234',
  suffix: 'DC=example, DC=com',
  usersBaseDN: 'CN=Users,DC=example,DC=com',
  bindDN: 'CN=Administrator,CN=Users,DC=example,DC=com',
  bindPwd: 'ldap-password',
  ...imperative,
});

describe('active directory', () => {
  describe('login', () => {
    it('returns error when provided user credentials are incorrect', async () => {
      const server = await serverMock(1234, ldapMockSettings(), user);
      const result = await activeDirectoryClient(ldapMockSettings()).login(user.username, 'xx', optionsMock());
      await server.close();

      expect(isLeft(result)).toEqual(true);
      expect(result.value).toEqual(new ldap.InvalidCredentialsError());
    });

    it('returns user details when all goes right', async () => {
      const server = await serverMock(1234, ldapMockSettings(), user);
      const result = await activeDirectoryClient(ldapMockSettings()).login(user.username, user.password, optionsMock());
      await server.close();

      expect(isRight(result)).toEqual(true);
      expect(result.value).toEqual({
        distinguishedName: ['CN=John Snow,CN=Users,DC=example,DC=com'],
        mail: ['joe@email'],
        telephoneNumber: ['123456789'],
        givenName: ['John'],
        sn: ['Snow'],
        memberOf: ['CN=Admins,CN=Groups,DC=example,DC=com', 'CN=Audit,CN=Groups,DC=example,DC=com'],
        userPrincipalName: ['user@example.com'],
      });
    });

    it('returns user details when all goes right with different AD structure', async () => {
      const serverMockSettings = ldapMockSettings({
        usersBaseDN: 'OU=Users,OU=Marketing,OU=Divisions,DC=example,DC=com',
        bindDN: 'CN=Domain Admin,OU=Users,OU=Marketing,OU=Divisions,DC=example,DC=com',
      });
      const server = await serverMock(1234, serverMockSettings, user);
      const result = await activeDirectoryClient(serverMockSettings).login(user.username, user.password, optionsMock());
      await server.close();

      expect(isRight(result)).toEqual(true);
      expect(result.value).toEqual({
        distinguishedName: ['CN=John Snow,OU=Users,OU=Marketing,OU=Divisions,DC=example,DC=com'],
        mail: ['joe@email'],
        telephoneNumber: ['123456789'],
        givenName: ['John'],
        sn: ['Snow'],
        memberOf: ['CN=Admins,CN=Groups,DC=example,DC=com', 'CN=Audit,CN=Groups,DC=example,DC=com'],
        userPrincipalName: ['user@example.com'],
      });
    });

    it('returns user details when all goes right with userPrincipalName', async () => {
      const server = await serverMock(1234, ldapMockSettings(), user);
      const result = await activeDirectoryClient(ldapMockSettings()).login(
        user.username,
        user.password,
        optionsMock({
          filter: '(&(objectcategory=user)(userPrincipalName={0}))',
        }),
      );
      await server.close();

      expect(isRight(result)).toEqual(true);
      expect(result.value).toEqual({
        distinguishedName: ['CN=John Snow,CN=Users,DC=example,DC=com'],
        mail: ['joe@email'],
        telephoneNumber: ['123456789'],
        givenName: ['John'],
        sn: ['Snow'],
        memberOf: ['CN=Admins,CN=Groups,DC=example,DC=com', 'CN=Audit,CN=Groups,DC=example,DC=com'],
        userPrincipalName: ['user@example.com'],
      });
    });
  });

  describe('search', () => {
    it('should search for user in Active Directory server', async () => {
      const server = await serverMock(1234, ldapMockSettings(), user);
      const result = await activeDirectoryClient(ldapMockSettings()).search(user.username, optionsMock());
      await server.close();

      expect(isRight(result)).toEqual(true);
      expect(result.value).toEqual([
        {
          distinguishedName: ['CN=John Snow,CN=Users,DC=example,DC=com'],
          givenName: ['John'],
          mail: ['joe@email'],
          memberOf: ['CN=Admins,CN=Groups,DC=example,DC=com', 'CN=Audit,CN=Groups,DC=example,DC=com'],
          sn: ['Snow'],
          telephoneNumber: ['123456789'],
          userPrincipalName: ['user@example.com'],
        },
      ]);
    });

    it('should search for user in Active Directory server and returns only memberOf attribute', async () => {
      const server = await serverMock(1234, ldapMockSettings(), user);
      const result = await activeDirectoryClient(ldapMockSettings()).search(user.username, optionsMock({ attributes: ['memberOf'] }));
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
