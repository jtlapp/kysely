import {
  PostgresCursorConstructor,
  PostgresPool,
} from './postgres-dialect-config.js'
import { DatabaseConnection } from '../../driver/database-connection.js'

/**
 * Pool config for the PostgreSQL dialect.
 */
export interface PostgresDialectPoolConfig {
  /**
   * A postgres Pool instance or a function that returns one.
   *
   * If a function is provided, it's called once when the first query is executed.
   *
   * https://node-postgres.com/apis/pool
   */
  pool: PostgresPool | (() => Promise<PostgresPool>)

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

  /**
   * Called once for each created connection.
   */
  onCreateConnection?: (connection: DatabaseConnection) => Promise<void>
}
