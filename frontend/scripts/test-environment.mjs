// Explicit test-only authentication fixtures must never be accepted by a dev server.
process.env.NODE_ENV = 'test';
