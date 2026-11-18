# TaskFlow API Specification

> Generated from `backend/src/docs/openapi.js` by `npm run docs`. Do not edit by hand.
> Interactive version: `http://localhost:3000/api-docs`.

REST API for team task management: workspaces, members, projects, tasks, comments and activity history.

Authenticate with `POST /auth/login`, then send `Authorization: Bearer <accessToken>`.

Base URL: `/api/v1`

## Response format

Success: `{ "success": true, "data": ..., "message": "..." }` (lists add `meta: { page, limit, total, totalPages }`).

Error: `{ "success": false, "data": null, "message": "...", "errors": [{ "field", "message" }] }`.

| Status | Meaning |
| --- | --- |
| 200 | OK |
| 201 | Created |
| 204 | Deleted, no body |
| 400 | Validation failed or business rule violated |
| 401 | Missing, invalid or expired token |
| 403 | Not a member of the workspace or insufficient role |
| 404 | Resource not found |
| 409 | Conflict with existing data |

## Auth

### POST `/auth/register`

Register a new account.

**Auth:** none

**Body:** [RegisterInput](#registerinput)

**Responses:** `201` User registered → `data`: AuthResult; `400` Validation failed or business rule violated; `409` Conflict with existing data

### POST `/auth/login`

Log in and receive an access token.

**Auth:** none

**Body:** [LoginInput](#logininput)

**Responses:** `200` Logged in → `data`: AuthResult; `400` Validation failed or business rule violated; `401` Missing, invalid or expired token

### GET `/auth/me`

Get the current user.

**Auth:** Bearer token

**Responses:** `200` Current user → `data`: User; `401` Missing, invalid or expired token

## Workspaces

### GET `/workspaces`

List workspaces the current user belongs to.

**Auth:** Bearer token

**Responses:** `200` Workspaces → `data`: Workspace[]; `401` Missing, invalid or expired token

### POST `/workspaces`

Create a workspace (creator becomes OWNER).

**Auth:** Bearer token

**Body:** [WorkspaceInput](#workspaceinput)

**Responses:** `201` Workspace created → `data`: Workspace; `400` Validation failed or business rule violated; `401` Missing, invalid or expired token

### GET `/workspaces/{id}`

Get workspace detail with members.

Any member.

**Auth:** Bearer token

| Parameter | In | Type | Notes |
| --- | --- | --- | --- |
| `id` | path | integer | Workspace id. min 1 |

**Responses:** `200` Workspace → `data`: WorkspaceDetail; `400` Validation failed or business rule violated; `401` Missing, invalid or expired token; `403` Not a member of the workspace or insufficient role; `404` Resource not found

### PATCH `/workspaces/{id}`

Update a workspace.

OWNER or ADMIN.

**Auth:** Bearer token

| Parameter | In | Type | Notes |
| --- | --- | --- | --- |
| `id` | path | integer | Workspace id. min 1 |

**Body:** [WorkspaceUpdate](#workspaceupdate)

**Responses:** `200` Workspace updated → `data`: Workspace; `400` Validation failed or business rule violated; `401` Missing, invalid or expired token; `403` Not a member of the workspace or insufficient role; `404` Resource not found

### DELETE `/workspaces/{id}`

Delete a workspace and everything in it.

OWNER only.

**Auth:** Bearer token

| Parameter | In | Type | Notes |
| --- | --- | --- | --- |
| `id` | path | integer | Workspace id. min 1 |

**Responses:** `204` Workspace deleted; `400` Validation failed or business rule violated; `401` Missing, invalid or expired token; `403` Not a member of the workspace or insufficient role; `404` Resource not found

## Members

### POST `/workspaces/{id}/members`

Add a member by email.

OWNER or ADMIN. Only the OWNER can add ADMINs.

**Auth:** Bearer token

| Parameter | In | Type | Notes |
| --- | --- | --- | --- |
| `id` | path | integer | Workspace id. min 1 |

**Body:** [AddMemberInput](#addmemberinput)

**Responses:** `201` Member added → `data`: Member; `400` Validation failed or business rule violated; `401` Missing, invalid or expired token; `403` Not a member of the workspace or insufficient role; `404` Resource not found; `409` Conflict with existing data

### PATCH `/workspaces/{id}/members/{userId}`

Change a member's role.

OWNER only. The OWNER's own role cannot be changed.

**Auth:** Bearer token

| Parameter | In | Type | Notes |
| --- | --- | --- | --- |
| `id` | path | integer | Workspace id. min 1 |
| `userId` | path | integer | User id of the member. min 1 |

**Body:** [RoleInput](#roleinput)

**Responses:** `200` Role updated → `data`: Member; `400` Validation failed or business rule violated; `401` Missing, invalid or expired token; `403` Not a member of the workspace or insufficient role; `404` Resource not found

### DELETE `/workspaces/{id}/members/{userId}`

Remove a member or leave the workspace.

OWNER removes anyone except themselves, ADMIN removes MEMBERs, anyone can leave. The OWNER cannot be removed. The member's tasks in this workspace are unassigned.

**Auth:** Bearer token

| Parameter | In | Type | Notes |
| --- | --- | --- | --- |
| `id` | path | integer | Workspace id. min 1 |
| `userId` | path | integer | User id of the member. min 1 |

**Responses:** `204` Member removed; `400` Validation failed or business rule violated; `401` Missing, invalid or expired token; `403` Not a member of the workspace or insufficient role; `404` Resource not found

## Projects

### GET `/workspaces/{id}/projects`

List projects of a workspace.

**Auth:** Bearer token

| Parameter | In | Type | Notes |
| --- | --- | --- | --- |
| `id` | path | integer | Workspace id. min 1 |

**Responses:** `200` Projects → `data`: Project[]; `400` Validation failed or business rule violated; `401` Missing, invalid or expired token; `403` Not a member of the workspace or insufficient role; `404` Resource not found

### POST `/projects`

Create a project in a workspace.

OWNER or ADMIN of the workspace.

**Auth:** Bearer token

**Body:** [ProjectInput](#projectinput)

**Responses:** `201` Project created → `data`: Project; `400` Validation failed or business rule violated; `401` Missing, invalid or expired token; `403` Not a member of the workspace or insufficient role; `404` Resource not found

### GET `/projects/{id}`

Get a project.

**Auth:** Bearer token

| Parameter | In | Type | Notes |
| --- | --- | --- | --- |
| `id` | path | integer | Project id. min 1 |

**Responses:** `200` Project → `data`: Project; `400` Validation failed or business rule violated; `401` Missing, invalid or expired token; `403` Not a member of the workspace or insufficient role; `404` Resource not found

### PATCH `/projects/{id}`

Update a project.

OWNER or ADMIN.

**Auth:** Bearer token

| Parameter | In | Type | Notes |
| --- | --- | --- | --- |
| `id` | path | integer | Project id. min 1 |

**Body:** [ProjectUpdate](#projectupdate)

**Responses:** `200` Project updated → `data`: Project; `400` Validation failed or business rule violated; `401` Missing, invalid or expired token; `403` Not a member of the workspace or insufficient role; `404` Resource not found

### DELETE `/projects/{id}`

Delete a project and its tasks.

OWNER or ADMIN.

**Auth:** Bearer token

| Parameter | In | Type | Notes |
| --- | --- | --- | --- |
| `id` | path | integer | Project id. min 1 |

**Responses:** `204` Project deleted; `400` Validation failed or business rule violated; `401` Missing, invalid or expired token; `403` Not a member of the workspace or insufficient role; `404` Resource not found

## Tasks

### GET `/projects/{id}/tasks`

List tasks with filters, search, sorting and pagination.

**Auth:** Bearer token

| Parameter | In | Type | Notes |
| --- | --- | --- | --- |
| `id` | path | integer | Project id. min 1 |
| `status` | query | `TODO` \| `IN_PROGRESS` \| `DONE` |  |
| `assigneeId` | query | integer | Filter by assignee |
| `dueDate` | query | string (date) | Exact due date |
| `dueFrom` | query | string (date) | Due on or after |
| `dueTo` | query | string (date) | Due on or before |
| `search` | query | string | Searches title and description. max length 100 |
| `sortBy` | query | `createdAt` \| `updatedAt` \| `dueDate` \| `title` \| `status` | Tasks without due date are always last. default `createdAt` |
| `order` | query | `asc` \| `desc` | default `desc` |
| `page` | query | integer | Page number. min 1, default `1` |
| `limit` | query | integer | Items per page. min 1, max 100, default `20` |

**Responses:** `200` Tasks → `data`: Task[] (paginated, with `meta`); `400` Validation failed or business rule violated; `401` Missing, invalid or expired token; `403` Not a member of the workspace or insufficient role; `404` Resource not found

### POST `/tasks`

Create a task.

Any workspace member.

**Auth:** Bearer token

**Body:** [TaskInput](#taskinput)

**Responses:** `201` Task created → `data`: Task; `400` Validation failed or business rule violated; `401` Missing, invalid or expired token; `403` Not a member of the workspace or insufficient role; `404` Resource not found

### GET `/tasks/{id}`

Get a task.

**Auth:** Bearer token

| Parameter | In | Type | Notes |
| --- | --- | --- | --- |
| `id` | path | integer | Task id. min 1 |

**Responses:** `200` Task → `data`: Task; `400` Validation failed or business rule violated; `401` Missing, invalid or expired token; `403` Not a member of the workspace or insufficient role; `404` Resource not found

### PATCH `/tasks/{id}`

Update a task.

OWNER, ADMIN, the creator or the assignee. Changed fields are recorded in the activity log.

**Auth:** Bearer token

| Parameter | In | Type | Notes |
| --- | --- | --- | --- |
| `id` | path | integer | Task id. min 1 |

**Body:** [TaskUpdate](#taskupdate)

**Responses:** `200` Task updated → `data`: Task; `400` Validation failed or business rule violated; `401` Missing, invalid or expired token; `403` Not a member of the workspace or insufficient role; `404` Resource not found

### DELETE `/tasks/{id}`

Delete a task.

OWNER, ADMIN or the creator.

**Auth:** Bearer token

| Parameter | In | Type | Notes |
| --- | --- | --- | --- |
| `id` | path | integer | Task id. min 1 |

**Responses:** `204` Task deleted; `400` Validation failed or business rule violated; `401` Missing, invalid or expired token; `403` Not a member of the workspace or insufficient role; `404` Resource not found

### GET `/tasks/{id}/activity`

Get the change history of a task (newest first).

**Auth:** Bearer token

| Parameter | In | Type | Notes |
| --- | --- | --- | --- |
| `id` | path | integer | Task id. min 1 |
| `page` | query | integer | Page number. min 1, default `1` |
| `limit` | query | integer | Items per page. min 1, max 100, default `20` |

**Responses:** `200` Activity → `data`: Activity[] (paginated, with `meta`); `400` Validation failed or business rule violated; `401` Missing, invalid or expired token; `403` Not a member of the workspace or insufficient role; `404` Resource not found

## Comments

### GET `/tasks/{id}/comments`

List comments of a task (oldest first).

**Auth:** Bearer token

| Parameter | In | Type | Notes |
| --- | --- | --- | --- |
| `id` | path | integer | Task id. min 1 |
| `page` | query | integer | Page number. min 1, default `1` |
| `limit` | query | integer | Items per page. min 1, max 100, default `20` |

**Responses:** `200` Comments → `data`: Comment[] (paginated, with `meta`); `400` Validation failed or business rule violated; `401` Missing, invalid or expired token; `403` Not a member of the workspace or insufficient role; `404` Resource not found

### POST `/tasks/{id}/comments`

Add a comment.

**Auth:** Bearer token

| Parameter | In | Type | Notes |
| --- | --- | --- | --- |
| `id` | path | integer | Task id. min 1 |

**Body:** [CommentInput](#commentinput)

**Responses:** `201` Comment added → `data`: Comment; `400` Validation failed or business rule violated; `401` Missing, invalid or expired token; `403` Not a member of the workspace or insufficient role; `404` Resource not found

### PATCH `/comments/{id}`

Edit a comment.

Author only.

**Auth:** Bearer token

| Parameter | In | Type | Notes |
| --- | --- | --- | --- |
| `id` | path | integer | Comment id. min 1 |

**Body:** [CommentInput](#commentinput)

**Responses:** `200` Comment updated → `data`: Comment; `400` Validation failed or business rule violated; `401` Missing, invalid or expired token; `403` Not a member of the workspace or insufficient role; `404` Resource not found

### DELETE `/comments/{id}`

Delete a comment.

The author, OWNER or ADMIN.

**Auth:** Bearer token

| Parameter | In | Type | Notes |
| --- | --- | --- | --- |
| `id` | path | integer | Comment id. min 1 |

**Responses:** `204` Comment deleted; `400` Validation failed or business rule violated; `401` Missing, invalid or expired token; `403` Not a member of the workspace or insufficient role; `404` Resource not found

## Statistics

### GET `/workspaces/{id}/stats`

Workspace task statistics and per-project progress.

**Auth:** Bearer token

| Parameter | In | Type | Notes |
| --- | --- | --- | --- |
| `id` | path | integer | Workspace id. min 1 |

**Responses:** `200` Statistics → `data`: WorkspaceStats; `400` Validation failed or business rule violated; `401` Missing, invalid or expired token; `403` Not a member of the workspace or insufficient role; `404` Resource not found

### GET `/projects/{id}/stats`

Project task counts by status and progress.

**Auth:** Bearer token

| Parameter | In | Type | Notes |
| --- | --- | --- | --- |
| `id` | path | integer | Project id. min 1 |

**Responses:** `200` Statistics → `data`: ProjectStats; `400` Validation failed or business rule violated; `401` Missing, invalid or expired token; `403` Not a member of the workspace or insufficient role; `404` Resource not found

## Health

### GET `/health`

Check API and database status.

**Auth:** none

**Responses:** `200` Service is healthy → `data`: object; `503` Database is unavailable

## Request bodies

### RegisterInput

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `email` | string (email) | yes |  |
| `password` | string | yes | min length 8, max length 72 |
| `fullName` | string | yes | max length 100 |

### LoginInput

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `email` | string (email) | yes |  |
| `password` | string | yes |  |

### WorkspaceInput

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | yes | max length 100 |
| `description` | string, nullable |  | max length 1000 |

### WorkspaceUpdate

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string |  | max length 100 |
| `description` | string, nullable |  | max length 1000 |

At least one field is required.

### AddMemberInput

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `email` | string (email) | yes |  |
| `role` | `ADMIN` \| `MEMBER` |  | default `MEMBER` |

### RoleInput

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `role` | `ADMIN` \| `MEMBER` | yes |  |

### ProjectInput

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `workspaceId` | integer | yes |  |
| `name` | string | yes | max length 100 |
| `description` | string, nullable |  | max length 2000 |

### ProjectUpdate

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string |  | max length 100 |
| `description` | string, nullable |  | max length 2000 |

At least one field is required.

### TaskInput

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `projectId` | integer | yes |  |
| `title` | string | yes | max length 200 |
| `description` | string, nullable |  | max length 5000 |
| `status` | `TODO` \| `IN_PROGRESS` \| `DONE` |  | default `TODO` |
| `assigneeId` | integer, nullable |  | Must be a workspace member |
| `dueDate` | string (date), nullable |  | Cannot be in the past |

### TaskUpdate

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `title` | string |  | max length 200 |
| `description` | string, nullable |  | max length 5000 |
| `status` | `TODO` \| `IN_PROGRESS` \| `DONE` |  |  |
| `assigneeId` | integer, nullable |  |  |
| `dueDate` | string (date), nullable |  |  |

At least one field is required.

### CommentInput

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `content` | string | yes | max length 2000 |
