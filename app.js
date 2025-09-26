import express from 'express';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes.js';
import taskRoutes from './routes/taskRouter.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { swaggerUiMiddleware } from './swagger.js';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

dotenv.config();


const app = express();

app.use(express.json());

app.get('/', (req, res) => res.send('API is running...'));

swaggerUiMiddleware(app);
const spec = YAML.load('./docs/openapi.yaml');
app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));

app.use('/api/v1/users', userRoutes);
app.use('/api/v1/tasks', taskRoutes);

// Error handling
app.use(notFound);
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'File too large. Max size is 10MB.' });
  }
  next(err);
});
app.use(errorHandler);

export default app;
