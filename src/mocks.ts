import { SearchOptions } from 'ldapjs';
import { ILdapConfig, IUser } from './interfaces';

export const user: IUser = {
  password: 'password',
  username: 'user',
  mail: 'joe@email',
  telephoneNumber: '123456789',
  givenName: 'John',
  sn: 'Snow',
  displayName: 'SNOW John',
  memberOf: ['CN=Admins,CN=Groups,DC=example,DC=com', 'CN=Audit,CN=Groups,DC=example,DC=com'],
  userPrincipalName: 'user@example.com',
  distinguishedName: 'CN=John Snow, CN=Users, DC=example, DC=com',
};

export const optionsMock: SearchOptions = {
  filter: '(&(objectCategory=person)(objectClass=user)(sAMAccountName=?))',
  scope: 'sub',
  attributes: ['distinguishedName', 'memberOf', 'givenName', 'sn', 'mail', 'telephoneNumber', 'userPrincipalName'],
};

export const ldapMockSettings: ILdapConfig = {
  serverUrl: ['ldap://0.0.0.0:1234'],
  suffix: 'DC=example, DC=com',
  usersBaseDN: 'CN=Users,DC=example,DC=com',
  bindDN: 'CN=Administrator,CN=Users,DC=example,DC=com',
  bindPwd: 'ldap-password',
};
