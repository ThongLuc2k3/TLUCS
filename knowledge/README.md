# Kho tri thức RAG TLUCS

Mỗi tài liệu có metadata `domain`, `risk_level`, `authority`, `reviewed_at`, `tags` và cây H1/H2/H3.
Pipeline chuẩn hóa truy vấn, mở rộng ý định, kết hợp keyword với pgvector bằng RRF, hiệu chỉnh về
confidence chung và chỉ trả kết quả từ 85% trở lên. LLM chỉ soạn từ các chunk đạt ngưỡng và luôn
trích nguồn; nếu không đạt, hệ thống ghi nhận khoảng trống rồi gợi ý diễn đàn hoặc Bảng yêu cầu.

Nội dung cộng đồng chỉ được ingest sau opt-in và kiểm duyệt. Bài trả phí chỉ index preview; tóm tắt
phiên cần đồng ý của cả hai bên, được ẩn danh và qua hàng duyệt. Người đóng góp có thể rút tài liệu.

Embedding vector và reranker có thể nối vào sau khi cấu hình provider; pipeline hiện chạy nội bộ.
