export class PostgresAdminSql {
    static createDatabase(databaseName: string) {
        return `CREATE DATABASE ${PostgresAdminSql.quoteIdentifier(databaseName)}`
    }

    private static quoteIdentifier(identifier: string) {
        return `"${identifier.replace(/"/g, '""')}"`
    }
}
