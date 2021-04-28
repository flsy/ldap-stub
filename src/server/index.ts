import { getEnvNumberVariable, getEnvVariable } from './env';
import { ActiveDirectoryServer } from '../activeDirectory/activeDirectoryServer';
import { logger } from '../tools';

const server = ActiveDirectoryServer({
  suffix: getEnvVariable('LDAP_SUFFIX'),
  bindDN: getEnvVariable('LDAP_BIND_DN'),
  bindPassword: getEnvVariable('LDAP_BIND_PASSWORD'),
  usersBaseDN: getEnvVariable('LDAP_USERS_BASE_DN'),
  users: JSON.parse(getEnvVariable('LDAP_USERS').trim()) || [],
  logger,
});

server.listen(getEnvNumberVariable('LDAP_PORT'), () => {
  logger('info', 'STUB-LDAP server up at:', server.url);
});
