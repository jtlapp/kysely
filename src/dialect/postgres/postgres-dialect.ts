import { Driver } from '../../driver/driver.js'
import { Kysely } from '../../kysely.js'
import { QueryCompiler } from '../../query-compiler/query-compiler.js'
import { Dialect } from '../dialect.js'
import { PostgresDriver } from './postgres-driver.js'
import { DatabaseIntrospector } from '../database-introspector.js'
import { PostgresIntrospector } from './postgres-introspector.js'
import { PostgresQueryCompiler } from './postgres-query-compiler.js'
import { DialectAdapter } from '../dialect-adapter.js'
import { PostgresAdapter } from './postgres-adapter.js'
import { PostgresDialectPoolConfig } from './postgres-dialect-pool-config.js'
import { PostgresDialectClientConfig } from './postgres-dialect-client-config.js'

/**
 * PostgreSQL dialect that uses the [pg](https://node-postgres.com/) library.
 *
 * The constructor takes either an instance of {@link PostgresDialectPoolConfig}
 * or an instance of {@link PostgresDialectClientConfig}.
 *
 * ```ts
 * import { Client, Pool } from 'pg'
 *
 * new PostgresDialect({
 *   pool: new Pool({
 *     database: 'some_db',
 *     host: 'localhost',
 *   })
 * })
 *
 * new PostgresDialect({
 *   client: new Client({
 *     database: 'some_db',
 *     host: 'localhost',
 *   })
 * })
 * ```
 *
 * If you want the pool or client to only be created once it's first used,
 * `pool` or `client` can be a function:
 *
 * ```ts
 * import { Client, Pool } from 'pg'
 *
 * new PostgresDialect({
 *   pool: async () => new Pool({
 *     database: 'some_db',
 *     host: 'localhost',
 *   })
 * })
 *
 * new PostgresDialect({
 *   client: async () => new Client({
 *     database: 'some_db',
 *     host: 'localhost',
 *   })
 * })
 * ```
 */
export class PostgresDialect implements Dialect {
  readonly #config: PostgresDialectPoolConfig | PostgresDialectClientConfig

  constructor(config: PostgresDialectPoolConfig | PostgresDialectClientConfig) {
    this.#config = config
  }

  createDriver(): Driver {
    return new PostgresDriver(this.#config)
  }

  createQueryCompiler(): QueryCompiler {
    return new PostgresQueryCompiler()
  }

  createAdapter(): DialectAdapter {
    return new PostgresAdapter()
  }

  createIntrospector(db: Kysely<any>): DatabaseIntrospector {
    return new PostgresIntrospector(db)
  }
}
