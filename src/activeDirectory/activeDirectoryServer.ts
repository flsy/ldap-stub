import ldap, { InsufficientAccessRightsError } from 'ldapjs';
import { ActiveDirectoryServerArgs, IUser } from '../interfaces';
import { Either, isLeft, Left, Optional, Right } from 'fputils';
import { getGroupResponse, getUsersAndGroups } from '../tools';

type DNType = 'DC=' | 'CN=' | 'OU=';
type Attribute = 'userprincipalname' | 'samaccountname';
type BindDN = { equals: (value: string) => boolean };

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
    const usersAndGroups = getUsersAndGroups();

    if (isLeft(usersAndGroups)) {
      return next(new Error(usersAndGroups.value.message));
    }

    const user = usersAndGroups.value.users.find((u) => {
      const x = `cn=${u.givenName} ${u.sn}, ${lowercaseDn(adArgs.usersBaseDN)}`;
      return dn === x && u.password === req.credentials;
    });

    if (!user) {
      return next(new ldap.InvalidCredentialsError());
    }
    res.end();
    return next();
  });

  const bindUser = (binddn: BindDN, users: IUser[], ADArgs: ActiveDirectoryServerArgs): Either<InsufficientAccessRightsError, void> => {
    if (binddn.equals(ADArgs.bindDN)) {
      logger('info', `Successfully bound from server config as ${ADArgs.bindDN}`);
      return Right(undefined);
    }

    const boundUser = users.find((user) => user.distinguishedName && binddn.equals(user.distinguishedName));
    if (boundUser) {
      logger('info', `Successfully bound from users config as ${boundUser.distinguishedName}`);
      return Right(undefined);
    }

    logger('error', `Failed to bind user, attempted: ${binddn.toString()}`);
    return Left(new InsufficientAccessRightsError());
  };

  const authorize = (req: any, _: any, next: any) => {
    const binddn = req.connection.ldap.bindDN;

    const usersAndGroups = getUsersAndGroups();
    if (isLeft(usersAndGroups)) {
      return next(usersAndGroups.value);
    }

    const boundUser = bindUser(binddn, usersAndGroups.value.users, adArgs);

    if (isLeft(boundUser)) {
      return next(boundUser.value);
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
    const dn = req.dn.toString();
    const searchFilter = req.filter.toString();

    const usersAndGroups = getUsersAndGroups();

    if (isLeft(usersAndGroups)) {
      return next(usersAndGroups.value);
    }

    const { users, groups } = usersAndGroups.value;

    if (searchFilter.includes('objectcategory=group')) {
      const group = getGroupResponse(searchFilter, groups);

      if (isLeft(group)) {
        return next(group.value);
      }

      res.send({
        dn,
        attributes: group.value,
      });

      return res.end();
    }

    // todo: dont always want to search by username
    const username = getUsername(req.filter.toString());
    logger('info', 'search for:', username);

    const searchedUsers = findUsers(users, username);

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
