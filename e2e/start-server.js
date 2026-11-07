const { assertSafeMongoUri } = require('./helpers/test-environment');

assertSafeMongoUri(process.env.E2E_MONGO_URI);
require('../backend/server');
