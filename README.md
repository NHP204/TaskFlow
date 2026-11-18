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

Yêu cầu: Node.js >= 20, Docker.

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

## Tài liệu

- [Đặc tả dự án](docs/project-specification.md)
- [Thiết kế database (ERD)](docs/erd.md)

> README sẽ được hoàn thiện ở các giai đoạn sau (cài đặt, chạy dự án, biến môi trường, demo).
