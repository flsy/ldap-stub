import { ILdapConfig } from '../interfaces';
import { ActiveDirectoryServer } from './activeDirectoryServer';

export const serverMock = (port: number, config: ILdapConfig): Promise<{ close: () => void }> =>
  new Promise((resolve) => {
    const server = ActiveDirectoryServer({
      logger: console.log,
      suffix: config.suffix,
      bindDN: config.bindDN,
      bindPassword: config.bindPwd,
      usersBaseDN: config.usersBaseDN,
    });

    server.listen(port, () => {
      // logger('info', 'stub-ldap server up at:', server.url);
      resolve({
        close: () => {
          // eslint-disable-next-line
          // @ts-ignore
          server.close();
        },
      });
    });
  });

export const setUserConfigFileEnv = () => (process.env['USERS_CONFIG_FILE'] = 'src/activeDirectory/__tests__/__mocks__/mockUsers.json');
