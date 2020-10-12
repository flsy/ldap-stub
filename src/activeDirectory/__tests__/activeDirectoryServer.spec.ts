import ldap from 'ldapjs';
import {getOptions, serverMock} from '../testHelpers';
import {ILdapConfig} from '../../interfaces';
import { isLeft, isRight } from '../../tools';
import { activeDirectoryClient } from '../activeDirectoryClient';
import { user, user1 } from '../../mocks';

const options = {
  filter: '(&(objectCategory=person)(objectClass=user)(sAMAccountName={0}))'.replace('{0}', user1.username),
  scope: 'sub',
  attributes: ['distinguishedName', 'memberOf', 'givenName', 'sn', 'mail', 'telephoneNumber', 'userPrincipalName'],
}

const ldapMockSettings: ILdapConfig = {
    serverUrl: 'ldap://0.0.0.0:1234',
    suffix: 'DC=ibsng, DC=local',
    bindDN: 'CN=Administrator,CN=Users,DC=ibsng,DC=local',
    bindPwd: 'ldap-password',
};

describe('active directory', () => {
    it('returns error when provided user credentials are incorrect', async () => {
        const server = await serverMock(1234, ldapMockSettings, user1);
        const result = await activeDirectoryClient(ldapMockSettings).login(user1.username, 'xx', getOptions(options) );
        await server.close();

        expect(isLeft(result)).toEqual(true);
        expect(result.value).toEqual(new ldap.InvalidCredentialsError());
    });

    it('returns user details when all goes right', async () => {
        const server = await serverMock(1234, ldapMockSettings, user1);
        const result = await activeDirectoryClient(ldapMockSettings).login(user1.username, user1.password, getOptions(options));
        await server.close();

        expect(isRight(result)).toEqual(true);
        expect(result.value).toEqual(
          {
              distinguishedName: 'CN=John Snow,OU=Users,DC=ibsng, DC=local',
              username: 'user',
              mail: 'joe@email',
              telephoneNumber: '123456789',
              givenName: 'John',
              sn: 'Snow',
              memberOf: ['Admins'],
              userPrincipalName: 'joe@email',}
        );
    });
});
