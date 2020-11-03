import { bind, getAttribute, getAttributes, getClient, getSearchResult, getUserAttributes, getValues } from '../methods';
import { ILdapConfig, ILdapService, IOptions, IMinimalAttributes } from '../interfaces';
import { head, isLeft, Left, logger, Right } from '../tools';

export const activeDirectoryClient = (config: ILdapConfig): ILdapService => ({
  login: async <T extends IMinimalAttributes>(username, password, options: IOptions<T>) => {
    try {
      const client = await getClient({ url: config.serverUrl, timeout: 1000, connectTimeout: 1000 });
      if (isLeft(client)) {
        logger('error', 'ldapService', client.value.message);
        return client;
      }

      await bind(client.value, config.bindDN, config.bindPwd);

      const results = await getSearchResult(client, config, username, options);

      if (results.length !== 1) {
        return Left(new Error(`No unique user to bind, found ${results.length} users`));
      }

      const { objectName, attributes } = head(results);
      const attrs = getAttributes(attributes);
      const userAttributes = getUserAttributes(options, attrs);
      const distinguishedName = getAttribute('distinguishedName', attrs);

      if (!distinguishedName && !objectName) {
        return Left(new Error(`No "objectName" or "distinguishedName" attribute found`));
      }

      const dn = head(distinguishedName) || objectName;
      await bind(client.value, dn, password);

      logger('debug', 'ldapService', 'login successful', { username });

      return Right({
        username,
        ...userAttributes,
        distinguishedName: dn,
      });
    } catch (error) {
      logger('error', 'ldapService', error.message);
      return Left(error);
    }
  },
  search: async <T>(username, options: IOptions<T>) => {
    try {
      const client = await getClient({ url: config.serverUrl, timeout: 1000, connectTimeout: 1000 });
      if (isLeft(client)) {
        return client;
      }

      await bind(client.value, config.bindDN, config.bindPwd);

      const results = await getSearchResult(client, config, username, options);

      if (results.length === 0) {
        return Right([]);
      }

      const data = results.map((r) => {
        const attrs = getAttributes(r.attributes);
        return options.attributes.reduce((all, current) => {
          const value = attrs.find((a) => a.type === current);
          return { ...all, [current]: getValues(value) };
        }, {});
      });

      return Right(data as T[]);
    } catch (error) {
      logger('error', 'ldapService', error.message);
      return Left(error);
    }
  },
});
