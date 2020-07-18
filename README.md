# ldap-stub



## example usage

### server

```typescript
import { activeDirectoryServer } from 'ldap-stub';

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
import { acticveDirectoryClient } from 'ldap-stub';

const client = acticveDirectoryClient({
    serverUrl: '',
    bindDN: '',
    bindPassword: '',
    suffix: '',
});

const user = await client.login("username", "password");

```
