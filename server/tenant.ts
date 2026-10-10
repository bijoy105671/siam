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
  const originalQuery: (...args: any[]) => Promise<any> = (pool.query as any).bind(pool);
  const originalConnect: (...args: any[]) => any = (pool.connect as any).bind(pool);

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

  // Keep callback and promise semantics of pg.Pool#connect intact.
  // The previous wrapper could return undefined on Render/pg and crash startup.
  (pool as any).connect = (callback?: (...args: any[]) => void) => {
    if (typeof callback === 'function') {
      return originalConnect((err: Error | undefined, client: PoolClient | undefined, release: (err?: Error) => void) => {
        if (err || !client) return callback(err, client, release);
        const organizationId = getTenantOrganizationId();
        if (!organizationId) return callback(undefined, client, release);

        const originalClientQuery = client.query.bind(client);
        (client as any).query = async (...queryArgs: any[]): Promise<QueryResult> => {
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
        return callback(undefined, client, release);
      });
    }

    return new Promise<PoolClient>((resolve, reject) => {
      originalConnect((err: Error | undefined, client: PoolClient | undefined) => {
        if (err || !client) return reject(err || new Error('Failed to acquire database client'));
        const organizationId = getTenantOrganizationId();
        if (!organizationId) return resolve(client);

        const originalClientQuery = client.query.bind(client);
        (client as any).query = async (...queryArgs: any[]): Promise<QueryResult> => {
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
        resolve(client);
      });
    });
  };
};
