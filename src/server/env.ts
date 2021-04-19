const stringVariables = ['LDAP_BIND_DN', 'LDAP_BIND_PASSWORD', 'LDAP_SUFFIX', 'LDAP_DOMAIN', 'LDAP_USERS_BASE_DN', 'LDAP_USERS'] as const;

const getVariable = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} not set`);
  }
  return value;
};

export const getEnvVariable = (name: typeof stringVariables[number]) => getVariable(name);

const numberVariables = ['LDAP_PORT'] as const;

export const getEnvNumberVariable = (name: typeof numberVariables[number]) => {
  const value = getVariable(name);
  return parseInt(value, 10);
};
