import { SearchOptions } from 'ldapjs';
import { IUser } from './interfaces';

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
};

export const optionsMock = (imperatives?: Partial<SearchOptions>): SearchOptions => ({
  filter: '(&(objectCategory=person)(objectClass=user)(sAMAccountName=?))',
  scope: 'sub',
  attributes: ['distinguishedName', 'memberOf', 'givenName', 'sn', 'mail', 'telephoneNumber', 'userPrincipalName'],
  ...imperatives,
});
