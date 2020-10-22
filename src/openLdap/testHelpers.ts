import { OpenLdapServerConfig } from '../interfaces';
import { openLdapServer } from './openLdapServer';

export const openLdapServerMock = (config: OpenLdapServerConfig, port: number): Promise<{ close: () => void }> =>
  new Promise((resolve) => {
    const server = openLdapServer(config);

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
