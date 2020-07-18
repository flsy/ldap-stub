import { ILdapConfig, ILdapUserAccount, OpenLdapServerConfig } from './interfaces';
import { ActiveDirectoryServer } from './activeDirectory/activeDirectoryServer';
import { openLdapServer } from './openLdap/openLdapServer';

interface IUser extends ILdapUserAccount {
    password: string;
}

export const serverMock = (port: number, config: ILdapConfig, user: IUser): Promise<{ close: () => void }> =>
    new Promise((resolve) => {
        const server = ActiveDirectoryServer({
            suffix: config.suffix,
            bindDN: config.bindDN,
            bindPassword: config.bindPwd,
            users: [
                {
                    firstName: user.firstName,
                    lastName: user.lastName,
                    password: user.password,
                    username: user.username,
                    memberOf: user.groups,
                    phone: user.phone,
                    email: user.email,
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
