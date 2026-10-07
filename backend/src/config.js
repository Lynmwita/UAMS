require('dotenv').config();

function assertRuntimeSecurityConfig() {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error(
      'FATAL SECURITY VIOLATION: JWT_SECRET environment variable must be configured in production. Refusing to start.'
    );
  }

  return true;
}

const config = {
  appName: process.env.APP_NAME || 'University Administration Management System',
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  jwtSecret: process.env.JWT_SECRET || '',
};

module.exports = {
  config,
  assertRuntimeSecurityConfig,
};
