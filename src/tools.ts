import { isLeft, Left, Maybe, Right } from 'fputils';
import { IUser } from './interfaces';
import fs from 'fs';

interface ParseUsers {
  users: Maybe<IUser[]>;
  logMessage: string;
}

export const logger = (type: 'info' | 'error' | 'debug', ...args: any[]) => console.log(new Date().toISOString(), `[${type}]`, ...args);

export const notEmpty = <TValue>(value: TValue | null | undefined): value is TValue => value !== null && value !== undefined;

export const parseJson = (content?: string): Maybe<IUser[]> => {
  try {
    return content && Right(JSON.parse(content.trim()));
  } catch (e) {
    return Left(e);
  }
};

const isUserConfigEnvSet = (ldapUsersEnv?: string, usersConfigFileEnv?: string): boolean => !!ldapUsersEnv || !!usersConfigFileEnv;

const parseUsers = (ldapUsersEnv?: string, usersConfigFileEnv?: string): ParseUsers => {
  const shouldLoadFromFile = !!usersConfigFileEnv;

  if (shouldLoadFromFile) {
    return { users: parseJson(fs.readFileSync(usersConfigFileEnv, { encoding: 'utf8' })), logMessage: 'Failed to parse USERS_CONFIG_FILE file.' };
  }

  return { users: parseJson(ldapUsersEnv), logMessage: 'Failed to parse users from environment variable LDAP_USERS' };
};

export const getUsers = (): Maybe<IUser[]> => {
  const ldapUsersEnv = process.env['LDAP_USERS'];
  const usersConfigFileEnv = process.env['USERS_CONFIG_FILE'];

  if (!isUserConfigEnvSet(ldapUsersEnv, usersConfigFileEnv)) {
    logger('info', 'LDAP_USERS neither USERS_CONFIG_FILE environment variable set.');
    return Right([]);
  }

  const { users, logMessage } = parseUsers(ldapUsersEnv, usersConfigFileEnv);

  if (isLeft(users)) {
    logger('error', logMessage);
    return users;
  }

  if (!Array.isArray(users.value)) {
    logger('error', 'User configuration is not array.');
    return Left(new Error(`Users configuration is not array. Received: ${JSON.stringify(users.value)}`));
  }

  return users;
};
