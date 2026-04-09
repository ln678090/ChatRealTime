# ChatRealTime Service

**ChatRealTime** là service chat realtime tích hợp với ConnectHub, hỗ trợ nhắn tin thời gian thực và gọi video P2P. Dự án tập trung vào xử lý realtime, xác thực dùng shared JWT và đồng bộ người dùng từ hệ thống chính.

## Mục tiêu dự án

Xây dựng một service độc lập cho:
- Chat text realtime
- Quản lý conversation và message
- Gọi video peer-to-peer
- Kết nối với hệ thống ConnectHub hiện có

## Tech Stack

- Java
- Spring Boot
- Spring Security
- WebSocket
- WebRTC
- PostgreSQL
- JWT
- RestClient

## Chức năng chính

- Chat text realtime bằng WebSocket
- Gọi video P2P bằng WebRTC
- Signaling server cho video call
- Xác thực shared JWT từ ConnectHub
- Đồng bộ user từ hệ thống chính
- Quản lý conversation / message / permission
- Lưu trữ message an toàn trong PostgreSQL

## Điểm nhấn kỹ thuật

### 1. Realtime Messaging
- Sử dụng WebSocket để truyền nhận tin nhắn tức thời
- Tối ưu cho trải nghiệm chat liên tục giữa nhiều người dùng

### 2. Video Call với WebRTC
- Áp dụng WebRTC cho kết nối P2P
- Sử dụng signaling server để trao đổi SDP / ICE candidates trước khi thiết lập kết nối

### 3. Shared Authentication
- Không tách riêng hệ user
- Service dùng **shared JWT** từ ConnectHub để xác thực người dùng thống nhất

### 4. Đồng bộ dữ liệu người dùng
- Tích hợp với ConnectHub qua RestClient
- Giúp service chat giữ dữ liệu user nhất quán với hệ thống chính

### 5. Bảo mật message
- Message được xử lý theo hướng tăng bảo mật lưu trữ
- Thiết kế ưu tiên an toàn dữ liệu và hiệu năng truy xuất

## Luồng hoạt động

1. User đăng nhập tại ConnectHub
2. Client mang JWT sang ChatRealTime
3. Chat service xác thực token
4. User kết nối WebSocket để chat realtime
5. Khi gọi video, service xử lý signaling cho WebRTC
6. Message và conversation được lưu vào database

## Kiến trúc module

- Auth / JWT validation
- User synchronization
- Conversation management
- Message management
- WebSocket realtime gateway
- WebRTC signaling

## Cách chạy local

### Yêu cầu
- JDK 21
- PostgreSQL
- ConnectHub backend đang chạy (nếu cần đồng bộ user)

### Run
```bash
git clone https://github.com/ln678090/ChatRealTime.git
cd ChatRealTime
./gradlew bootRun
```

## Ví dụ use case

- Người dùng A và B đã đăng nhập từ ConnectHub
- Cả hai mở chat
- Tin nhắn được đẩy realtime qua WebSocket
- Khi bấm gọi video, service xử lý signaling để WebRTC tạo kết nối P2P

## Vai trò của tôi

- Thiết kế service chat độc lập
- Triển khai WebSocket cho chat realtime
- Xây dựng signaling server cho WebRTC
- Tích hợp shared JWT với hệ thống chính
- Thiết kế database cho conversation và message

## Hướng phát triển tiếp theo

- Group call
- Tin nhắn file / image
- Message status (sent / delivered / seen)
- Retry / reconnect strategy tốt hơn
- Logging và monitoring realtime events

## Tác giả

**Nguyễn Phúc Lâm**  
Backend Developer Intern (Java)  
Email: ln678090@gmail.com