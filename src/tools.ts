import { Either, isArray, isLeft, Left, Maybe, Optional, Right } from 'fputils';
import { IUser } from './interfaces';
import fs from 'fs';
import { NoSuchObjectError } from 'ldapjs';

interface ParsedConfig {
  users: IUser[];
  groups: IGroup[];
}

interface ParseConfig {
  config: Maybe<ParsedConfig>;
  logMessage: string;
}

export interface IGroup {
  name: string;
  children?: IGroup[];
}

export interface IGroupResult {
  name: string;
  memberOf?: string;
}

export const logger = (type: 'info' | 'error' | 'debug', ...args: any[]) => console.log(new Date().toISOString(), `[${type}]`, ...args);

export const notEmpty = <TValue>(value: TValue | null | undefined): value is TValue => value !== null && value !== undefined;

export const parseJson = (content?: string): Maybe<ParsedConfig> => {
  try {
    return content && Right(JSON.parse(content.trim()));
  } catch (e) {
    return Left(e);
  }
};

const isUserConfigEnvSet = (ldapUsersEnv?: string, usersConfigFileEnv?: string): boolean => !!ldapUsersEnv || !!usersConfigFileEnv;

const checkConfiguration = (config: ParsedConfig): Either<Error, void> => {
  if (!isArray(config.users)) {
    logger('error', 'User configuration is not array.');
    return Left(new Error(`User configuration is not array. Received: ${JSON.stringify(config)}`));
  }

  if (!isArray(config.groups)) {
    logger('error', 'Group configuration is not array.');
    return Left(new Error(`Group configuration is not array. Received: ${JSON.stringify(config)}`));
  }

  return Right(undefined);
};

const parseConfig = (ldapUsersEnv?: string, usersConfigFileEnv?: string): ParseConfig => {
  const shouldLoadFromFile = !!usersConfigFileEnv;

  if (shouldLoadFromFile) {
    return { config: parseJson(fs.readFileSync(usersConfigFileEnv, { encoding: 'utf8' })), logMessage: 'Failed to parse USERS_CONFIG_FILE file.' };
  }

  return { config: parseJson(ldapUsersEnv), logMessage: 'Failed to parse users from environment variable LDAP_USERS' };
};

export const getUsersAndGroups = (): Maybe<ParsedConfig> => {
  const ldapUsersEnv = process.env['LDAP_USERS'];
  const usersConfigFileEnv = process.env['USERS_CONFIG_FILE'];

  if (!isUserConfigEnvSet(ldapUsersEnv, usersConfigFileEnv)) {
    logger('info', 'LDAP_USERS neither USERS_CONFIG_FILE environment variable set.');
    return Right({ users: [], groups: [] });
  }

  const { config, logMessage } = parseConfig(ldapUsersEnv, usersConfigFileEnv);

  if (isLeft(config)) {
    logger('error', logMessage);
    return config;
  }

  const checkedConfiguration = checkConfiguration(config.value);
  if (isLeft(checkedConfiguration)) {
    return checkedConfiguration;
  }

  return config;
};

export const getGroupsFromConfig = (groups: IGroup[]): IGroupResult[] =>
  groups.reduce((acc, curr) => {
    if (curr.children) {
      const children = getGroupsFromConfig(curr.children).map((child) => ({ name: child.name, memberOf: child.memberOf || curr.name }));

      return [...acc, { name: curr.name }, ...children];
    }

    return [...acc, { name: curr.name }];
  }, [] as IGroupResult[]);

const getGroupFromFilter = (groupFilter: string): string =>
  groupFilter
    .split('(')
    .find((value) => value.toLowerCase().startsWith('cn='))
    .split(')')[0];

const findGroup = (groupName: string, groups: IGroup[]): Optional<IGroupResult> => {
  const parsed = getGroupsFromConfig(groups);
  return parsed.find((group) => group.name.toLowerCase() === groupName.toLowerCase());
};

export const getGroup = (searchFilter: string, groups: IGroup[]): Either<NoSuchObjectError, IGroupResult> => {
  const group = getGroupFromFilter(searchFilter);
  logger('info', 'group search for', group);

  const groupSearch = findGroup(group, groups);

  if (!groupSearch) {
    logger('error', 'Group not found', group);
    return Left(new NoSuchObjectError());
  }

  logger('info', `Group ${groupSearch.name} successfully found`);
  return Right(groupSearch);
};
