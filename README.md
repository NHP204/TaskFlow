# TaskFlow — Team Task Management System

[![CI](https://github.com/NHP204/TaskFlow/actions/workflows/ci.yml/badge.svg)](https://github.com/NHP204/TaskFlow/actions/workflows/ci.yml)

Ứng dụng quản lý công việc nhóm: workspace, thành viên, project, task và lịch sử hoạt động.

## Công nghệ

- **Backend:** Node.js, Express.js, PostgreSQL (`pg`), JWT, bcrypt
- **Frontend:** React (Vite)
- **Testing:** Jest, Supertest
- **Docs:** Swagger / OpenAPI
- **DevOps:** Docker Compose, GitHub Actions

## Cấu trúc thư mục

```text
taskflow/
├── backend/    # REST API (Express, 3-layer architecture)
├── frontend/   # React UI
└── docs/       # Đặc tả, ERD, API specification
```

## Chạy backend (môi trường phát triển)

Yêu cầu: Node.js >= 20.11, Docker. Backend dùng ES Modules (`"type": "module"`).

```bash
# 1. Khởi động PostgreSQL (tạo sẵn 2 database: taskflow_dev và taskflow_test)
docker compose up -d

# 2. Cài đặt và cấu hình
cd backend
npm install
cp .env.example .env
cp .env.test.example .env.test

# 3. Tạo bảng
npm run migrate

# 4. (Tùy chọn) Nạp dữ liệu demo — xóa toàn bộ dữ liệu dev hiện có
npm run seed

# 5. Chạy server
npm run dev
```

- API: http://localhost:3000/api/v1
- Swagger UI: http://localhost:3000/api-docs

Tài khoản demo sau khi seed (mật khẩu `password123`): `owner@taskflow.dev`, `admin@taskflow.dev`,
`dev@taskflow.dev`, `designer@taskflow.dev`, và `guest@taskflow.dev` (không thuộc workspace nào).

| Lệnh                   | Mô tả                                                |
| ---------------------- | ---------------------------------------------------- |
| `npm run dev`          | Chạy server với nodemon                              |
| `npm run migrate`      | Áp dụng migration                                    |
| `npm run migrate:down` | Rollback migration gần nhất                          |
| `npm test`             | Chạy toàn bộ test (dùng database `taskflow_test`)    |
| `npm run lint`         | Kiểm tra ESLint                                      |
| `npm run format`       | Format code bằng Prettier                            |
| `npm run seed`         | Reset database dev và nạp dữ liệu demo               |
| `npm run docs`         | Validate OpenAPI và sinh `docs/api-specification.md` |

## Chạy bằng Docker

Chạy cả backend và PostgreSQL trong container (backend tự chạy migration khi khởi động):

```bash
cp .env.example .env        # đặt JWT_SECRET (bắt buộc)
docker compose --profile app up -d --build
```

API ở http://localhost:3000, Swagger UI ở http://localhost:3000/api-docs. Lệnh `docker compose up -d`
không có `--profile app` chỉ chạy PostgreSQL, dùng khi phát triển với `npm run dev`.

## CI

GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) chạy trên mọi push và pull request:

- ESLint, Prettier check, kiểm tra `docs/api-specification.md` khớp với OpenAPI spec
- Toàn bộ unit và integration test với PostgreSQL service, kèm báo cáo coverage
- Build Docker image của backend

## API

Base URL: `/api/v1`. Endpoint cần đăng nhập gửi header `Authorization: Bearer <accessToken>`.

| Method | Endpoint                          | Auth | Mô tả                                               |
| ------ | --------------------------------- | ---- | --------------------------------------------------- |
| GET    | `/health`                         |      | Kiểm tra server và database                         |
| POST   | `/auth/register`                  |      | Đăng ký                                             |
| POST   | `/auth/login`                     |      | Đăng nhập, nhận JWT                                 |
| GET    | `/auth/me`                        | ✓    | Thông tin user hiện tại                             |
| POST   | `/workspaces`                     | ✓    | Tạo workspace (người tạo là OWNER)                  |
| GET    | `/workspaces`                     | ✓    | Danh sách workspace của user                        |
| GET    | `/workspaces/:id`                 | ✓    | Chi tiết workspace và thành viên                    |
| PATCH  | `/workspaces/:id`                 | ✓    | Cập nhật (OWNER, ADMIN)                             |
| DELETE | `/workspaces/:id`                 | ✓    | Xóa (OWNER)                                         |
| POST   | `/workspaces/:id/members`         | ✓    | Thêm thành viên theo email (OWNER, ADMIN)           |
| PATCH  | `/workspaces/:id/members/:userId` | ✓    | Đổi vai trò (OWNER)                                 |
| DELETE | `/workspaces/:id/members/:userId` | ✓    | Xóa thành viên hoặc tự rời workspace                |
| GET    | `/workspaces/:id/projects`        | ✓    | Danh sách project của workspace                     |
| POST   | `/projects`                       | ✓    | Tạo project (OWNER, ADMIN)                          |
| GET    | `/projects/:id`                   | ✓    | Chi tiết project                                    |
| PATCH  | `/projects/:id`                   | ✓    | Cập nhật project (OWNER, ADMIN)                     |
| DELETE | `/projects/:id`                   | ✓    | Xóa project (OWNER, ADMIN)                          |
| GET    | `/projects/:id/tasks`             | ✓    | Danh sách task: lọc, tìm kiếm, sắp xếp, phân trang  |
| POST   | `/tasks`                          | ✓    | Tạo task                                            |
| GET    | `/tasks/:id`                      | ✓    | Chi tiết task                                       |
| PATCH  | `/tasks/:id`                      | ✓    | Cập nhật task (quản lý, người tạo, người được giao) |
| DELETE | `/tasks/:id`                      | ✓    | Xóa task (quản lý, người tạo)                       |
| GET    | `/tasks/:id/activity`             | ✓    | Lịch sử thay đổi của task                           |
| GET    | `/tasks/:id/comments`             | ✓    | Danh sách bình luận                                 |
| POST   | `/tasks/:id/comments`             | ✓    | Thêm bình luận                                      |
| PATCH  | `/comments/:id`                   | ✓    | Sửa bình luận (tác giả)                             |
| DELETE | `/comments/:id`                   | ✓    | Xóa bình luận (tác giả, OWNER, ADMIN)               |
| GET    | `/projects/:id/stats`             | ✓    | Thống kê task theo trạng thái, tiến độ, quá hạn     |
| GET    | `/workspaces/:id/stats`           | ✓    | Thống kê workspace và tiến độ từng project          |

### Query của `GET /projects/:id/tasks`

| Tham số            | Ví dụ         | Mô tả                                                  |
| ------------------ | ------------- | ------------------------------------------------------ |
| `status`           | `IN_PROGRESS` | `TODO`, `IN_PROGRESS` hoặc `DONE`                      |
| `assigneeId`       | `5`           | Người phụ trách                                        |
| `dueDate`          | `2026-12-31`  | Đúng ngày deadline                                     |
| `dueFrom`, `dueTo` | `2026-12-01`  | Khoảng deadline (bao gồm hai đầu)                      |
| `search`           | `login`       | Tìm trong tiêu đề và mô tả, không phân biệt hoa thường |
| `sortBy`           | `dueDate`     | `createdAt`, `updatedAt`, `dueDate`, `title`, `status` |
| `order`            | `asc`         | `asc` hoặc `desc` (mặc định `desc`)                    |
| `page`, `limit`    | `1`, `20`     | Phân trang, `limit` tối đa 100                         |

Response danh sách có thêm `meta: { page, limit, total, totalPages }`.

### Phân quyền trong workspace

| Hành động       | OWNER | ADMIN      | MEMBER       |
| --------------- | ----- | ---------- | ------------ |
| Xem workspace   | ✓     | ✓          | ✓            |
| Sửa workspace   | ✓     | ✓          |              |
| Xóa workspace   | ✓     |            |              |
| Thêm thành viên | ✓     | chỉ MEMBER |              |
| Đổi vai trò     | ✓     |            |              |
| Xóa thành viên  | ✓     | chỉ MEMBER | chỉ bản thân |

OWNER không thể bị xóa hoặc đổi vai trò. User không phải thành viên nhận `403`.

## Tài liệu

- [Đặc tả dự án](docs/project-specification.md)
- [Thiết kế database (ERD)](docs/erd.md)
- [API specification](docs/api-specification.md) (sinh từ OpenAPI, bản tương tác tại `/api-docs`)

> README sẽ được hoàn thiện ở các giai đoạn sau (cài đặt, chạy dự án, biến môi trường, demo).
