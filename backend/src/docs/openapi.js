const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema) => ({ 'application/json': { schema } });

const ok = (description, data, { status = 200, paginated = false } = {}) => ({
  [status]: {
    description,
    content: json({
      allOf: [
        ref('Success'),
        {
          type: 'object',
          properties: paginated
            ? { data: { type: 'array', items: data }, meta: ref('PaginationMeta') }
            : { data },
        },
      ],
    }),
  },
});

const noContent = (description) => ({ 204: { description } });
const errors = (...codes) =>
  Object.fromEntries(codes.map((code) => [code, { $ref: `#/components/responses/E${code}` }]));

const body = (schemaName) => ({ required: true, content: json(ref(schemaName)) });
const pathId = (name = 'id', description = 'Resource id') => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'integer', minimum: 1 },
});
const query = (name, schema, description) => ({ name, in: 'query', schema, description });
const paginationParams = [
  query('page', { type: 'integer', minimum: 1, default: 1 }, 'Page number'),
  query('limit', { type: 'integer', minimum: 1, maximum: 100, default: 20 }, 'Items per page'),
];

const op = (tag, summary, spec) => ({
  tags: [tag],
  summary,
  security: [{ cookieAuth: [] }],
  ...spec,
});

const timestamps = {
  createdAt: { type: 'string', format: 'date-time' },
  updatedAt: { type: 'string', format: 'date-time' },
};
const nullableString = { type: 'string', nullable: true };
const role = { type: 'string', enum: ['OWNER', 'ADMIN', 'MEMBER'] };
const assignableRole = { type: 'string', enum: ['ADMIN', 'MEMBER'] };
const status = { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] };
const date = { type: 'string', format: 'date', example: '2026-12-31' };

const stats = {
  total: { type: 'integer' },
  byStatus: {
    type: 'object',
    properties: {
      TODO: { type: 'integer' },
      IN_PROGRESS: { type: 'integer' },
      DONE: { type: 'integer' },
    },
  },
  progress: { type: 'integer', minimum: 0, maximum: 100, description: 'Percent of DONE tasks' },
  overdue: { type: 'integer', description: 'Not DONE and past due date' },
  unassigned: { type: 'integer' },
};

const errorResponse = (description, example) => ({
  description,
  content: json({ allOf: [ref('Error')], example }),
});

