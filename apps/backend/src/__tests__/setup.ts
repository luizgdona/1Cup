// Provide minimal env vars so modules that import env.ts don't crash in tests
process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-minimum-32-characters-long!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters-long!';
process.env.S3_ENDPOINT = 'https://test.r2.cloudflarestorage.com';
process.env.S3_BUCKET = 'test-bucket';
process.env.S3_ACCESS_KEY = 'test-key';
process.env.S3_SECRET_KEY = 'test-secret';
process.env.S3_PUBLIC_URL = 'https://media.test.app';
process.env.CORS_ORIGIN = 'http://localhost:3001';
process.env.BCRYPT_ROUNDS = '4'; // fast for tests
