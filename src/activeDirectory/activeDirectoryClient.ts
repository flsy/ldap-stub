import { bind, bindAndSearch, searchResult, getAttribute, getAttributes, getClient, getUserAttributes } from '../methods';
import { ILdapConfig, ILdapService } from '../interfaces';
import { logger } from '../tools';
import { Maybe, isLeft, Left, Right, head } from 'fputils';

export const activeDirectoryClient = (config: ILdapConfig): ILdapService => ({
  login: async <T>(password, options): Promise<Maybe<T>> => {
    const client = await getClient({ url: config.serverUrl, timeout: 1000, connectTimeout: 1000 });

    if (isLeft(client)) {
      logger('error', 'ldapService', client.value.message);
      return client;
    }

    const results = await bindAndSearch(client.value, config, options);
    if (isLeft(results)) {
      return results;
    }

    if (results.value.length !== 1) {
      return Left(new Error(`No unique user to bind, found ${results.value.length} users`));
    }

    const { objectName, attributes } = head(results.value);
    const attrs = getAttributes(attributes);
    const userAttributes = getUserAttributes(options, attrs);

    // todo: overit tohle - nejsem si jistej jestli tohle tu ma byt
    const distinguishedName = getAttribute('distinguishedName', attrs);

    if (!head(distinguishedName) && !objectName) {
      return Left(new Error(`No "objectName" or "distinguishedName" attribute found`));
    }

    const dnBindResult = await bind(client.value, head(distinguishedName) || objectName, password);
    if (isLeft(dnBindResult)) {
      logger('error', 'ldapService', dnBindResult.value.message);
      return dnBindResult;
    }

    logger('debug', 'ldapService', 'login successful', options.filter);

    return Right(userAttributes as T);
  },
  search: async (options) => {
    const client = await getClient({ url: config.serverUrl, timeout: 1000, connectTimeout: 1000 });
    if (isLeft(client)) {
      return client;
    }

    const results = await bindAndSearch(client.value, config, options);
    if (isLeft(results)) {
      return results;
    }

    if (results.value.length === 0) {
      return Right([]);
    }

    return Right(searchResult(results.value, options.attributes));
  },
});
