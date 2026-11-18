# Kiến trúc và quyết định thiết kế

Tài liệu này giải thích cách TaskFlow được tổ chức và lý do của các lựa chọn chính. Thiết kế database
chi tiết (bảng, ràng buộc, index, quy tắc `ON DELETE`) nằm ở [erd.md](erd.md).

## 1. Luồng xử lý một request

Ví dụ `PATCH /api/v1/tasks/42` với body `{ "status": "DONE" }`:

1. **`checkOrigin`** — request thay đổi dữ liệu có header `Origin` lạ bị chặn `403`.
2. **`authenticate`** — đọc JWT từ cookie `taskflow_token`, xác minh chữ ký và hạn, gán `req.user.id`.
   Thiếu hoặc sai token → `401`.
3. **`validate(updateTaskSchema)`** — Joi kiểm tra `params` và `body`: `id` là số nguyên dương, `status`
   thuộc `TODO | IN_PROGRESS | DONE`, body có ít nhất một trường. Sai → `400` kèm lỗi từng trường.
4. **`taskController.update`** — lấy dữ liệu đã validate, gọi service, trả response chuẩn.
5. **`taskService.update`**
   - tìm task (`404` nếu không có), suy ra workspace qua project;
   - `workspaceAccess.requireRole` kiểm tra user là thành viên workspace (`403` nếu không);
   - kiểm tra quyền sửa: OWNER/ADMIN, người tạo hoặc người được giao;
   - kiểm tra quy tắc nghiệp vụ: người được giao phải là thành viên, deadline không ở quá khứ;
   - mở transaction: khóa dòng task (`SELECT ... FOR UPDATE`), tính các trường thay đổi, `UPDATE`,
     ghi `activity_logs` với giá trị cũ/mới, `COMMIT`.
6. **`taskRepository`** — chạy SQL tham số hóa trên client của transaction.
7. Lỗi ở bất kỳ bước nào được ném dưới dạng `ApiError` và **`errorHandler`** chuyển thành response lỗi
   chuẩn. Lỗi không lường trước trả `500` với thông báo chung, chi tiết chỉ ghi ở log server.

## 2. Phân lớp và dependency injection

| Lớp        | Trách nhiệm                                | Không làm                         |
| ---------- | ------------------------------------------ | --------------------------------- |
| Route      | Khai báo endpoint, gắn middleware          | Logic nghiệp vụ                   |
| Controller | Đọc request, gọi service, gửi response     | Truy vấn database, kiểm tra quyền |
| Service    | Quy tắc nghiệp vụ, phân quyền, transaction | Biết về `req`/`res`               |
| Repository | SQL, chuyển `snake_case` ↔ `camelCase`     | Quyết định nghiệp vụ              |

Mỗi module export một factory nhận dependency, ví dụ:

```js
createTaskService({
  taskRepository,
  projectRepository,
  memberRepository,
  activityRepository,
  workspaceAccess,
  runInTransaction,
  now,
});
```

[`container.js`](../backend/src/container.js) là nơi duy nhất nối các phần lại với nhau. Lợi ích:

- **Unit test** truyền repository giả và `runInTransaction: (work) => work(fakeClient)`, kiểm tra quy
  tắc mà không cần database. `now` cũng được inject để test quy tắc deadline ổn định.
- **Integration test** dùng app thật với database test riêng (`taskflow_test`), dữ liệu được
  `TRUNCATE` trước mỗi test.
- Service phụ thuộc vào "hợp đồng" của repository (các hàm `findById`, `create`...) chứ không phụ thuộc
  vào `pg`, nên có thể thay implementation (DIP).

JavaScript không có interface, nên SOLID được áp dụng ở mức cần thiết: tách trách nhiệm theo lớp (SRP),
chia repository nhỏ theo bảng thay vì một repository lớn (ISP), inject dependency (DIP). Không tạo lớp
trừu tượng chỉ để "có SOLID".

## 3. Xác thực

- Mật khẩu hash bằng **bcrypt** (10 vòng mặc định), không bao giờ trả `passwordHash` ra ngoài.
- Đăng nhập sai email hay sai mật khẩu trả cùng một thông báo, không lộ email nào đã đăng ký.
- **JWT HS256**, thời hạn mặc định 1 giờ, thuật toán được khóa khi verify (token `alg: none` bị từ chối).
- Token chỉ nằm trong cookie **`HttpOnly`**, `SameSite=Lax`, `Path=/api`, `Secure` khi chạy HTTPS.
  JavaScript của trang không đọc được token, nên lỗi XSS không lấy được phiên đăng nhập.

### Chống CSRF

Cookie được trình duyệt gửi tự động, nên cần chống request giả mạo từ trang khác:

1. `SameSite=Lax`: trình duyệt không gửi cookie trong request `POST/PATCH/DELETE` từ site khác.
2. Middleware `checkOrigin`: request thay đổi dữ liệu có `Origin` không phải API hoặc frontend được cấu
   hình bị từ chối.
3. Không có endpoint `GET` nào thay đổi dữ liệu.

### Đánh đổi

Không có refresh token: hết 1 giờ người dùng đăng nhập lại. Logout xóa cookie nhưng token đã phát hành
vẫn hợp lệ tới khi hết hạn. Nếu cần thu hồi tức thì, có thể thêm bảng phiên hoặc refresh token lưu trong
database.

## 4. Phân quyền ở cấp tài nguyên

