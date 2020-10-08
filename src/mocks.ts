import { ILdapService, ILdapServiceAccount, ILdapUserAccount, IOpenLdapService } from './interfaces';
import { Either, Left, Right } from './tools';
import { ILdapUserSearch } from './activeDirectory/activeDirectoryClient';

export const user: ILdapUserAccount = {
    username: 'user',
    email: 'joe@email',
    phone: '123456789',
    firstName: 'John',
    lastName: 'Snow',
    groups: ['CN=Admins,CN=Users,DC=ibsng,DC=local'],
    objectSid: 'external object SID',
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

export const ldapClientMock = (): ILdapService => ({
    search: async (username: string, options: ILdapUserSearch) => { return Left(new Error('TODO: not implemented yet')); },
    login: async (username: string, password: string): Promise<Either<Error, ILdapUserAccount>> => {
        return username === user.username && password === user1.password ? Right(user) : Left(new Error('clientMock no user found'));
    },
});

export const openLdapClientMock = (): IOpenLdapService => ({
    login: async (username: string, password: string): Promise<Either<Error, ILdapServiceAccount>> => {
        return username === serviceAccountMock.username && password === serviceAccountMock.password
            ? Right({ username: serviceAccountMock.username, objectSid: serviceAccountMock.objectSid })
            : Left(new Error('clientMock no user found'));
    },
});
