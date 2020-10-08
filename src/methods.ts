import ldap from 'ldapjs';
import { Attribute, Client, ClientOptions, SearchEntry, SearchOptions } from 'ldapjs';
import { Either, Left, logger, Optional, Right } from './tools';

export const getClient = (options: ClientOptions): Promise<Either<Error, Client>> =>
    new Promise((resolve) => {
        const client = ldap.createClient(options);

        client.on('connect', () => {
            logger('debug', 'ldap connected', options.url);

            resolve(Right(client));
        });

        client.on('timeout', (error) => {
            logger('error', 'ldap timeout', error.message);
            resolve(Left(error));
        });

        client.on('connectTimeout', (error) => {
            logger('error', 'ldap connectTimeout', error.message);
            resolve(Left(error));
        });

        client.on('error', (error) => {
            logger('error', 'ldap error', error.message);
            client.unbind();
            // client.destroy();

            resolve(Left(error));
        });
    });

export const bind = (client: Client, username: string, password: string): Promise<void> =>
    new Promise((resolve, reject) => {
        client.bind(username, password, (error) => {
            if (error) {
                logger('error', 'ldap bind', error.message);
                return reject(error);
            }
            resolve();
        });
    });

export const search = (client: Client, base: string, options: SearchOptions): Promise<SearchEntry[]> =>
    new Promise((resolve, reject) => {
        client.search(base, options, (error, result) => {
            if (error) {
                logger('error', 'ldap search', error.message);
                return reject(error);
            }

            const searchList: SearchEntry[] = [];

            result.on('searchEntry', (entry) => {
                searchList.push(entry);
            });

            result.on('error', (err) => {
                logger('error', 'ldap search error', err.message);
                return reject(err);
            });

            result.on('end', () => {
                logger('debug', 'ldap search end', base, 'results:', searchList.length);
                resolve(searchList);
            });
        });
    });

type Attr = { type: string; vals: string[] };
export const getAttributes = (attributes: Attribute[]): Attr[] => attributes.map((raw) => JSON.parse(raw.toString()));

export const getAttribute = (type: string, attributes: Attr[]): Optional<string[]> => {
    const result = attributes.find((a) => a.type === type);
    return result ? result.vals : undefined;
};
