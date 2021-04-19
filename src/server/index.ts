import { getEnvNumberVariable, getEnvVariable } from './env';
import { ActiveDirectoryServer } from '../activeDirectory/activeDirectoryServer';
import { logger } from '../tools';

const port = getEnvNumberVariable('LDAP_PORT');
const BIND_DN = getEnvVariable('LDAP_BIND_DN');
const BIND_PASSWORD = getEnvVariable('LDAP_BIND_PASSWORD');
const SUFFIX = getEnvVariable('LDAP_SUFFIX');
const USERS = JSON.parse(getEnvVariable('LDAP_USERS').trim()) || [];
const LDAP_USERS_BASE_DN = getEnvVariable('LDAP_USERS_BASE_DN');

const server = ActiveDirectoryServer({
  suffix: SUFFIX,
  bindDN: BIND_DN,
  bindPassword: BIND_PASSWORD,
  usersBaseDN: LDAP_USERS_BASE_DN,
  users: USERS,
  logger: console.log,
});

server.listen(port, () => {
  logger('info', 'STUB-LDAP server up at:', server.url);
});
