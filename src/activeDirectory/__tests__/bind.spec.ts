import { serverMock, setUserConfigFileEnv } from '../testHelpers';
import { ldapMockSettings, optionsMock, user } from '../../mocks';
import { bind, getClient, search, searchResult } from '../../methods';
import { isLeft } from 'fputils';
import ldap from 'ldapjs';

describe('bind operation', () => {
  beforeAll(() => {
    setUserConfigFileEnv();
  });

  const clientOptions = { url: ldapMockSettings.serverUrl, timeout: 1000, connectTimeout: 1000 };

  it('should return invalidDn', async () => {
    const server = await serverMock(1234, ldapMockSettings);
    const client = await getClient(clientOptions);

    const bindUser = await bind(!isLeft(client) && client.value, 'xx', 'xx');
    await server.close();
    expect(isLeft(bindUser) && bindUser.value.message).toEqual('Invalid Dn Syntax');
  });

  it('should fail with InvalidCredentialsError when wrong password used', async () => {
    const server = await serverMock(1234, ldapMockSettings);
    const client = await getClient(clientOptions);

    const bindUser = await bind(!isLeft(client) && client.value, user.distinguishedName, 'xx');
    await server.close();

    expect(isLeft(bindUser) && bindUser.value).toEqual(new ldap.InvalidCredentialsError());
  });

  it('should fail to bind user when user wrong dn', async () => {
    const server = await serverMock(1234, ldapMockSettings);
    const client = await getClient(clientOptions);

    const binded = await bind(!isLeft(client) && client.value, 'CN=wrong User, DC=example, DC=com', 'password');
    await server.close();

    expect(isLeft(binded) && binded.value).toEqual(new ldap.InvalidCredentialsError());
  });

  it('search should work when bounded as another user', async () => {
    const server = await serverMock(1234, ldapMockSettings);

    const client = await getClient(clientOptions);

    if (isLeft(client)) {
      fail('Failed to get AD client');
    }

    await bind(client.value, user.distinguishedName, user.password);

    const searchedUser = await search(client.value, ldapMockSettings.suffix, {
      ...optionsMock,
      filter: `(&(objectCategory=person)(objectClass=user)(sAMAccountName=${user.username}))`,
    });
    await server.close();

    if (isLeft(searchedUser)) {
      fail('Failed search user');
    }

    const result = searchResult(searchedUser.value, optionsMock.attributes);

    expect(result).toEqual([
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
});
