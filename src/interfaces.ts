import { Either } from './tools';

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

export interface IOptions<T> {
  filter: string;
  attributes: Array<keyof T>;
  scope?: 'sub' | 'one' | 'base';
}

export interface IMinimalAttributes {
  distinguishedName: string;
}

export interface ILdapService {
  login: <T extends IMinimalAttributes>(username: string, password: string, options?: IOptions<T>) => Promise<Either<Error, T>>;
  search: <T>(username: string, options: IOptions<T>) => Promise<Either<Error, T[]>>;
}

export interface IOpenLdapService {
  login: (username: string, password: string) => Promise<Either<Error, ILdapServiceAccount>>;
}
