import { ILdapServiceAccount, IOpenLdapConfig, IOpenLdapService } from '../interfaces';
import { bind, getAttribute, getAttributes, getClient, search } from '../methods';
import { logger } from '../tools';
import { isLeft, Left, Maybe, Right, head } from 'fputils';

export const openLdapClient = (config: IOpenLdapConfig): IOpenLdapService => {
  const suffix = config.dc.map((bit) => `DC=${bit}`).join(',');
  const bindDN = `CN=${config.bindUser.username},${suffix}`;
  const bindPwd = config.bindUser.password;

  return {
    login: async (username: string, password: string): Promise<Maybe<ILdapServiceAccount>> => {
      try {
        const client = await getClient({ url: config.serverUrl, timeout: 1000, connectTimeout: 1000 });
        if (isLeft(client)) {
          return client;
        }

        logger('debug', 'bind with bindDN:', bindDN);
        const bindResult = await bind(client.value, bindDN, bindPwd);
        if (isLeft(bindResult)) {
          logger('error', 'bind error:', bindResult.value.message);
          return bindResult;
        }
        logger('debug', 'bind with bindDN ok');

        // search for user
        const results = await search(client.value, suffix, {
          filter: `(&(objectClass=posixAccount)(uid=${username}))`,
          scope: 'sub',
        });
        if (isLeft(results)) {
          return Left(new Error(`search error: ${results.value.message}`));
        }

        if (results.value.length !== 1) {
          return Left(new Error(`No unique user to bind, found ${results.value.length} users`));
        }

        const { objectName, attributes } = head(results.value);
        const attrs = getAttributes(attributes);

        // console.log(attrs);
        const gidNumber = getAttribute('gidNumber', attrs);
        if (!gidNumber) {
          return Left(new Error(`No "gidNumber" attribute found in ${JSON.stringify(attrs)} attributes`));
        }

        if (!objectName) {
          return Left(new Error('no objectName field'));
        }

        const objectBindResult = await bind(client.value, objectName, password);
        if (isLeft(objectBindResult)) {
          logger('error', 'bind error:', objectBindResult.value.message);
          return objectBindResult;
        }

        // search for groups a user is a member of
        // const groupResults = await search(client.value, config.suffix, {
        //   filter: `(&(objectClass=posixGroup)(memberUid=${username}))`,
        //   attributes: ['cn'],
        //   scope: 'sub',
        // });
        // const groups = flatten(groupResults.map(({ attributes }) => flatten(attributes.map(({ json }) => json.vals))));

        return Right({
          objectSid: gidNumber[0],
          username,
          // groups,
        });
      } catch (error) {
        return Left(error);
      }
    },
  };
};
