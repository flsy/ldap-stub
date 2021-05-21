import { SearchOptions } from 'ldapjs';
import { Maybe } from 'fputils';

interface ILdapUserAccount {
  username: string;
  givenName: string;
  sn: string;
  displayName?: string;
  mail?: string;
  telephoneNumber?: string;
  memberOf: string | string[];
  userPrincipalName: string;
}

export interface IUser extends ILdapUserAccount {
  password: string;
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
  usersBaseDN: string;
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
  login: <T>(password: string, options?: SearchOptions) => Promise<Maybe<T>>;
  search: <T>(options: SearchOptions) => Promise<Maybe<T[]>>;
}

export interface IOpenLdapService {
  login: (username: string, password: string) => Promise<Maybe<ILdapServiceAccount>>;
}

export interface ActiveDirectoryServerArgs {
  bindDN: string;
  bindPassword: string;
  suffix: string;
  usersBaseDN: string;
  logger?: (...args: any[]) => void;
}
