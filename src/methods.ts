import ldap from 'ldapjs';
import { Attribute, Client, ClientOptions, SearchEntry, SearchOptions } from 'ldapjs';
import { Either, head, Left, logger, notEmpty, Optional, Right } from './tools';
import { IOptions } from './interfaces';

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

export const getAttribute = <T>(type: keyof T, attributes: Attr[]): Optional<string[]> => {
  const result = attributes.find((a) => a.type === type);
  return result ? result.vals : undefined;
};

export const getValues = (value: Attr): string | string[] => {
  if (!value.vals) return '';

  if (value.vals.length > 1) {
    return value.vals;
  }

  return value.vals[0];
};

export const getSearchResult = async (client, config, username, options) =>
  search(client.value, config.suffix, {
    filter: options.filter.split('{0}').join(username),
    scope: options.scope,
    attributes: options.attributes as string[],
  });

export const getUserAttributes = <T>(options: IOptions<T>, ldapAttributes: Attr[]) =>
  options.attributes.reduce((acc, curr) => {
    const attribute = getAttribute(curr, ldapAttributes);
    if (!attribute) {
      return acc;
    }
    return { ...acc, [curr]: attribute.length <= 1 ? head(attribute) : attribute };
  }, {});
