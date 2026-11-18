# TaskFlow — Team Task Management System

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

# 4. Chạy server (http://localhost:3000/api/v1/health)
npm run dev
```

| Lệnh                   | Mô tả                                             |
| ---------------------- | ------------------------------------------------- |
| `npm run dev`          | Chạy server với nodemon                           |
| `npm run migrate`      | Áp dụng migration                                 |
| `npm run migrate:down` | Rollback migration gần nhất                       |
| `npm test`             | Chạy toàn bộ test (dùng database `taskflow_test`) |
| `npm run lint`         | Kiểm tra ESLint                                   |
| `npm run format`       | Format code bằng Prettier                         |

## API

Base URL: `/api/v1`. Endpoint cần đăng nhập gửi header `Authorization: Bearer <accessToken>`.

| Method | Endpoint                          | Auth | Mô tả                                     |
| ------ | --------------------------------- | ---- | ----------------------------------------- |
| GET    | `/health`                         |      | Kiểm tra server và database               |
| POST   | `/auth/register`                  |      | Đăng ký                                   |
| POST   | `/auth/login`                     |      | Đăng nhập, nhận JWT                       |
| GET    | `/auth/me`                        | ✓    | Thông tin user hiện tại                   |
| POST   | `/workspaces`                     | ✓    | Tạo workspace (người tạo là OWNER)        |
| GET    | `/workspaces`                     | ✓    | Danh sách workspace của user              |
| GET    | `/workspaces/:id`                 | ✓    | Chi tiết workspace và thành viên          |
| PATCH  | `/workspaces/:id`                 | ✓    | Cập nhật (OWNER, ADMIN)                   |
| DELETE | `/workspaces/:id`                 | ✓    | Xóa (OWNER)                               |
| POST   | `/workspaces/:id/members`         | ✓    | Thêm thành viên theo email (OWNER, ADMIN) |
| PATCH  | `/workspaces/:id/members/:userId` | ✓    | Đổi vai trò (OWNER)                       |
| DELETE | `/workspaces/:id/members/:userId` | ✓    | Xóa thành viên hoặc tự rời workspace      |

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

> README sẽ được hoàn thiện ở các giai đoạn sau (cài đặt, chạy dự án, biến môi trường, demo).
