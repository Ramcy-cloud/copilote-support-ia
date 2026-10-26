// Les tests e2e n'utilisent jamais la base de développement (database.sqlite).
process.env.DB_PATH = ':memory:';
