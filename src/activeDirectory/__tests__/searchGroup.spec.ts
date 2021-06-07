import { serverMock, setUserConfigFileEnv } from '../testHelpers';
import { ldapMockSettings, optionsMock } from '../../mocks';
import { activeDirectoryClient } from '../activeDirectoryClient';
import { isRight } from 'fputils';

describe('search group', () => {
  beforeAll(() => {
    setUserConfigFileEnv();
  });

  it('should fail when group in filter in wrong format', async () => {
    const server = await serverMock(1234, ldapMockSettings);
    const result = await activeDirectoryClient(ldapMockSettings).search({
      ...optionsMock,
      filter: `(&(objectcategory=group)(xx))`,
    });
    await server.close();
    expect(isRight(result) && result.value).toEqual([]);
  });

  it('should return [] when wrong group searched', async () => {
    const server = await serverMock(1234, ldapMockSettings);
    const result = await activeDirectoryClient(ldapMockSettings).search({
      ...optionsMock,
      filter: `(&(objectcategory=group)(CN=XX))`,
    });
    await server.close();
    expect(isRight(result) && result.value).toEqual([]);
  });

  it('should search user by group in Active Directory', async () => {
    const server = await serverMock(1234, ldapMockSettings);
    const result = await activeDirectoryClient(ldapMockSettings).search({
      ...optionsMock,
      attributes: ['memberOf', 'name'],
      filter: `(&(objectcategory=group)(CN=Audit))`,
    });
    await server.close();

    expect(isRight(result)).toEqual(true);
    expect(result.value).toEqual([
      {
        name: ['CN=Audit'],
      },
    ]);
  });

  it('should search nested group', async () => {
    const server = await serverMock(1234, ldapMockSettings);
    const result = await activeDirectoryClient(ldapMockSettings).search({
      ...optionsMock,
      attributes: ['memberOf', 'name'],
      filter: `(&(objectcategory=group)(CN=Local-Admins))`,
    });
    await server.close();

    expect(isRight(result) && result.value).toEqual([{ name: ['CN=Local-Admins'], memberOf: ['CN=Admins'] }]);
  });
});
