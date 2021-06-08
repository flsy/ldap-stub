import { Either, isArray, isLeft, Left, Maybe, Right } from 'fputils';
import { IUser } from './interfaces';
import fs from 'fs';

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
