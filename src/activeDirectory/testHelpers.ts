import { ILdapConfig, ILdapUserAccount } from '../interfaces';
import { ActiveDirectoryServer } from './activeDirectoryServer';

interface IUser extends ILdapUserAccount {
  password: string;
}

export const serverMock = (
  port: number,
  config: ILdapConfig,
  { sn, givenName, userPrincipalName, memberOf, telephoneNumber, username, password, mail }: IUser,
): Promise<{ close: () => void }> =>
  new Promise((resolve) => {
    const server = ActiveDirectoryServer({
      suffix: config.suffix,
      bindDN: config.bindDN,
      bindPassword: config.bindPwd,
      users: [
        {
          givenName,
          sn,
          password,
          username,
          memberOf,
          telephoneNumber,
          mail,
          userPrincipalName,
        },
      ],
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
