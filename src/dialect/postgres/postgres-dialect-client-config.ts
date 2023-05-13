import {
  PostgresSingleClient,
  PostgresCursorConstructor,
} from './postgres-dialect-config.js'

/**
 * Client config for the PostgreSQL dialect.
 */
export interface PostgresDialectClientConfig {
  /**
   * A postgres Client instance or a function that returns one.
   *
   * If a function is provided, it's called once when the first query is executed.
   *
   * https://node-postgres.com/apis/client
   */
  client: PostgresSingleClient | (() => Promise<PostgresSingleClient>)

  /**
   * https://github.com/brianc/node-postgres/tree/master/packages/pg-cursor
   * ```ts
   * import Cursor from 'pg-cursor'
   * // or
   * import * as Cursor from 'pg-cursor'
   *
   * new PostgresDialect({
   *  cursor: Cursor
   * })
   * ```
   */
  cursor?: PostgresCursorConstructor
}
