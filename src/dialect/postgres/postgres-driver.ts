import {
  DatabaseConnection,
  QueryResult,
} from '../../driver/database-connection.js'
import { Driver, TransactionSettings } from '../../driver/driver.js'
import { CompiledQuery } from '../../query-compiler/compiled-query.js'
import { isFunction, freeze } from '../../util/object-utils.js'
import { extendStackTrace } from '../../util/stack-trace-utils.js'
import {
  PostgresClient,
  PostgresCursorConstructor,
  PostgresDialectConfig,
  PostgresPool,
  PostgresPoolClient,
  PostgresSingleClient,
} from './postgres-dialect-config.js'
import { PostgresDialectPoolConfig } from './postgres-dialect-pool-config.js'
import { PostgresDialectClientConfig } from './postgres-dialect-client-config.js'

const PRIVATE_RELEASE_METHOD = Symbol()

export class PostgresDriver implements Driver {
  readonly #config: PostgresDialectConfig
  readonly #connections = new WeakMap<PostgresPoolClient, DatabaseConnection>()
  #pool?: PostgresPool
  #singleClient?: PostgresSingleClient
  #singleConnection?: DatabaseConnection

  constructor(config: PostgresDialectPoolConfig | PostgresDialectClientConfig) {
    this.#config = freeze({ ...config })
  }

  async init(): Promise<void> {
    if (isPoolConfig(this.#config)) {
      this.#pool = isFunction(this.#config.pool)
        ? await this.#config.pool()
        : this.#config.pool
    }
  }

  async acquireConnection(): Promise<DatabaseConnection> {
    if (!isPoolConfig(this.#config)) {
      if (this.#singleConnection === undefined) {
        this.#singleClient = isFunction(this.#config.client)
          ? await this.#config.client()
          : this.#config.client

        await this.#singleClient!.connect()
        this.#singleConnection = new PostgresConnection(this.#singleClient!, {
          cursor: this.#config.cursor ?? null,
        })
      }
      return this.#singleConnection
    }

    const client = await this.#pool!.connect()
    let connection = this.#connections.get(client)

    if (!connection) {
      connection = new PostgresConnection(client, {
        cursor: this.#config.cursor ?? null,
      })
      this.#connections.set(client, connection)

      // The driver must take care of calling `onCreateConnection` when a new
      // connection is created. The `pg` module doesn't provide an async hook
      // for the connection creation. We need to call the method explicitly.
      if (this.#config?.onCreateConnection) {
        await this.#config.onCreateConnection(connection)
      }
    }

    return connection
  }

  async beginTransaction(
    connection: DatabaseConnection,
    settings: TransactionSettings
  ): Promise<void> {
    if (settings.isolationLevel) {
      await connection.executeQuery(
        CompiledQuery.raw(
          `start transaction isolation level ${settings.isolationLevel}`
        )
      )
    } else {
      await connection.executeQuery(CompiledQuery.raw('begin'))
    }
  }

  async commitTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw('commit'))
  }

  async rollbackTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw('rollback'))
  }

  async releaseConnection(connection: PostgresConnection): Promise<void> {
    connection[PRIVATE_RELEASE_METHOD]()
  }

  async destroy(): Promise<void> {
    if (this.#singleClient) {
      await this.#singleClient.end()
    } else if (this.#pool) {
      const pool = this.#pool
      this.#pool = undefined
      await pool.end()
    }
  }
}

interface PostgresConnectionOptions {
  cursor: PostgresCursorConstructor | null
}

class PostgresConnection implements DatabaseConnection {
  #client: PostgresClient
  #options: PostgresConnectionOptions

  constructor(client: PostgresClient, options: PostgresConnectionOptions) {
    this.#client = client
    this.#options = options
  }

  async executeQuery<O>(compiledQuery: CompiledQuery): Promise<QueryResult<O>> {
    try {
      const result = await this.#client.query<O>(compiledQuery.sql, [
        ...compiledQuery.parameters,
      ])

      if (
        result.command === 'INSERT' ||
        result.command === 'UPDATE' ||
        result.command === 'DELETE'
      ) {
        const numAffectedRows = BigInt(result.rowCount)

        return {
          // TODO: remove.
          numUpdatedOrDeletedRows: numAffectedRows,
          numAffectedRows,
          rows: result.rows ?? [],
        }
      }

      return {
        rows: result.rows ?? [],
      }
    } catch (err) {
      throw extendStackTrace(err, new Error())
    }
  }

  async *streamQuery<O>(
    compiledQuery: CompiledQuery,
    chunkSize: number
  ): AsyncIterableIterator<QueryResult<O>> {
    if (!this.#options.cursor) {
      throw new Error(
        "'cursor' is not present in your postgres dialect config. It's required to make streaming work in postgres."
      )
    }

    if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
      throw new Error('chunkSize must be a positive integer')
    }

    const cursor = this.#client.query(
      new this.#options.cursor<O>(
        compiledQuery.sql,
        compiledQuery.parameters.slice()
      )
    )

    try {
      while (true) {
        const rows = await cursor.read(chunkSize)

        if (rows.length === 0) {
          break
        }

        yield {
          rows,
        }
      }
    } finally {
      await cursor.close()
    }
  }

  [PRIVATE_RELEASE_METHOD](): void {
    if (isPoolClient(this.#client)) {
      this.#client.release()
    }
  }
}

function isPoolConfig(config: any): config is PostgresDialectPoolConfig {
  return config.pool !== undefined
}

function isPoolClient(client: any): client is PostgresPoolClient {
  // Test for `release`, not for `end`, because `end` is also present in pg's
  // implementation of `Client`, despite leaving it out of type `ClientBase`.
  return client.release !== undefined
}
