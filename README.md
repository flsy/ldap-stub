# ldap-stub



## example usage
## Active Directory

### server

```typescript
import { ActiveDirectoryServer } from 'ldap-stub';

activeDirectoryServer({
    bindDN: '',
    bindPassword: '',
    suffix: '',
    users: [{ username: '', firstName: '', lastName: '', password: '', email: '', phone: '', memberOf: [''] }],
    logger: console.log;
})


```

### client

```typescript
import { activeDirectoryClient } from 'ldap-stub';

const client = activeDirectoryClient({
    serverUrl: '',
    bindDN: '',
    bindPassword: '',
    suffix: '',
});

const user = await client.login("username", "password");

```

## open-LDAP

### server

```typescript
import { openLdapServer } from 'ldap-stub';

activeDirectoryServer({
    bindUser: {
        username: '',
        password: '',
    },
    dc: ['example', 'com'],
    accounts: [{ id: '9000', username: 'user1', password: 'password1' }]
})


```

### client

```typescript
import { openLdapClient } from 'ldap-stub';

const client = openLdapClient({
    serverUrl: '',
    bindUser: {
        username: 'root',
        password: 'password',
    },
    dc: ['example', 'com'],
});

const user = await client.login("username", "password");

```
