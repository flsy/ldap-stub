import { serverMock, setUserConfigFileEnv } from '../testHelpers';
import { activeDirectoryClient } from '../activeDirectoryClient';
import { ldapMockSettings, optionsMock } from '../../mocks';
import { isLeft, isRight } from 'fputils';

describe('different configs for server', () => {
  beforeEach(() => {
    process.env['USERS_CONFIG_FILE'] = '';
    process.env['LDAP_USERS'] = '';
  });

  describe('LDAP_USERS', () => {
    it('should return [] when when no ENV with users configured', async () => {
      const server = await serverMock(1234, ldapMockSettings);
      const search = await activeDirectoryClient(ldapMockSettings).search(optionsMock);
      await server.close();

      expect(isRight(search) && search.value).toEqual([]);
    });

    it('should load []', async () => {
      process.env['LDAP_USERS'] = JSON.stringify({ users: [], groups: [] });
      const server = await serverMock(1234, ldapMockSettings);

      const result = await activeDirectoryClient(ldapMockSettings).search({ ...optionsMock, filter: '(sn=*)' });
      await server.close();

      expect(isRight(result) && result.value).toEqual([]);
    });

    it('fail to load wrong format', async () => {
      process.env['LDAP_USERS'] = '{}';
      const server = await serverMock(1234, ldapMockSettings);
      const search = await activeDirectoryClient(ldapMockSettings).search({ ...optionsMock, filter: '(mail=*)' });
      await server.close();

      expect(isLeft(search) && search.value).toEqual(Error('Search error: User configuration is not array. Received: {}'));
    });

    it('should fail to load when groups config is not array', async () => {
      process.env['LDAP_USERS'] = JSON.stringify({ users: [], groups: {} });
      const server = await serverMock(1234, ldapMockSettings);
      const search = await activeDirectoryClient(ldapMockSettings).search({ ...optionsMock, filter: '(mail=*)' });
      await server.close();

      expect(isLeft(search) && search.value).toEqual(Error('Search error: Group configuration is not array. Received: {"users":[],"groups":{}}'));
    });

    it('should load user config from environment variable LDAP_USERS', async () => {
      process.env['LDAP_USERS'] = JSON.stringify({
        users: [
          {
            password: 'x',
            username: 'x',
            mail: 'x@x',
            telephoneNumber: 'x',
            givenName: 'x',
            sn: 'x',
            displayName: 'x x',
            memberOf: [''],
            userPrincipalName: 'x@x',
          },
        ],
        groups: [],
      });

      const server = await serverMock(1234, ldapMockSettings);
      const search = await activeDirectoryClient(ldapMockSettings).search({ ...optionsMock, filter: '(sAMAccountName=*)' });
      await server.close();

      expect(isRight(search) && search.value).toEqual([
        {
          distinguishedName: ['CN=x x,CN=Users,DC=example,DC=com'],
          givenName: ['x'],
          mail: ['x@x'],
          memberOf: [''],
          sn: ['x'],
          telephoneNumber: ['x'],
          userPrincipalName: ['x@x'],
        },
      ]);
    });

    it('should search more users', async () => {
      process.env['LDAP_USERS'] = JSON.stringify({
        users: [
          {
            password: 'x',
            username: 'x',
            mail: 'x@x',
            telephoneNumber: 'x',
            givenName: 'x',
            sn: 'x',
            displayName: 'x x',
            memberOf: [''],
            userPrincipalName: 'x@x',
          },
          {
            password: 'xy',
            username: 'xy',
            mail: 'xy@xy',
            telephoneNumber: 'xy',
            givenName: 'xy',
            sn: 'xy',
            displayName: 'xy xy',
            memberOf: [''],
            userPrincipalName: 'xy@xy',
          },
        ],
        groups: [],
      });
      const server = await serverMock(1234, ldapMockSettings);
      const result = await activeDirectoryClient(ldapMockSettings).search({
        ...optionsMock,
        filter: `(&(objectCategory=person)(objectClass=user)(sAMAccountName=*x*))`,
      });
      await server.close();

      expect(isRight(result) && result.value).toEqual([
        {
          distinguishedName: ['CN=x x,CN=Users,DC=example,DC=com'],
          givenName: ['x'],
          mail: ['x@x'],
          memberOf: [''],
          sn: ['x'],
          telephoneNumber: ['x'],
          userPrincipalName: ['x@x'],
        },
        {
          distinguishedName: ['CN=xy xy,CN=Users,DC=example,DC=com'],
          givenName: ['xy'],
          mail: ['xy@xy'],
          memberOf: [''],
          sn: ['xy'],
          telephoneNumber: ['xy'],
          userPrincipalName: ['xy@xy'],
        },
      ]);
    });
  });

  describe('USERS_CONFIG_FILE', () => {
    it('should load user config from file', async () => {
      setUserConfigFileEnv();

      const server = await serverMock(1234, ldapMockSettings);
      const search = await activeDirectoryClient(ldapMockSettings).search({ ...optionsMock, filter: '(sAMAccountName=us*)' });
      await server.close();

      expect(isRight(search) && search.value).toEqual([
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

    it('should prefer USERS_CONFIG_FILE', async () => {
      setUserConfigFileEnv();
      process.env['LDAP_USERS'] = JSON.stringify([
        {
          username: 'x',
          userPrincipalName: 'x@x',
        },
      ]);

      const server = await serverMock(1234, ldapMockSettings);
      const search = await activeDirectoryClient(ldapMockSettings).search({ ...optionsMock, filter: '(sAMAccountName=user)' });
      await server.close();

      if (isLeft(search)) {
        fail('Failed to get users');
      }

      expect(search.value.length).toEqual(1);
      expect(search.value[0]).toMatchObject({ userPrincipalName: ['user@example.com'] });
    });
  });
});
