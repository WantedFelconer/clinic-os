const crypto = require('crypto');

const TRUE_VALUES = new Set(['1', 'true', 'yes']);
const TEST_JWT_SECRET = 'clinic-os-test-only-secret-not-for-production-use';
const INSECURE_JWT_VALUES = new Set([
  'dev_secret_key',
  'dev_secret_key_12345',
  'secret',
  'password',
  'changeme',
  'replace_with_a_secure_random_jwt_secret_in_production',
  'super_secure_production_jwt_secret_clinic_os_2026',
]);

function isEnabled(value) {
  return TRUE_VALUES.has(String(value || '').trim().toLowerCase());
}

function getJwtConfig(env = process.env) {
  let secret = env.JWT_SECRET;
  if (!secret && env.NODE_ENV === 'test') secret = TEST_JWT_SECRET;

  if (!secret && env.NODE_ENV === 'development' && isEnabled(env.ALLOW_EPHEMERAL_DEV_JWT)) {
    secret = crypto.randomBytes(48).toString('hex');
  }

  const normalized = String(secret || '').trim();
  if (!normalized) {
    throw new Error('JWT_SECRET is required. Configure it through the environment or secrets manager.');
  }
  if (env.NODE_ENV === 'production' && (normalized.length < 32 || INSECURE_JWT_VALUES.has(normalized))) {
    throw new Error('JWT_SECRET must be an unpredictable production secret of at least 32 characters.');
  }

  return {
    secret: normalized,
    expiresIn: env.JWT_EXPIRES_IN || '30m',
    issuer: env.JWT_ISSUER || 'clinic-os-api',
    audience: env.JWT_AUDIENCE || 'clinic-os-web',
    algorithms: ['HS256'],
  };
}

function parseAllowedOrigins(env = process.env) {
  const configured = [env.FRONTEND_URL, ...(env.ALLOWED_ORIGINS || '').split(',')]
    .map((origin) => origin && origin.trim())
    .filter(Boolean);

  if (env.NODE_ENV !== 'production') {
    configured.push('http://localhost:5173', 'http://localhost:3000');
  }

  const origins = [...new Set(configured)];
  if (env.NODE_ENV === 'production' && origins.length === 0) {
    throw new Error('FRONTEND_URL or ALLOWED_ORIGINS is required in production.');
  }
  if (env.NODE_ENV === 'production' && origins.some((origin) => origin === '*' || !origin.startsWith('https://'))) {
    throw new Error('Production CORS origins must be explicit HTTPS origins; wildcards are not permitted.');
  }
  return origins;
}

function buildCorsOptions(env = process.env) {
  const allowed = new Set(parseAllowedOrigins(env));
  return {
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
    maxAge: 600,
    origin(origin, callback) {
      if (!origin || allowed.has(origin)) return callback(null, true);
      const error = new Error('Origin is not allowed by ClinicOS CORS policy.');
      error.statusCode = 403;
      return callback(error);
    },
  };
}

function getTrustProxy(env = process.env) {
  const value = String(env.TRUST_PROXY || '').trim();
  if (!value && env.VERCEL) return 1;
  if (!value || value === 'false' || value === '0') return false;
  if (value === 'true' || value === '1') return 1;
  if (/^\d+$/.test(value)) return Number(value);
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function getHttpsConfig(env = process.env) {
  const enforce = isEnabled(env.ENFORCE_HTTPS) || env.NODE_ENV === 'production';
  return {
    enforce,
    healthCheckExempt: isEnabled(env.HTTPS_HEALTHCHECK_EXEMPT),
    httpsPort: Number(env.HTTPS_PORT || 443),
    hstsMaxAge: Number(env.HSTS_MAX_AGE_SECONDS || 15552000),
  };
}

function createHttpsMiddleware(options = getHttpsConfig()) {
  return (req, res, next) => {
    if (!options.enforce || (options.healthCheckExempt && req.path === '/api/health')) return next();
    if (req.secure) {
      if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', `max-age=${options.hstsMaxAge}; includeSubDomains`);
      }
      return next();
    }

    const hostHeader = req.get('host');
    if (!hostHeader) return res.status(400).json({ message: 'Host header is required.' });
    const host = options.httpsPort === 443 ? hostHeader.replace(/:\d+$/, '') : `${hostHeader.replace(/:\d+$/, '')}:${options.httpsPort}`;
    return res.redirect(308, `https://${host}${req.originalUrl}`);
  };
}

function validateHttpsDeployment(env = process.env) {
  const config = getHttpsConfig(env);
  const hasCert = Boolean(env.TLS_CERT_PATH);
  const hasKey = Boolean(env.TLS_KEY_PATH);
  if (hasCert !== hasKey) throw new Error('TLS_CERT_PATH and TLS_KEY_PATH must be configured together.');
  if (env.NODE_ENV === 'production' && config.enforce && !getTrustProxy(env) && !hasCert) {
    throw new Error('Production HTTPS enforcement requires TRUST_PROXY or direct TLS certificate/key paths.');
  }
  return config;
}

module.exports = {
  buildCorsOptions,
  createHttpsMiddleware,
  getHttpsConfig,
  getJwtConfig,
  getTrustProxy,
  isEnabled,
  parseAllowedOrigins,
  validateHttpsDeployment,
};
