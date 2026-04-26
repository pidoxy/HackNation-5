declare module "better-sqlite3" {
  class Statement {
    run(params?: unknown): unknown;
    get(params?: unknown): unknown;
    all(params?: unknown): unknown[];
  }

  export default class Database {
    constructor(path: string);
    pragma(value: string): unknown;
    exec(sql: string): this;
    prepare(sql: string): Statement;
    transaction<TArgs extends unknown[]>(fn: (...args: TArgs) => void): (...args: TArgs) => void;
  }
}
