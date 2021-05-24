import ldap from 'ldapjs';
import { ActiveDirectoryServerArgs, IUser } from '../interfaces';
import { isLeft, Optional } from 'fputils';
import { getUsers } from '../tools';

type DNType = 'DC=' | 'CN=' | 'OU=';
type Attribute = 'userprincipalname' | 'samaccountname';

const dnTypes: DNType[] = ['DC=', 'CN=', 'OU='];

const lower = (dnBit: string, type: DNType) => dnBit.replace(type, type.toLowerCase());

const lowerDnBit = (dnBit: string) => {
  const bit = dnBit.trim();
  return dnTypes.map((type: DNType) => (bit.startsWith(type) ? lower(bit, type) : undefined)).join('');
};

const lowercaseDn = (suffix: string) => suffix.split(',').map(lowerDnBit).join(', ');

export const ActiveDirectoryServer = (adArgs: ActiveDirectoryServerArgs) => {
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
    const users = getUsers();

    if (isLeft(users)) {
      return next(new Error(users.value.message));
    }

    const user = users.value.find((u) => {
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

  const getAttribute = (filter: string): Attribute => {
    if (filter.includes('@')) {
      return 'userprincipalname';
    }
    return 'samaccountname';
  };

  const getUsername = (filter: string): Optional<string> => {
    const attribute = getAttribute(filter);
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

  const findUsers = (users: IUser[], username: string) => users.filter((u) => new RegExp(`^${username.replace(/\*/g, '.*')}$`).test(u.username));

  server.search(adArgs.suffix, authorize, (req: any, res: any, next: any) => {
    // todo: dont always want to search by username
    const username = getUsername(req.filter.toString());
    logger('info', 'search for:', username);

    const users = getUsers();

    if (isLeft(users)) {
      return next(new Error(users.value.message));
    }

    const searchedUsers = findUsers(users.value, username);

    if (searchedUsers.length === 0) {
      logger('info', 'no search result for', username);
      return next(new ldap.NoSuchObjectError(`No user found`));
    }

    searchedUsers.forEach((user) => {
      logger('info', `Search success for user ${user.username}`);
      res.send({
        dn: req.dn.toString(),
        attributes: {
          ...user,
          distinguishedName: `CN=${user.givenName} ${user.sn},${adArgs.usersBaseDN}`,
        },
      });
    });

    res.end();
  });
  return server;
};
