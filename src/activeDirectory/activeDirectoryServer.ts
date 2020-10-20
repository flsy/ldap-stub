import ldap from 'ldapjs';
import { Optional } from '../tools';
import { ILdapUserAccount } from '../interfaces';

interface IUser extends ILdapUserAccount {
  password: string;
}

const lowercaseDC = (suffix: string) =>
  suffix
    .split(',')
    .map((value) => {
      const dc = value.trim().toLowerCase();
      return dc.startsWith('dc=') ? dc : value;
    })
    .join(', ');

export const ActiveDirectoryServer = (adArgs: { bindDN: string; bindPassword: string; suffix: string; users: IUser[]; logger?: (...args: any[]) => void }) => {
  const server = ldap.createServer();

  const logger = adArgs.logger ? adArgs.logger : console.log;

  server.bind(adArgs.bindDN, (req: any, res: any, next: any) => {
    logger('info', 'BIND_DN bind for', { dn: req.dn.toString() });

    if (!req.dn.equals(adArgs.bindDN) || req.credentials !== adArgs.bindPassword) {
      return next(new ldap.InvalidCredentialsError());
    }

    res.end();
    return next();
  });

  server.bind(adArgs.suffix, (req: any, res: any, next: any) => {
    const dn = req.dn.toString();
    logger('info', 'SUFFIX bind for', { dn });

    const user = adArgs.users.find((u) => {
      const x = `cn=${u.givenName} ${u.sn}, ou=Users, ${lowercaseDC(adArgs.suffix)}`;
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

  const getUsername = (dn: string): Optional<string> => {
    const f = dn.split('(').find((s: string) => s.startsWith('samaccountname'));
    if (!f) return;
    const r = f.split(')')[0];
    if (!r) return;

    return r.split('=')[1];
  };

  server.search(adArgs.suffix, authorize, (req: any, res: any, next: any) => {
    const dn = req.dn.toString();

    const username = getUsername(req.filter.toString());

    const user = adArgs.users.find((u) => u.username === username);

    logger('info', 'search for:', username);
    if (!user) {
      return next(new ldap.NoSuchObjectError(dn));
    }

    const obj = {
      dn: req.dn.toString(),
      attributes: {
        distinguishedName: `CN=${user.givenName} ${user.sn},OU=Users,${adArgs.suffix}`,
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
