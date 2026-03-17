require('dotenv').config();
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const config = require('./config');
const swaggerSpec = require('./config/swagger');
const routes = require('./routes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/', routes);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port} [${config.nodeEnv}]`);
});