const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'TaskFlow API',
    version: '1.0.0',
    description:
      'REST API for team task management: workspaces, members, projects, tasks, comments and activity history.\n\n' +
      '`POST /auth/login` sets an httpOnly `taskflow_token` cookie (SameSite=Lax) that the browser ' +
      'sends automatically; the token is never exposed to JavaScript. ' +
      'State-changing requests from origins other than the API and the configured frontend are rejected.',
  },
  servers: [{ url: '/api/v1' }],
  tags: [
    { name: 'Auth' },
    { name: 'Workspaces' },
    { name: 'Members' },
    { name: 'Projects' },
    { name: 'Tasks' },
    { name: 'Comments' },
    { name: 'Statistics' },
    { name: 'Health' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'taskflow_token' },
    },
    responses: {
      E400: errorResponse('Validation failed or business rule violated', {
        success: false,
        data: null,
        message: 'Validation failed',
        errors: [{ field: 'title', message: 'title is not allowed to be empty' }],
      }),
      E401: errorResponse('Missing, invalid or expired token', {
        success: false,
        data: null,
        message: 'Invalid or expired token',
      }),
      E403: errorResponse('Not a member of the workspace or insufficient role', {
        success: false,
        data: null,
        message: 'You are not a member of this workspace',
      }),
      E404: errorResponse('Resource not found', {
        success: false,
        data: null,
        message: 'Task not found',
      }),
      E409: errorResponse('Conflict with existing data', {
        success: false,
        data: null,
        message: 'Email is already registered',
      }),
    },
    schemas: {
      Success: {
        type: 'object',
        required: ['success', 'data', 'message'],
        properties: {
          success: { type: 'boolean', example: true },
          data: {},
          message: { type: 'string' },
        },
      },
      Error: {
        type: 'object',
        required: ['success', 'data', 'message'],
        properties: {
          success: { type: 'boolean', example: false },
          data: { nullable: true, example: null },
          message: { type: 'string' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: { field: { type: 'string' }, message: { type: 'string' } },
            },
          },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          email: { type: 'string', format: 'email' },
          fullName: { type: 'string' },
          ...timestamps,
        },
      },
      AuthResult: {
        type: 'object',
        properties: { user: ref('User') },
      },
      Workspace: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          description: nullableString,
          ownerId: { type: 'integer' },
          role: { ...role, description: "Current user's role" },
          memberCount: { type: 'integer' },
          ...timestamps,
        },
      },
      WorkspaceDetail: {
        allOf: [
          ref('Workspace'),
          { type: 'object', properties: { members: { type: 'array', items: ref('Member') } } },
        ],
      },
      Member: {
        type: 'object',
        properties: {
          workspaceId: { type: 'integer' },
          userId: { type: 'integer' },
          email: { type: 'string' },
          fullName: { type: 'string' },
          role,
          joinedAt: { type: 'string', format: 'date-time' },
        },
      },
      Project: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          workspaceId: { type: 'integer' },
          name: { type: 'string' },
          description: nullableString,
          createdBy: { type: 'integer', nullable: true },
          taskCount: { type: 'integer', description: 'Only in workspace project lists' },
          ...timestamps,
        },
      },
      Task: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          projectId: { type: 'integer' },
          workspaceId: { type: 'integer' },
          title: { type: 'string' },
          description: nullableString,
          status,
          assigneeId: { type: 'integer', nullable: true },
          assignee: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'integer' },
              email: { type: 'string' },
              fullName: { type: 'string' },
            },
          },
          createdBy: { type: 'integer', nullable: true },
          dueDate: { ...date, nullable: true },
          ...timestamps,
        },
      },
      Activity: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          projectId: { type: 'integer' },
          taskId: { type: 'integer', nullable: true },
          action: {
            type: 'string',
            enum: ['TASK_CREATED', 'TASK_UPDATED', 'TASK_DELETED'],
          },
          changes: {
            type: 'object',
            nullable: true,
            example: { status: { from: 'TODO', to: 'IN_PROGRESS' } },
          },
          user: {
            type: 'object',
            nullable: true,
            properties: { id: { type: 'integer' }, fullName: { type: 'string' } },
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Comment: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          taskId: { type: 'integer' },
          content: { type: 'string' },
          author: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              fullName: { type: 'string' },
              email: { type: 'string' },
            },
          },
          ...timestamps,
        },
      },
      ProjectStats: {
        type: 'object',
        properties: { projectId: { type: 'integer' }, ...stats },
      },
      WorkspaceStats: {
        type: 'object',
        properties: {
          workspaceId: { type: 'integer' },
          projectCount: { type: 'integer' },
          ...stats,
          projects: {
            type: 'array',
            items: {
              type: 'object',
              properties: { id: { type: 'integer' }, name: { type: 'string' }, ...stats },
            },
          },
        },
      },
      RegisterInput: {
        type: 'object',
        required: ['email', 'password', 'fullName'],
        properties: {
          email: { type: 'string', format: 'email', example: 'alice@example.com' },
          password: { type: 'string', minLength: 8, maxLength: 72, example: 'password123' },
          fullName: { type: 'string', maxLength: 100, example: 'Alice Nguyen' },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'alice@example.com' },
          password: { type: 'string', example: 'password123' },
        },
      },
      WorkspaceInput: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', maxLength: 100, example: 'Product Team' },
          description: { ...nullableString, maxLength: 1000 },
        },
      },
      WorkspaceUpdate: {
        type: 'object',
        minProperties: 1,
        properties: {
          name: { type: 'string', maxLength: 100 },
          description: { ...nullableString, maxLength: 1000 },
        },
      },
      AddMemberInput: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email', example: 'bob@example.com' },
          role: { ...assignableRole, default: 'MEMBER' },
        },
      },
      RoleInput: {
        type: 'object',
        required: ['role'],
        properties: { role: assignableRole },
      },
      ProjectInput: {
        type: 'object',
        required: ['workspaceId', 'name'],
        properties: {
          workspaceId: { type: 'integer', example: 1 },
          name: { type: 'string', maxLength: 100, example: 'Website Redesign' },
          description: { ...nullableString, maxLength: 2000 },
        },
      },
      ProjectUpdate: {
        type: 'object',
        minProperties: 1,
        properties: {
          name: { type: 'string', maxLength: 100 },
          description: { ...nullableString, maxLength: 2000 },
        },
      },
      TaskInput: {
        type: 'object',
        required: ['projectId', 'title'],
        properties: {
          projectId: { type: 'integer', example: 1 },
          title: { type: 'string', maxLength: 200, example: 'Build authentication API' },
          description: { ...nullableString, maxLength: 5000 },
          status: { ...status, default: 'TODO' },
          assigneeId: {
            type: 'integer',
            nullable: true,
            description: 'Must be a workspace member',
          },
          dueDate: { ...date, nullable: true, description: 'Cannot be in the past' },
        },
      },
      TaskUpdate: {
        type: 'object',
        minProperties: 1,
        properties: {
          title: { type: 'string', maxLength: 200 },
          description: { ...nullableString, maxLength: 5000 },
          status,
          assigneeId: { type: 'integer', nullable: true },
          dueDate: { ...date, nullable: true },
        },
      },
      CommentInput: {
        type: 'object',
        required: ['content'],
        properties: { content: { type: 'string', maxLength: 2000, example: 'Looks good!' } },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Check API and database status',
        responses: {
          ...ok('Service is healthy', {
            type: 'object',
            properties: { status: { type: 'string' }, database: { type: 'string' } },
          }),
          503: { description: 'Database is unavailable' },
        },
      },
    },

    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new account and start a session',
        requestBody: body('RegisterInput'),
        responses: {
          ...ok('User registered; auth cookie set', ref('AuthResult'), { status: 201 }),
          ...errors(400, 409),
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in; sets the httpOnly auth cookie',
        requestBody: body('LoginInput'),
        responses: { ...ok('Logged in; auth cookie set', ref('AuthResult')), ...errors(400, 401) },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Log out by clearing the auth cookie',
        responses: noContent('Cookie cleared'),
      },
    },
    '/auth/me': {
      get: op('Auth', 'Get the current user', {
        responses: { ...ok('Current user', ref('User')), ...errors(401) },
      }),
    },

    '/workspaces': {
      post: op('Workspaces', 'Create a workspace (creator becomes OWNER)', {
        requestBody: body('WorkspaceInput'),
        responses: {
          ...ok('Workspace created', ref('Workspace'), { status: 201 }),
          ...errors(400, 401),
        },
      }),
      get: op('Workspaces', 'List workspaces the current user belongs to', {
        responses: {
          ...ok('Workspaces', { type: 'array', items: ref('Workspace') }),
          ...errors(401),
        },
      }),
    },
    '/workspaces/{id}': {
      parameters: [pathId('id', 'Workspace id')],
      get: op('Workspaces', 'Get workspace detail with members', {
        description: 'Any member.',
        responses: { ...ok('Workspace', ref('WorkspaceDetail')), ...errors(400, 401, 403, 404) },
      }),
      patch: op('Workspaces', 'Update a workspace', {
        description: 'OWNER or ADMIN.',
        requestBody: body('WorkspaceUpdate'),
        responses: { ...ok('Workspace updated', ref('Workspace')), ...errors(400, 401, 403, 404) },
      }),
      delete: op('Workspaces', 'Delete a workspace and everything in it', {
        description: 'OWNER only.',
        responses: { ...noContent('Workspace deleted'), ...errors(400, 401, 403, 404) },
      }),
    },
    '/workspaces/{id}/members': {
      parameters: [pathId('id', 'Workspace id')],
      post: op('Members', 'Add a member by email', {
        description: 'OWNER or ADMIN. Only the OWNER can add ADMINs.',
        requestBody: body('AddMemberInput'),
        responses: {
          ...ok('Member added', ref('Member'), { status: 201 }),
          ...errors(400, 401, 403, 404, 409),
        },
      }),
    },
    '/workspaces/{id}/members/{userId}': {
      parameters: [pathId('id', 'Workspace id'), pathId('userId', 'User id of the member')],
      patch: op('Members', "Change a member's role", {
        description: "OWNER only. The OWNER's own role cannot be changed.",
        requestBody: body('RoleInput'),
        responses: { ...ok('Role updated', ref('Member')), ...errors(400, 401, 403, 404) },
      }),
      delete: op('Members', 'Remove a member or leave the workspace', {
        description:
          'OWNER removes anyone except themselves, ADMIN removes MEMBERs, anyone can leave. ' +
          "The OWNER cannot be removed. The member's tasks in this workspace are unassigned.",
        responses: { ...noContent('Member removed'), ...errors(400, 401, 403, 404) },
      }),
    },
    '/workspaces/{id}/projects': {
      parameters: [pathId('id', 'Workspace id')],
      get: op('Projects', 'List projects of a workspace', {
        responses: {
          ...ok('Projects', { type: 'array', items: ref('Project') }),
          ...errors(400, 401, 403, 404),
        },
      }),
    },
    '/workspaces/{id}/stats': {
      parameters: [pathId('id', 'Workspace id')],
      get: op('Statistics', 'Workspace task statistics and per-project progress', {
        responses: { ...ok('Statistics', ref('WorkspaceStats')), ...errors(400, 401, 403, 404) },
      }),
    },

    '/projects': {
      post: op('Projects', 'Create a project in a workspace', {
        description: 'OWNER or ADMIN of the workspace.',
        requestBody: body('ProjectInput'),
        responses: {
          ...ok('Project created', ref('Project'), { status: 201 }),
          ...errors(400, 401, 403, 404),
        },
      }),
    },
    '/projects/{id}': {
      parameters: [pathId('id', 'Project id')],
      get: op('Projects', 'Get a project', {
        responses: { ...ok('Project', ref('Project')), ...errors(400, 401, 403, 404) },
      }),
      patch: op('Projects', 'Update a project', {
        description: 'OWNER or ADMIN.',
        requestBody: body('ProjectUpdate'),
        responses: { ...ok('Project updated', ref('Project')), ...errors(400, 401, 403, 404) },
      }),
      delete: op('Projects', 'Delete a project and its tasks', {
        description: 'OWNER or ADMIN.',
        responses: { ...noContent('Project deleted'), ...errors(400, 401, 403, 404) },
      }),
    },
    '/projects/{id}/tasks': {
      parameters: [pathId('id', 'Project id')],
      get: op('Tasks', 'List tasks with filters, search, sorting and pagination', {
        parameters: [
          query('status', status),
          query('assigneeId', { type: 'integer' }, 'Filter by assignee'),
          query('dueDate', date, 'Exact due date'),
          query('dueFrom', date, 'Due on or after'),
          query('dueTo', date, 'Due on or before'),
          query('search', { type: 'string', maxLength: 100 }, 'Searches title and description'),
          query(
            'sortBy',
            {
              type: 'string',
              enum: ['createdAt', 'updatedAt', 'dueDate', 'title', 'status'],
              default: 'createdAt',
            },
            'Tasks without due date are always last',
          ),
          query('order', { type: 'string', enum: ['asc', 'desc'], default: 'desc' }),
          ...paginationParams,
        ],
        responses: {
          ...ok('Tasks', ref('Task'), { paginated: true }),
          ...errors(400, 401, 403, 404),
        },
      }),
    },
    '/projects/{id}/stats': {
      parameters: [pathId('id', 'Project id')],
      get: op('Statistics', 'Project task counts by status and progress', {
        responses: { ...ok('Statistics', ref('ProjectStats')), ...errors(400, 401, 403, 404) },
      }),
    },

    '/tasks': {
      post: op('Tasks', 'Create a task', {
        description: 'Any workspace member.',
        requestBody: body('TaskInput'),
        responses: {
          ...ok('Task created', ref('Task'), { status: 201 }),
          ...errors(400, 401, 403, 404),
        },
      }),
    },
    '/tasks/{id}': {
      parameters: [pathId('id', 'Task id')],
      get: op('Tasks', 'Get a task', {
        responses: { ...ok('Task', ref('Task')), ...errors(400, 401, 403, 404) },
      }),
      patch: op('Tasks', 'Update a task', {
        description:
          'OWNER, ADMIN, the creator or the assignee. Changed fields are recorded in the activity log.',
        requestBody: body('TaskUpdate'),
        responses: { ...ok('Task updated', ref('Task')), ...errors(400, 401, 403, 404) },
      }),
      delete: op('Tasks', 'Delete a task', {
        description: 'OWNER, ADMIN or the creator.',
        responses: { ...noContent('Task deleted'), ...errors(400, 401, 403, 404) },
      }),
    },
    '/tasks/{id}/activity': {
      parameters: [pathId('id', 'Task id')],
      get: op('Tasks', 'Get the change history of a task (newest first)', {
        parameters: paginationParams,
        responses: {
          ...ok('Activity', ref('Activity'), { paginated: true }),
          ...errors(400, 401, 403, 404),
        },
      }),
    },
    '/tasks/{id}/comments': {
      parameters: [pathId('id', 'Task id')],
      get: op('Comments', 'List comments of a task (oldest first)', {
        parameters: paginationParams,
        responses: {
          ...ok('Comments', ref('Comment'), { paginated: true }),
          ...errors(400, 401, 403, 404),
        },
      }),
      post: op('Comments', 'Add a comment', {
        requestBody: body('CommentInput'),
        responses: {
          ...ok('Comment added', ref('Comment'), { status: 201 }),
          ...errors(400, 401, 403, 404),
        },
      }),
    },
    '/comments/{id}': {
      parameters: [pathId('id', 'Comment id')],
      patch: op('Comments', 'Edit a comment', {
        description: 'Author only.',
        requestBody: body('CommentInput'),
        responses: { ...ok('Comment updated', ref('Comment')), ...errors(400, 401, 403, 404) },
      }),
      delete: op('Comments', 'Delete a comment', {
        description: 'The author, OWNER or ADMIN.',
        responses: { ...noContent('Comment deleted'), ...errors(400, 401, 403, 404) },
      }),
    },
  },
};

export default openapi;
