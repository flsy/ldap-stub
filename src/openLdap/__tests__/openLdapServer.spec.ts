import { openLdapServerMock } from '../testHelpers';
import { IOpenLdapConfig, OpenLdapServerConfig } from '../../interfaces';
import { isLeft, isRight } from '../../tools';
import { openLdapClient } from '../openLdapClient';

const account = { id: '9000', username: 'service_1', password: 'password' };
const port = 5389;
const openLdapConfig: IOpenLdapConfig = {
    serverUrl: `ldap://localhost:${port}`,
    bindUser: {
        username: 'ldapadm',
        password: 'oldap',
    },
    dc: ['plgr', 'local'],
};

const config: OpenLdapServerConfig = {
    bindUser: {
        username: 'ldapadm',
        password: 'oldap',
    },
    dc: ['plgr', 'local'],
    accounts: [account],
};

describe('openLDAP server', () => {
    it('returns error when provided user credentials are incorrect', async () => {
        const server = await openLdapServerMock(config, port);
        const result = await openLdapClient(openLdapConfig).login('unknown', 'xx');
        await server.close();

        expect(isLeft(result)).toEqual(true);
        // expect(result.value).toEqual(new ldap.InvalidCredentialsError());
        expect(result.value).toEqual(new Error('No unique user to bind, found 0 users'));
    });

    it('returns account details when all goes right', async () => {
        const server = await openLdapServerMock(config, port);
        const result = await openLdapClient(openLdapConfig).login(account.username, account.password);
        await server.close();

        expect(isRight(result)).toEqual(true);
        expect(result.value).toEqual({
            objectSid: account.id,
            username: account.username,
        });
    });
});
