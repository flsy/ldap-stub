import ldap from 'ldapjs';
import { Attribute, Client, ClientOptions, SearchEntry, SearchOptions } from 'ldapjs';
import { conditionally, logger, notEmpty } from './tools';
import { ILdapConfig } from './interfaces';
import { Either, isLeft, Left, Right, find, map, propEq, toArray, untilNotRight } from 'fputils';

export const getGroups = (values: string[]): string[] => {
  try {
    return values
      .map((row) => {
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

const connect = async (options: ClientOptions): Promise<Either<Error, Client>> => {
  return new Promise((resolve) => {
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
};

interface IGetClient extends Omit<ClientOptions, 'url'> {
  url: string | string[];
}

export const getClient = async (options: IGetClient): Promise<Either<Error, Client>> => {
  return conditionally(
    Array.isArray,
    (urls: string[]) => untilNotRight(urls.map((url) => connect({ url, timeout: 1000, connectTimeout: 1000 }))),
    (url: string) => connect({ url, timeout: 1000, connectTimeout: 1000 }),
  )(options.url);
};

export const bind = (client: Client, username: string, password: string): Promise<Either<Error, void>> =>
  new Promise((resolve) => {
    client.bind(username, password, (error) => {
      if (error) {
        logger('error', 'ldap bind', error.message);
        return resolve(Left(error));
      }
      resolve(Right(undefined));
    });
  });

export const search = (client: Client, base: string, options: SearchOptions): Promise<Either<Error, SearchEntry[]>> =>
  new Promise((resolve) => {
    try {
      client.search(base, options, (error, result) => {
        if (error) {
          logger('error', 'ldap search', error.message);
          return resolve(Left(error));
        }

        const searchList: SearchEntry[] = [];

        result.on('searchEntry', (entry) => {
          searchList.push(entry);
        });

        result.on('error', (err) => {
          // LDAP_NO_SUCH_OBJECT
          if (err.code === 32) {
            return resolve(Right([]));
          }
          logger('error', 'ldap search error', err.message);
          return resolve(Left(err));
        });

        result.on('end', () => {
          logger('debug', 'ldap search end', base, 'results:', searchList.length);
          resolve(Right(searchList));
        });
      });
    } catch (error) {
      logger('error', 'ldap search catch error', base, error.message);
      return resolve(Right([]));
    }
  });

export const bindAndSearch = async (client: Client, config: ILdapConfig, options?: SearchOptions): Promise<Either<Error, SearchEntry[]>> => {
  const bindResult = await bind(client, config.bindDN, config.bindPwd);
  if (isLeft(bindResult)) {
    logger('error', 'ldapService', bindResult.value.message);
    return bindResult;
  }

  const results = await search(client, config.suffix, options);
  if (isLeft(results)) {
    return Left(new Error(`Search error: ${results.value.message}`));
  }
  return results;
};

type Attr = { type: string; vals: string[] };
export const getAttributes = map<Attribute, Attr>((raw) => JSON.parse(raw.toString()));

export const getAttribute = <T>(type: keyof T, attributes: Attr[]): string[] => {
  const result = find(propEq('type', type), attributes);
  return result ? result.vals : [];
};

export const getUserAttributes = (options: SearchOptions, ldapAttributes: Attr[]) =>
  toArray(options.attributes).reduce((acc, curr) => {
    const attribute = getAttribute(curr, ldapAttributes);
    if (attribute.length === 0) {
      return acc;
    }
    return { ...acc, [curr]: attribute };
  }, {});

export const searchResult = (entries: SearchEntry[], attributes: SearchOptions['attributes']): Array<{ [key: string]: Attr }> =>
  entries.map((r) => {
    const attrs = getAttributes(r.attributes);

    return toArray(attributes).reduce((all, current) => {
      const value = attrs.find((a) => a.type === current);

      if (!value?.vals) return all;

      return { ...all, [current]: value.vals };
    }, {});
  });
