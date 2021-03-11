import ldap from 'ldapjs';
import { logger } from '../tools';
import { OpenLdapServerConfig } from '../interfaces';
import { Optional } from 'fputils';

const parseUsername = (cn: string): Optional<string> => {
  const a = cn
    .toLowerCase()
    .split(',')
    .map((r) => r.trim())
    .find((r) => r.split('=')[0] === 'cn');
  if (!a) return;
  const [, username] = a.split('=');
  return username;
};

export const openLdapServer = (config: OpenLdapServerConfig) => {
  const server = ldap.createServer();

  const suffix = config.dc.map((bit) => `DC=${bit}`).join(',');
  const baseDN = config.dc.map((bit) => `DC=${bit}`).join(', ');
  const bindDN = `CN=${config.bindUser.username},${suffix}`;
  const bindPwd = config.bindUser.password;

  server.bind(suffix, (req: any, res: any, next: any) => {
    const dn = req.dn.toString();
    const password = req.credentials;

    const username = parseUsername(dn);

    const bindUsername = parseUsername(bindDN);
    logger('info', 'bind for', { username, bindDN, bindUsername });

    if (config.accounts.find((acc) => acc.username === username && acc.password === password)) {
      res.end();
      return next();
    }
    if (username === bindUsername && password === bindPwd) {
      res.end();
      return next();
    }

    logger('info', 'invalid credentials');
    return next(new ldap.InvalidCredentialsError());
  });

  const authorize = (req: any, _: any, next: any) => {
    const binddn = req.connection.ldap.bindDN;

    logger('info', 'authorize', { binddn: binddn.toString() });
    if (!binddn.equals(bindDN)) {
      logger('debug', 'insufficient access rights');
      return next(new ldap.InsufficientAccessRightsError());
    }

    return next();
  };

  server.search(suffix, authorize, (req: any, res: any) => {
    const { filters } = req.filter.json;
    logger('info', 'search for:', req.filter.toString());

    const uid = filters.find((filter: any) => filter.json.attribute === 'uid');
    if (uid) {
      const account = config.accounts.find((acc) => acc.username === uid.json.value);
      if (account) {
        res.send({
          dn: `cn=${account.username}, ${baseDN}`,
          attributes: {
            gidNumber: account.id,
          },
        });
      }
    }
    res.end();
  });
  return server;
};
