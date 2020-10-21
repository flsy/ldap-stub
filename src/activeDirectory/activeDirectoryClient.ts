import {bind, getAttribute, getAttributes, getClient, getGroups, getSearchResult, getValues, search} from '../methods';
import { ILdapConfig, ILdapService, IOptions, IMinimalAttributes } from '../interfaces';
import { Either, head, isLeft, Left, logger, Right } from '../tools';

export const activeDirectoryClient = (config: ILdapConfig): ILdapService => ({
    login: async <T extends IMinimalAttributes>(username, password, options: IOptions<T>) => {
        try {
            const client = await getClient({ url: config.serverUrl, timeout: 1000, connectTimeout: 1000 });
            if (isLeft(client)) {
                logger('error', 'ldapService', client.value.message);
                return client;
            }

            await bind(client.value, config.bindDN, config.bindPwd);
            // logger('debug', '1. bind ok with', config.bindDN);

            const results = await getSearchResult(client, config, username, options)

            if (results.length !== 1) {
                return Left(new Error(`No unique user to bind, found ${results.length} users`));
            }

            // logger('debug', 'search result objectName', results[0].objectName);
            // logger('debug', 'search result attributes', results[0].attributes);

            const { objectName, attributes } = head(results);
            const attrs = getAttributes(attributes);
            const userAttributes = options.attributes.reduce((curr, acc) => ({...curr, [acc]: head(getAttribute(acc, attrs))}), {} as T)
            const distinguishedName = getAttribute('distinguishedName', attrs);

            if (!distinguishedName && !objectName) {
                return Left(new Error(`No "objectName" or "distinguishedName" attribute found`));
            }

            const dn = head(distinguishedName) || objectName;
            // logger('debug', '2. bind request with', dn);
            await bind(client.value, dn, password);

            // logger('debug', 'parsing groups from raw input:', memberOf);

            const memberOf = userAttributes.memberOf ? { memberOf: getGroups(getAttribute('memberOf', attrs)) } : {};

            logger('debug', 'ldapService', 'login successful', { username }, );

            return Right({
                username,
                ...userAttributes,
                ...memberOf,
                distinguishedName: dn,
            });
        } catch (error) {
            logger('error', 'ldapService', error.message);
            return Left(error);
        }
    },
    search: async <T>(username: string, options: IOptions<T>): Promise<Either<Error, object>> => {
        try {
            const client = await getClient({ url: config.serverUrl, timeout: 1000, connectTimeout: 1000 });
            if (isLeft(client)) {
                // log('error', 'ldapService client error:', client.value.message)
                return client;
            }

            await bind(client.value, config.bindDN, config.bindPwd);
            // log('debug', 'bind ok with', config.bindDN)

            const attributes = (options.attributes as string[]).map((e) => {
                const [name, label] = e.split(':');
                return {name, label}
            })

            // log('debug', JSON.stringify(searchOptions));
            const columns = attributes
            try {
                const results = await getSearchResult(client, config, username, options)

                if (results.length === 0) {
                    return Right({ columns, data: [] });
                }

                const data = results.map(r => {
                    const attrs = getAttributes(r.attributes);
                    return attributes.reduce((all, current) => {
                        const value = attrs.find(a => a.type === current.name);
                        return {
                            ...all,
                            [current.name]: getValues(value)
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
