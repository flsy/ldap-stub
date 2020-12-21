import ldap from 'ldapjs';
import { head, Optional } from '../tools';
import { IUser } from '../interfaces';

const lower = (dnBit: string) => (type: 'DC=' | 'CN=' | 'OU=') => dnBit.replace(type, type.toLowerCase());

const lowerDnBit = (dnBit: string) => {
  if (dnBit.startsWith('DC=')) {
    return lower(dnBit)('DC=');
  }
  if (dnBit.startsWith('OU=')) {
    return lower(dnBit)('OU=');
  }
  if (dnBit.startsWith('CN=')) {
    return lower(dnBit)('CN=');
  }
  return dnBit;
};

const lowercaseDn = (suffix: string) =>
  suffix
    .split(',')
    .map((value) => lowerDnBit(value.trim()))
    .join(', ');

export const ActiveDirectoryServer = (adArgs: { bindDN: string; bindPassword: string; suffix: string; users: IUser[]; usersBaseDN: string; logger?: (...args: any[]) => void }) => {
  const server = ldap.createServer();

  const logger = adArgs.logger ? adArgs.logger : () => null;

  server.bind(adArgs.bindDN, (req: any, res: any, next: any) => {
    logger('info', 'BIND_DN bind for', { dn: req.dn.toString() });

    if (!req.dn.equals(adArgs.bindDN) || req.credentials !== adArgs.bindPassword) {
      logger('error', 'INVALID_CREDENTIALS', adArgs, req.credentials);
      return next(new ldap.InvalidCredentialsError());
    }

    res.end();
    return next();
  });

  server.bind(adArgs.suffix, (req: any, res: any, next: any) => {
    const dn = req.dn.toString();
    logger('info', 'SUFFIX bind for', { dn });

    const user = adArgs.users.find((u) => {
      const x = `cn=${u.givenName} ${u.sn}, ${lowercaseDn(adArgs.usersBaseDN)}`;
      return dn === x && u.password === req.credentials;
    });

    if (!user) {
      return next(new ldap.InvalidCredentialsError());
    }

    res.end();
    return next();
  });

  const authorize = (req: any, _: any, next: any) => {
    const binddn = req.connection.ldap.bindDN;
    if (!binddn.equals(adArgs.bindDN)) {
      return next(new ldap.InsufficientAccessRightsError());
    }

    return next();
  };

  const getAttribute = (filter): Optional<string> => {
    const match = filter.match(/samaccountname/gm) || filter.match(/userprincipalname/gm);
    return head(match);
  };

  const getUsername = (filter: string, attribute: string): Optional<string> => {
    const f = filter.split('(').find((s: string) => s.startsWith(attribute));
    if (!f) return;
    const r = f.split(')')[0];
    if (!r) return;

    const result = r.split('=')[1];

    if (attribute === 'userprincipalname') {
      return result.split('@')[0];
    }
    return result;
  };

  server.search(adArgs.suffix, authorize, (req: any, res: any, next: any) => {
    const dn = req.dn.toString();
    const filter = req.filter.toString();

    const username = getUsername(filter, getAttribute(filter));

    const user = adArgs.users.find((u) => u.username === username);

    logger('info', 'search for:', username);
    if (!user) {
      return next(new ldap.NoSuchObjectError(dn));
    }

    const obj = {
      dn: req.dn.toString(),
      attributes: {
        distinguishedName: `CN=${user.givenName} ${user.sn},${adArgs.usersBaseDN}`,
        memberOf: user.memberOf,
        givenName: user.givenName,
        sn: user.sn,
        mail: user.mail,
        telephoneNumber: user.telephoneNumber,
        userPrincipalName: user.userPrincipalName,
      },
    };
    res.send(obj);
    res.end();
  });
  return server;
};
