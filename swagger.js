import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import pkg from './package.json' assert { type: 'json' };

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'TodoList API',
      version: pkg.version || '1.0.0',
      description:
        'Todos API with Supabase Postgres, Redis (Upstash), file uploads (image/audio), email workflows, and admin ops.',
    },
    servers: [{ url: '/api/v1' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        // ===== Core models =====
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            username: { type: 'string', example: 'jay' },
            email: { type: 'string', example: 'jay@example.com' },
            is_admin: { type: 'boolean', example: false },
          },
        },
        Task: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 42 },
            user_id: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'Buy groceries' },
            description: { type: 'string', nullable: true },
            is_completed: { type: 'boolean', example: false },
            image_url: { type: 'string', format: 'uri', nullable: true },
            audio_url: { type: 'string', format: 'uri', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 10 },
            user_id: { type: 'integer', example: 1 },
            message: { type: 'string', example: 'Your profile was updated by an admin.' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },

        // ===== Common envelopes =====
        ErrorResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            stack: { type: 'string', nullable: true },
          },
        },
        PaginatedTasks: {
          type: 'object',
          properties: {
            tasks: { type: 'array', items: { $ref: '#/components/schemas/Task' } },
            nextCursor: { type: ['string', 'null'], example: '2025-09-20T10:20:30.000Z' },
            totalTasks: { type: 'integer', example: 37 },
          },
        },

        // ===== Requests =====
        RegisterRequest: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', format: 'password' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['identifier', 'password'],
          properties: {
            identifier: { type: 'string', example: 'jay or jay@example.com' },
            password: { type: 'string', format: 'password' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'jay' },
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR...' },
          },
        },
        UpdateProfileRequest: {
          type: 'object',
          properties: {
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', format: 'password' },
          },
        },
        UpdateUserByAdminRequest: {
          type: 'object',
          properties: {
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            isAdmin: { type: 'boolean' },
          },
        },
        CreateTaskForm: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            image: { type: 'string', format: 'binary' },
            audio: { type: 'string', format: 'binary' },
          },
        },
        UpdateTaskRequest: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            is_completed: { type: 'boolean' },
          },
        },
        ForgotPasswordRequest: {
          type: 'object',
          required: ['email'],
          properties: { email: { type: 'string', format: 'email' } },
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['newPassword'],
          properties: { newPassword: { type: 'string', format: 'password' } },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  // include only your route files
  apis: ['./routes/*.js'],
};

export const swaggerSpec = swaggerJSDoc(options);

export const swaggerUiMiddleware = (app) => {
  // Optionally guard in prod via env
  if (process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true') {
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
  }
};
