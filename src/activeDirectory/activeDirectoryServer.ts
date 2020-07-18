import * as ldap from 'ldapjs';
import { Optional } from '../tools';

const lowercaseDC = (suffix: string) =>
    suffix
        .split(',')
        .map((a) => a.trim())
        .map((a) => (a.startsWith('DC=') ? a.replace('DC=', 'dc=') : a))
        .join(', ');

export const ActiveDirectoryServer = (args: {
    bindDN: string;
    bindPassword: string;
    suffix: string;
    users: Array<{ username: string; firstName: string; lastName: string; password: string; email: string; phone: string; memberOf: string[] }>;
    logger?: (...args: any[]) => void;
}) => {
    const server = ldap.createServer();

    const logger = args.logger ? args.logger : () => null;

    server.bind(args.bindDN, (req: any, res: any, next: any) => {
        logger('info', 'BIND_DN bind for', { dn: req.dn.toString() });

        if (!req.dn.equals(args.bindDN) || req.credentials !== args.bindPassword) {
            return next(new ldap.InvalidCredentialsError());
        }

        res.end();
        return next();
    });

    server.bind(args.suffix, (req: any, res: any, next: any) => {
        const dn = req.dn.toString();
        logger('info', 'SUFFIX bind for', { dn });

        const user = args.users.find((u) => {
            const x = `cn=${u.firstName} ${u.lastName}, ou=Users, ${lowercaseDC(args.suffix)}`;
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
        if (!binddn.equals(args.bindDN)) {
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

    server.search(args.suffix, authorize, (req: any, res: any, next: any) => {
        const dn = req.dn.toString();

        const username = getUsername(req.filter.toString());

        const user = args.users.find((u) => u.username === username);

        logger('info', 'search for:', username);
        if (!user) {
            return next(new ldap.NoSuchObjectError(dn));
        }

        const obj = {
            dn: req.dn.toString(),
            attributes: {
                distinguishedName: `CN=${user.firstName} ${user.lastName},OU=Users,${args.suffix}`,
                memberOf: user.memberOf,
            },
        };
        res.send(obj);
        res.end();
    });
    return server;
};