Đã đăng nhập chưa đủ: user A có JWT hợp lệ nhưng không thuộc workspace chứa task X thì không được đọc
hay sửa task X.

- `workspaceAccess.requireRole(workspaceId, userId, roles)` là điểm kiểm tra chung:
  workspace không tồn tại → `404`, không phải thành viên hoặc vai trò không đủ → `403`.
- Với project, task, comment: service tải tài nguyên trước, suy ra `workspaceId` từ nó (task → project →
  workspace), rồi mới kiểm tra quyền. Client không thể "chọn" workspace để vượt qua kiểm tra.
- Kiểm tra quyền đặt trong service chứ không ở middleware vì workspace phải suy ra từ tài nguyên, và để
  unit test được trực tiếp.
- Frontend có [`permissions.js`](../frontend/src/utils/permissions.js) với cùng quy tắc, nhưng chỉ để ẩn
  nút. Backend vẫn là nơi quyết định.

## 5. Transaction

Các nghiệp vụ nhiều bước chạy trong một transaction (`withTransaction` → `BEGIN` / `COMMIT` /
`ROLLBACK`):

| Nghiệp vụ            | Các thao tác                                             |
| -------------------- | -------------------------------------------------------- |
| Tạo workspace        | `INSERT workspaces` + `INSERT workspace_members` (OWNER) |
| Xóa thành viên       | `DELETE workspace_members` + bỏ giao task của họ         |
| Tạo / sửa project    | thay đổi project + ghi activity                          |
| Tạo / sửa / xóa task | thay đổi task + ghi activity                             |

Nếu bước sau lỗi, bước trước được rollback: không có workspace thiếu OWNER, không có thay đổi task mà
không có lịch sử. Khi sửa task, dòng task được khóa bằng `FOR UPDATE` để hai request đồng thời không ghi
sai giá trị "trước" vào activity log.

Ràng buộc trong database (`UNIQUE`, `CHECK`, `FOREIGN KEY`) là lớp bảo vệ cuối cùng khi có race
condition; `errorHandler` chuyển lỗi PostgreSQL tương ứng thành `409` hoặc `400`.

## 6. Lọc, tìm kiếm, sắp xếp, phân trang

- Tham số được Joi validate và ép kiểu (`page`, `limit` tối đa 100, `status`, ngày dạng `YYYY-MM-DD`).
- Mọi giá trị đi vào SQL qua tham số `$1, $2...`. `sortBy` chỉ nhận tên trong danh sách cho phép và được
  ánh xạ sang cột cố định; không có chuỗi nào từ người dùng được ghép vào câu SQL.
- Tìm kiếm dùng `ILIKE` trên tiêu đề và mô tả; ký tự `%` và `_` của người dùng được escape.
- Một truy vấn trả cả trang dữ liệu lẫn tổng số nhờ `COUNT(*) OVER ()`.
- Phân trang dùng `LIMIT/OFFSET`, đơn giản và đủ cho quy mô một project. Với dữ liệu rất lớn, nên chuyển
  sang keyset pagination (`WHERE (created_at, id) < (...)`) để không phải bỏ qua nhiều dòng.
- Index `(project_id, status)` và `(project_id, due_date)` phục vụ Kanban và lọc deadline. `ILIKE '%x%'`
  không dùng được B-tree; khi cần có thể thêm index `pg_trgm`.

## 7. Activity log

- Ghi `TASK_CREATED`, `TASK_UPDATED` (chỉ các trường thực sự đổi, dạng `{ field: { from, to } }`),
  `TASK_DELETED`, `PROJECT_CREATED`, `PROJECT_UPDATED`.
- `activity_logs.task_id` dùng `ON DELETE SET NULL` nên khi task bị xóa, dòng "đã xóa" vẫn còn trong lịch
  sử project.
- Cập nhật không thay đổi gì thì không ghi log và không chạy `UPDATE`.

## 8. Frontend

- **Gọi API:** một instance Axios (`withCredentials`), interceptor bóc envelope và xử lý `401` toàn cục
  bằng cách đưa người dùng về trang đăng nhập.
- **Phiên:** `AuthProvider` gọi `/auth/me` khi tải trang để biết cookie còn hợp lệ không; không lưu gì
  trong `localStorage`.
- **Cùng origin:** Vite (dev) và nginx (Docker) proxy `/api` sang backend, nên cookie `SameSite=Lax` hoạt
  động mà không cần CORS.
- **Kanban:** mỗi cột là một danh sách phân trang theo trạng thái. Kéo thả cập nhật giao diện ngay
  (optimistic update), gửi `PATCH`, và trả task về cột cũ nếu API từ chối (ví dụ `403`).
- **Bộ lọc** lưu trong URL (`?search=&assignee=&sort=`) nên có thể chia sẻ link; tìm kiếm có debounce.
- **Trạng thái** loading / empty / error ở mọi màn hình; `403`/`404` hiển thị thành trang "không khả dụng".

## 9. Hướng mở rộng

- Refresh token và thu hồi phiên.
- Rate limiting cho `/auth/login`.
- Thông báo (email, realtime qua WebSocket) khi được giao task; service tạo task chỉ cần gọi thêm một
  `notifier` được inject, không phải sửa logic hiện có.
- Index `pg_trgm` cho tìm kiếm, keyset pagination cho danh sách lớn.
- Thứ tự task trong cột (cột `position`) để sắp xếp bằng kéo thả.
