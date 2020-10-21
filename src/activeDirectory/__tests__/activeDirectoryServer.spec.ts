import ldap from 'ldapjs';
import { serverMock } from '../testHelpers';
import { ILdapConfig, IOptions } from '../../interfaces';
import { isLeft, isRight } from '../../tools';
import { activeDirectoryClient } from '../activeDirectoryClient';
import { user1 } from '../../mocks';

interface IResult {
    distinguishedName: string;
    memberOf: string[];
    givenName: string;
    sn: string;
    mail: string;
    telephoneNumber: string;
    userPrincipalName: string;
}

const options: IOptions<IResult> = {
  filter: '(&(objectCategory=person)(objectClass=user)(sAMAccountName={username}))',
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
        const result = await activeDirectoryClient(ldapMockSettings).login(user1.username, 'xx', options );
        await server.close();

        expect(isLeft(result)).toEqual(true);
        expect(result.value).toEqual(new ldap.InvalidCredentialsError());
    });

    it('returns user details when all goes right', async () => {
        const server = await serverMock(1234, ldapMockSettings, user1);
        const result = await activeDirectoryClient(ldapMockSettings).login(user1.username, user1.password, options);
        await server.close();

      expect(isRight(result)).toEqual(true);
      expect(result.value).toEqual({
        distinguishedName: 'CN=John Snow,OU=Users,DC=ibsng, DC=local',
        username: 'user',
        mail: 'joe@email',
        telephoneNumber: '123456789',
        givenName: 'John',
        sn: 'Snow',
        memberOf: ['Admins', 'Audit'],
        userPrincipalName: 'joe@email',
      });
    });
  });

  describe('search', () => {
    it('should search for user in Active Directory server', async () => {
      const server = await serverMock(1234, ldapMockSettings, user1);
      const result = await activeDirectoryClient(ldapMockSettings).search(user1.username, options);
      await server.close();

      expect(isRight(result)).toEqual(true);
      expect(result.value).toEqual({
        columns: [
          {
            label: undefined,
            name: 'distinguishedName',
          },
          {
            label: undefined,
            name: 'memberOf',
          },
          {
            label: undefined,
            name: 'givenName',
          },
          {
            label: undefined,
            name: 'sn',
          },
          {
            label: undefined,
            name: 'mail',
          },
          {
            label: undefined,
            name: 'telephoneNumber',
          },
          {
            label: undefined,
            name: 'userPrincipalName',
          },
        ],
        data: [
          {
            distinguishedName: 'CN=John Snow,OU=Users,DC=ibsng, DC=local',
            givenName: 'John',
            mail: 'joe@email',
            memberOf: ['CN=Admins,CN=Groups,DC=ibsng,DC=local', 'CN=Audit,CN=Groups,DC=ibsng,DC=local'],
            sn: 'Snow',
            telephoneNumber: '123456789',
            userPrincipalName: 'joe@email',
          },
        ],
      });
    });
  });

