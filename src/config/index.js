const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'auth_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://localhost',
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  internalSecret: process.env.INTERNAL_SECRET,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  fromEmail: process.env.FROM_EMAIL || 'noreply@example.com',
  resendApiKey: process.env.RESEND_API_KEY,
  aws: {
    bucket: process.env.AWS_BUCKET,
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

module.exports = config;
