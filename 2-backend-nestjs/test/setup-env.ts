// Les tests e2e n'utilisent jamais la base de développement (database.sqlite).
process.env.DB_PATH = ':memory:';
// JWT_SECRET est obligatoire au démarrage de l'application : secret de test,
// sans rapport avec celui de production, qui n'est jamais versionné.
process.env.JWT_SECRET ??= 'secret-de-test-uniquement-ne-sert-qu-aux-tests-e2e';
