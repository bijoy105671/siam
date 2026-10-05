import { AsyncLocalStorage } from 'node:async_hooks';
import type { Pool, PoolClient, QueryResult } from 'pg';

type TenantStore = { organizationId: string };
const tenantStorage = new AsyncLocalStorage<TenantStore>();

export const getTenantOrganizationId = () => tenantStorage.getStore()?.organizationId || null;
export const runWithTenant = <T>(organizationId: string, fn: () => T) => tenantStorage.run({ organizationId }, fn);

const sqlText = (args: any[]) => {
  const first = args[0];
  return typeof first === 'string' ? first.trim().toUpperCase() : '';
};

export const installTenantAwarePool = (pool: Pool) => {
  const originalQuery = pool.query.bind(pool);
  const originalConnect = pool.connect.bind(pool);

  (pool as any).query = async (...args: any[]) => {
    const organizationId = getTenantOrganizationId();
    if (!organizationId) return originalQuery(...args);
    const client = await originalConnect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.organization_id', $1, true)", [organizationId]);
      const result = await client.query(...args);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      throw error;
    } finally {
      client.release();
    }
  };

  (pool as any).connect = async (...args: any[]) => {
    const client: PoolClient = await originalConnect(...args);
    const originalClientQuery = client.query.bind(client);
    (client as any).query = async (...queryArgs: any[]): Promise<QueryResult> => {
      const organizationId = getTenantOrganizationId();
      if (!organizationId) return originalClientQuery(...queryArgs);
      const sql = sqlText(queryArgs);
      if (sql.startsWith('BEGIN')) {
        const result = await originalClientQuery(...queryArgs);
        await originalClientQuery("SELECT set_config('app.organization_id', $1, true)", [organizationId]);
        return result;
      }
      if (sql.startsWith('COMMIT') || sql.startsWith('ROLLBACK') || sql.startsWith('SET ') || sql.startsWith('SELECT SET_CONFIG')) {
        return originalClientQuery(...queryArgs);
      }
      await originalClientQuery("SELECT set_config('app.organization_id', $1, true)", [organizationId]);
      return originalClientQuery(...queryArgs);
    };
    return client;
  };
};
