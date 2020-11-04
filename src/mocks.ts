import { ILdapService, ILdapServiceAccount, ILdapUserAccount, IOpenLdapService, IOptions } from './interfaces';
import { Either, Left, Right } from './tools';

interface IResult {
  distinguishedName: string;
  memberOf: string | string[];
  givenName: string;
  sn: string;
  mail: string;
  telephoneNumber: string;
  userPrincipalName: string;
}

export const user: ILdapUserAccount = {
  username: 'user',
  mail: 'joe@email',
  telephoneNumber: '123456789',
  givenName: 'John',
  sn: 'Snow',
  memberOf: ['CN=Admins,CN=Groups,DC=example,DC=com', 'CN=Audit,CN=Groups,DC=example,DC=com'],
  userPrincipalName: 'joe@email',
};

export const user1 = {
  ...user,
  password: 'password',
};

export const serviceAccountMock = {
  objectSid: '8000',
  username: 'service_1',
  password: 'password',
};

// todo - implement(export) or remove
export const ldapClientMock = (): ILdapService => ({
  search: async (username, options) => {
    return Left(new Error('TODO: not implemented yet'));
  },
  login: async (username, password, options) => {
    return username === user.username && password === user1.password ? Right(user as any) : Left(new Error('clientMock no user found'));
  },
});

// todo - implement(export) or remove
export const openLdapClientMock = (): IOpenLdapService => ({
  login: async (username: string, password: string): Promise<Either<Error, ILdapServiceAccount>> => {
    return username === serviceAccountMock.username && password === serviceAccountMock.password
      ? Right({ username: serviceAccountMock.username, objectSid: serviceAccountMock.objectSid })
      : Left(new Error('clientMock no user found'));
  },
});

export const optionsMock = (imperatives?: Partial<IOptions<IResult>>): IOptions<IResult> => ({
  filter: '(&(objectCategory=person)(objectClass=user)(sAMAccountName={0}))',
  scope: 'sub',
  attributes: ['distinguishedName', 'memberOf', 'givenName', 'sn', 'mail', 'telephoneNumber', 'userPrincipalName'],
  ...imperatives,
});
