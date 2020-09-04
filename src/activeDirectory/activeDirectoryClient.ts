import { bind, getAttribute, getAttributes, getClient, search } from '../methods';
import { ILdapConfig, ILdapService, ILdapUserAccount } from '../interfaces';
import { Either, isLeft, Left, logger, Right } from '../tools';
import { user } from '../mocks';

export interface ILdapUserSearch {
    filter: string;
    attributes: string;
    scope?: 'base' | 'one' | 'sub';
}


const notEmpty = <TValue>(value: TValue | null | undefined): value is TValue => {
    return value !== null && value !== undefined;
};

const getDN = (values: string[]): string => values[0];

export const getGroups = (values: string[]): string[] => {
    try {
        return values
            .map((row: string) => {
                const cn = row.split(',').find((r) => {
                    const [name] = r.split('=');
                    return name.toUpperCase() === 'CN';
                });

                if (cn) {
                    const [, value] = cn.split('=');
                    return value;
                }
                return undefined;
            })
            .filter(notEmpty);
    } catch (error) {
        logger('error', 'ldap get groups', error.message);
        return [];
    }
};

export const activeDirectoryClient = (config: ILdapConfig): ILdapService => ({
    login: async (username: string, password: string): Promise<Either<Error, ILdapUserAccount>> => {
        try {
            const client = await getClient({ url: config.serverUrl, timeout: 1000, connectTimeout: 1000 });
            if (isLeft(client)) {
                logger('error', 'ldapService', client.value.message);
                return client;
            }

            await bind(client.value, config.bindDN, config.bindPwd);
            // logger('debug', '1. bind ok with', config.bindDN);

            const results = await search(client.value, config.suffix, {
                filter: '(&(objectCategory=person)(objectClass=user)(sAMAccountName={0}))'.replace('{0}', username),
                scope: 'sub',
                attributes: ['memberOf', 'distinguishedName'],
            });

            if (results.length !== 1) {
                return Left(new Error(`No unique user to bind, found ${results.length} users`));
            }

            // logger('debug', 'search result objectName', results[0].objectName);
            // logger('debug', 'search result attributes', results[0].attributes);

            const { objectName, attributes } = results[0];
            const attrs = getAttributes(attributes);
            const memberOf = getAttribute('memberOf', attrs);
            const distinguishedName = getAttribute('distinguishedName', attrs);

            // logger('debug', 'attribute: memberOf', memberOf);
            // logger('debug', 'attribute: distinguishedName', distinguishedName);

            if (!distinguishedName && !objectName) {
                return Left(new Error(`No "objectName" or "distinguishedName" attribute found`));
            }

            const dn = distinguishedName ? getDN(distinguishedName) : objectName;

            // logger('debug', '2. bind request with', dn);
            await bind(client.value, dn as string, password);

            // logger('debug', 'parsing groups from raw input:', memberOf);
            const groups = memberOf ? getGroups(memberOf) : [];

            logger('debug', 'ldapService', 'login successful', { username, groups });

            // TODO: use real details
            return Right(user);
        } catch (error) {
            logger('error', 'ldapService', error.message);
            return Left(error);
        }
    },
    search: async (username: string, options: ILdapUserSearch): Promise<Either<Error, object>> => {
        try {
            const client = await getClient({ url: config.serverUrl, timeout: 1000, connectTimeout: 1000 });
            if (isLeft(client)) {
                // log('error', 'ldapService client error:', client.value.message)
                return client;
            }

            await bind(client.value, config.bindDN, config.bindPwd);
            // log('debug', 'bind ok with', config.bindDN)

            const attributes = options.attributes.split(',').map(e => {
                const [name, label] = e.split(':');
                return {name, label}
            })

            const searchOptions = {
                filter: options.filter.split('{0}').join(username),
                attributes: attributes.map(a => a.name),
                scope: options.scope,
            };

            // log('debug', JSON.stringify(searchOptions));
            const columns = attributes
            try {
                const results = await search(client.value, config.suffix, searchOptions);
                if (results.length === 0) {
                    return Right({ columns, data: [] });
                }

                const data = results.map(r => {
                    const attrs = getAttributes(r.attributes);
                    return attributes.reduce((all, current) => {
                        const value = attrs.find(a => a.type === current.name);
                        return {
                            ...all,
                            [current.name]: value ? value.vals[0] : ''
                        }
                    }, {});
                });



                // log('debug', results.length, 'search results')

                return Right({ columns, data });
            } catch(e) {
                return Right({ columns, data: [] });
            }
        } catch (error) {
            // log('error', 'ldapService error:', error.message);
            return Left(error);
        }
    }
});
