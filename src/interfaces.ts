import { Either } from './tools';

export interface ILdapUserAccount {
    objectSid: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    groups: string[];
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
}

export interface IOpenLdapService {
    login: (username: string, password: string) => Promise<Either<Error, ILdapServiceAccount>>;
}