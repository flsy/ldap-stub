import { Either } from './tools';
import { ILdapUserSearch } from './activeDirectory/activeDirectoryClient';

export interface ILdapUserAccount {
    username: string;
    givenName: string;
    sn: string;
    mail?: string;
    telephoneNumber?: string;
    memberOf: string[];
    userPrincipalName: string;
}

export interface ILdapServiceAccount {
    objectSid: string;
    username: string;
}

export interface ILdapConfig {
    serverUrl: string;
    bindDN: string;
    bindPwd: string;
    suffix: string;
}

interface ICommonConfig {
    dc: string[]; // todo use OPEN_LDAP_SUFFIX instead of dc:
    bindUser: {
        username: string;
        password: string;
    };
}
export interface IOpenLdapConfig extends ICommonConfig {
    serverUrl: string;
}

export interface OpenLdapServerConfig extends ICommonConfig {
    accounts: Array<{ id: string; username: string; password: string }>;
}

export interface ILdapService {
    login: (username: string, password: string) => Promise<Either<Error, ILdapUserAccount>>;
    search: (username: string, options: ILdapUserSearch) => Promise<Either<Error, object>>;
}

export interface IOpenLdapService {
    login: (username: string, password: string) => Promise<Either<Error, ILdapServiceAccount>>;
}
