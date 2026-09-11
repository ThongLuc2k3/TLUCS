# TLUCS: Roadmap và sơ đồ phát triển chi tiết

> Cập nhật: 11/09/2026  
> Sản phẩm: **TLUCS: Trusted Local University Community Space**  
> Thị trường khởi động: **HCMUS**  
> Tầm nhìn: một không gian cộng đồng đa trường cho toàn bộ đời sống đại học.

## 1. Cây sản phẩm tổng thể

```text
TLUCS
├── 1. Danh tính và niềm tin
│   ├── Đăng nhập Google
│   ├── Tên hiển thị/biệt danh trong cộng đồng
│   ├── Tên thật chỉ hiện cho hai bên sau khi ghép
│   ├── Loại tài khoản
│   │   ├── Sinh viên đại học
│   │   ├── Cựu sinh viên
│   │   ├── Học sinh THPT
│   │   └── Người tìm hiểu
│   ├── Quan hệ với nhiều trường
│   ├── Một trường/trạng thái chính để cá nhân hóa
│   ├── Xác minh nhiều tầng
│   │   ├── Email trường
│   │   ├── Thẻ sinh viên
│   │   ├── Bảng điểm/môn đã học
│   │   └── Bằng chứng khác do admin xét
│   └── Hồ sơ uy tín
│       ├── Huy hiệu trường
│       ├── Số phiên hoàn tất
│       ├── Điểm và nhận xét
│       ├── Tỷ lệ đúng giờ/hủy/vắng mặt
│       └── Thời gian phản hồi
│
├── 2. Khám phá và cá nhân hóa
│   ├── Bộ chọn trường toàn cục
│   ├── Tìm kiếm toàn TLUCS
│   ├── Bộ lọc riêng trên mọi tab
│   ├── Feed Dành cho bạn
│   ├── Feed Mới nhất
│   ├── Feed Đang nổi
│   ├── Chủ đề/từ khóa trên từng thẻ nội dung
│   ├── Vị trí gần đúng và khoảng cách
│   └── Thông báo web, email, web push
│
├── 3. Cộng đồng
│   ├── Diễn đàn chung liên trường
│   │   ├── Bài viết
│   │   ├── Cảm xúc
│   │   ├── Bình luận nhiều cấp
│   │   ├── Lưu/chia sẻ/theo dõi bài
│   │   └── Báo cáo nội dung
│   ├── Server riêng từng trường
│   │   ├── Kênh mặc định
│   │   ├── Chat thời gian thực
│   │   ├── Admin/moderator sinh viên
│   │   ├── Admin tạo kênh
│   │   └── Thành viên đề xuất kênh
│   └── Quan hệ xã hội
│       ├── Yêu cầu trò chuyện
│       ├── Chấp nhận mới mở phòng riêng
│       ├── Chặn/ẩn người dùng
│       └── Kết bạn/theo dõi ở giai đoạn sau
│
├── 4. Bảng yêu cầu
│   ├── Miễn phí
│   ├── Trao đổi lợi ích
│   ├── Trả phí
│   │   ├── Giá 10.000–200.000đ
│   │   ├── Cọc 5.000đ
│   │   ├── Thanh toán phần còn lại trước giờ hẹn 30 phút
│   │   └── TLUCS giữ tiền, thu 1% khi giải ngân
│   ├── Phạm vi nhu cầu
│   │   ├── Môn học/giảng viên/ôn tập
│   │   ├── Ngành học/lộ trình tín chỉ
│   │   ├── Nghiên cứu/học bổng/cuộc thi
│   │   ├── Thực tập/CV/portfolio/nghề nghiệp
│   │   ├── CLB/hoạt động/quan hệ đại học
│   │   ├── Thủ tục hành chính
│   │   ├── Ký túc xá/nhà trọ/đời sống quanh trường
│   │   └── Học sinh THPT tìm hiểu trường/ngành
│   ├── 100% trực tuyến trên nền tảng
│   ├── Lịch từ 30 phút sau khi đăng đến tối đa 3 ngày
│   ├── Matching
│   │   ├── Khớp đủ điều kiện → người hợp lệ đầu tiên nhận
│   │   ├── Thiếu điều kiện nhỏ → hàng đợi
│   │   └── Người đăng duyệt hoặc đăng lại
│   └── Sau ghép
│       ├── Phòng chat riêng tự động
│       ├── Lịch và phòng trao đổi trực tuyến
│       ├── Check-in
│       ├── Hoàn tất/vắng mặt/tranh chấp
│       └── Đánh giá hai chiều
│
├── 5. Bảng chia sẻ
│   ├── Mở khóa ngay
│   │   ├── Tài liệu/nội dung có sẵn
│   │   ├── Miễn phí hoặc trả phí
│   │   ├── Giữ tiền 12 giờ sau khi mở khóa
│   │   └── Sai mô tả/lỗi/vi phạm → tranh chấp
│   ├── Tham gia trao đổi
│   │   ├── Buổi nhóm có lịch
│   │   ├── Số người tối thiểu/tối đa
│   │   ├── Chat nhóm
│   │   └── Luật hủy, hoàn vé và cọc chủ bài
│   ├── Giá phổ thông 1.000–20.000đ/người
│   ├── Trên 20.000đ → admin duyệt
│   ├── Xác nhận quyền phân phối nội dung
│   ├── Xác minh tuyên bố thành tích
│   └── Đánh giá tách nội dung và người chia sẻ
│
├── 6. Tin nhắn và phiên
│   ├── Text
│   ├── Ảnh/tệp/ghi âm
│   ├── Presence và WebSocket
│   ├── Nút gọi mô phỏng trong MVP
│   ├── Chế độ phòng giới hạn khi có chặn/tranh chấp
│   └── Admin relay khi có nguy cơ quấy rối
│
├── 7. Giao dịch mô phỏng
│   ├── Ví khả dụng
│   ├── Tiền đang giữ
│   ├── Ledger bất biến
│   ├── Màn hình xử lý giao dịch 3 giây
│   ├── Hoàn tiền/giải ngân/bồi thường
│   ├── Phí nền tảng 1%
│   └── Cổng thanh toán/KYC thật sau pilot
│
└── 8. An toàn và vận hành
    ├── Luật phát hiện link/QR né thanh toán
    ├── Cấm thi hộ/làm hộ/mua bán đề rò rỉ
    ├── Phát hiện đa cấp/lừa đảo/quấy rối
    ├── Hàng kiểm duyệt thủ công
    ├── Xác minh trường và thành tích
    ├── Báo cáo/chặn/hạn chế tính năng
    ├── Tranh chấp và phúc tra
    ├── Audit log
    └── Analytics pilot
```

## 2. Trạng thái hiện tại

| Cụm | Trạng thái | Ghi chú |
| --- | --- | --- |
| Nhận diện TLUCS và giao diện giáo dục | Đã có | Responsive, tiếng Việt, logo riêng |
| Web production | Đã triển khai | `tlucs-web.onrender.com` |
| API production | Đã triển khai | `tlucs-api.onrender.com` |
| Neon PostgreSQL đa trường | Đã có | Schema riêng `tlucs`, HCMUS là pilot |
| Google OAuth | Đã tích hợp | Cần duy trì origin/test users đúng môi trường |
| Onboarding và hồ sơ đa trường | MVP đã có | Xác minh thật vẫn cần quy trình vận hành |
| Bảng yêu cầu ba chế độ | MVP đã có | Matching, hàng đợi, lịch, địa điểm gần đúng |
| Ví/escrow mô phỏng | MVP đã có | Có delay 3 giây, ledger và phí 1% |
| Chat riêng sau ghép | MVP đã có | Text + WebSocket thời gian thực hoạt động; chưa có endpoint tải ảnh/tệp/ghi âm, chưa có typing/presence |
| Diễn đàn và server trường | MVP đã có | Cần tăng độ sâu UI và moderation thật |
| Bảng chia sẻ | MVP đã có | Hai định dạng, giữ tiền, tranh chấp và tài liệu đính kèm (kiểm MIME/chữ ký, chưa quét virus thật) |
| Kho tri thức + RAG ngữ nghĩa | MVP đã có, cần sửa chất lượng | Embedding Gemini + pgvector HNSW + RRF; đang trả nhầm kết quả tự tin sai cho một số câu hỏi tự nhiên |
| Quản trị & tranh chấp | Đã có | Dashboard, kiểm duyệt nội dung, giải quyết tranh chấp (hoàn tiền/giải ngân/chia đôi) có audit log |
| Thông báo | Đã có | Email thật qua Resend, web push thật (VAPID), thông báo trong-app |
| Dữ liệu mô phỏng | Đã có | Seed idempotent, có nhãn Mô phỏng |
| Test nghiệp vụ | Đã có | 69 test đạt ở thời điểm cập nhật; chưa có test E2E cấp trình duyệt |
| An toàn người dùng dưới 18 tuổi | Chưa làm | Tài khoản THPT chưa có xác minh tuổi/đồng ý phụ huynh |
| Thanh toán thật | Chưa làm | Có thêm chế độ `manual_review` (đối soát thủ công) làm bước trung gian; cổng thanh toán tự động và KYC vẫn sau pilot |
| Mobile app | Chưa làm | API đã định hướng dùng chung |

## 3. Roadmap theo giai đoạn

### Giai đoạn 0: Demo sản phẩm ổn định

**Mục tiêu:** người xem hiểu giá trị trong 5 phút và tự đi hết một luồng mẫu.

- [x] Deploy web, API và database.
- [x] Seed tài khoản, yêu cầu, diễn đàn và Bảng chia sẻ mô phỏng.
- [x] Mô phỏng thanh toán, escrow và phí 1%.
- [ ] Kiểm tra toàn bộ route trên mobile, tablet và desktop.
- [ ] Hoàn thiện loading, error, empty state ở mọi danh sách.
- [ ] Gắn nhãn mô phỏng nhất quán ở hồ sơ, nội dung và giao dịch.
- [ ] Xây tour demo: đăng nhập → nhận yêu cầu → chat → hoàn tất → đánh giá.
- [ ] Tạo kịch bản demo 5 phút và video dự phòng.

**Điều kiện hoàn thành:** không có dead-end trong luồng demo; một người mới không cần giải thích vẫn hiểu ba chế độ yêu cầu.

### Giai đoạn 1: Khép kín MVP nghiệp vụ

**Mục tiêu:** mọi lời hứa chính trong giao diện có hành vi backend tương ứng.

- [x] Admin giải quyết tranh chấp: hoàn tiền, giải ngân, chia tiền, lưu lý do.
- [ ] Trả cọc chủ Bảng chia sẻ khi buổi thành công.
- [ ] Snapshot lời chào bán tại thời điểm mua.
- [ ] Khóa 7 ngày/30 ngày đúng luật tái phạm 90 ngày.
- [ ] Ảnh, tệp và ghi âm trong chat; call tiếp tục là mô phỏng.
- [ ] Quét tệp production; cách ly tệp nghi ngờ.
- [ ] Điều khoản, quyền riêng tư và nguyên tắc cộng đồng.
- [ ] Xóa dữ liệu mô phỏng bằng cờ cấu hình khi chuyển sang pilot thật.
- [ ] Test E2E trình duyệt cho các hành trình chính.

**Điều kiện hoàn thành:** không có tiền mô phỏng bị treo; admin xử lý được mọi trạng thái ngoại lệ.

### Giai đoạn 2: Kiểm chứng vấn đề tại HCMUS

**Mục tiêu:** chứng minh vấn đề tồn tại ở số đông trước khi tối ưu tăng trưởng.

- [ ] Phỏng vấn định tính 20–30 sinh viên thuộc ít nhất 3 khoa và nhiều khóa.
- [ ] Khảo sát định lượng tối thiểu 150 phản hồi.
- [ ] Đo riêng sáu nhóm nhu cầu: học tập, định hướng, cơ hội, hoạt động, thủ tục, đời sống.
- [ ] Đo hành vi hiện tại: hỏi group, nhắn riêng, tự tìm, bỏ cuộc, trả phí, đổi lợi ích.
- [ ] Đo mức sẵn sàng trả theo mức 1k/5k/10k/20k/50k.
- [ ] Kiểm tra người hỗ trợ kỳ vọng điều gì ngoài tiền.
- [ ] Chọn 2–3 “wedge use case” có tần suất và độ đau cao nhất.

**Điều kiện hoàn thành:** có bằng chứng tách biệt giữa chuyện của người sáng lập và vấn đề có tính lặp lại trong cộng đồng.

### Giai đoạn 3: Closed pilot HCMUS

**Mục tiêu:** 100–200 người dùng thật trong nhóm có mật độ cung–cầu đủ cao.

- [ ] Tuyển nhóm đầu từ CNTT, Toán–Tin/Khoa học dữ liệu và Điện tử–Viễn thông.
- [ ] Bổ nhiệm moderator sinh viên.
- [ ] Xác minh email/thẻ sinh viên theo quy trình thủ công.
- [ ] Chỉ dùng yêu cầu miễn phí/trao đổi hoặc tiền demo ở vòng đầu.
- [ ] Chạy phiên hỗ trợ có lịch và quan sát trực tiếp lỗi vận hành.
- [ ] Phỏng vấn sau phiên cả người đăng lẫn người nhận.
- [ ] Theo dõi cohort theo tuần.

**Chỉ số mục tiêu:**

- Tỷ lệ ghép ≥ 60%.
- Hoàn tất trên số đã ghép ≥ 85%.
- Thời gian ghép trung vị < 2 giờ.
- Tranh chấp < 5%.
- No-show < 10%.
- Hài lòng ≥ 4/5.
- Weekly retention ≥ 30%.
- Có hành vi hai chiều: một người vừa đăng vừa nhận yêu cầu.

### Giai đoạn 4: Pilot mở rộng trong HCMUS

**Mục tiêu:** từ công cụ cho một nhóm môn thành hạ tầng cộng đồng của trường.

- [ ] Mở thêm khoa và nhu cầu phi học thuật.
- [ ] Chương trình đại sứ/moderator từng khoa.
- [ ] Hợp tác CLB, chi hội, đoàn khoa và nhóm học thuật thay vì cạnh tranh trực diện.
- [ ] Kênh chính thức cho buổi ôn tập miễn phí/giá rẻ.
- [ ] Dashboard cung–cầu theo môn/chủ đề/thời điểm.
- [ ] Cải thiện recommendation và matching từ dữ liệu thật.
- [ ] Cơ chế chống thao túng đánh giá và giao dịch vòng tròn.

### Giai đoạn 5: Thanh toán thật có kiểm soát

**Mục tiêu:** chuyển từ ví mô phỏng sang giao dịch hợp pháp và đối soát được.

- [ ] Tư vấn pháp lý về trung gian thanh toán, thuế, KYC và người chưa thành niên.
- [ ] Chọn cổng thanh toán được cấp phép; TLUCS không tự giữ tiền ngoài khuôn khổ pháp luật.
- [ ] KYC người rút tiền.
- [ ] Idempotency, webhook, đối soát và retry.
- [ ] Hạn mức giao dịch, chống gian lận và AML cơ bản.
- [ ] Quy trình hoàn tiền/tranh chấp có SLA.
- [ ] Kiểm thử bảo mật và khôi phục thảm họa.

### Giai đoạn 6: Đa trường

**Mục tiêu:** chứng minh mô hình lặp lại ngoài HCMUS.

- [ ] Chọn 1–2 trường tiếp theo dựa trên quan hệ cộng đồng, không chỉ quy mô.
- [ ] Tách cấu hình server, moderator và taxonomy từng trường.
- [ ] Cho phép nhu cầu liên trường nhưng ưu tiên cộng đồng địa phương.
- [ ] So sánh chỉ số cung–cầu, niềm tin và willingness-to-pay giữa trường.
- [ ] Chuẩn hóa playbook khởi động một trường mới.

### Giai đoạn 7: Mobile và nền tảng hoàn chỉnh

- [ ] Ứng dụng mobile dùng chung `/api/v1`.
- [ ] Push notification production.
- [ ] Media call thật nếu dữ liệu chứng minh nhu cầu.
- [ ] Recommendation/matching có giải thích.
- [ ] Hệ thống bạn bè/theo dõi và social graph.
- [ ] Công cụ quản trị cấp trường và cấp toàn nền tảng.
- [ ] API/SDK cho CLB, khoa hoặc đối tác trường nếu có nhu cầu.

## 4. Workstream song song

| Workstream | Việc liên tục |
| --- | --- |
| Product | Phỏng vấn, ưu tiên use case, đo funnel, kiểm tra ngôn ngữ giao diện |
| Engineering | Reliability, test, performance, mobile-ready API, observability |
| Trust & Safety | Xác minh, moderation, report, block, tranh chấp, audit |
| Community | Seed cung, moderator, đại sứ, hợp tác nhóm/CLB |
| Legal & Finance | Điều khoản, quyền riêng tư, thanh toán, KYC, thuế |
| Growth | Khởi động theo cụm môn/khoa, referral, kích hoạt hai chiều |

## 5. Các cổng quyết định

1. **Không mở rộng tính năng** nếu chưa chứng minh người dùng quay lại với một use case cốt lõi.
2. **Không bật tiền thật** nếu chưa có đối tác thanh toán, KYC, đối soát và quy trình tranh chấp.
3. **Không mở trường mới** nếu cung–cầu HCMUS còn loãng và tỷ lệ ghép chưa đạt ngưỡng.
4. **Không xây call thật** chỉ vì trông đầy đủ; chỉ xây khi phiên thực tế cần nó hơn công cụ ngoài.
5. **Không gọi 1% là mô hình bền vững** trước khi đo GMV, chi phí moderation, hạ tầng và hỗ trợ.

## 6. Rủi ro lớn cần quản trị

- Marketplace lạnh: có người hỏi nhưng không có đúng người nhận, hoặc ngược lại.
- Nhu cầu quá rộng làm mỗi ngách không đủ mật độ.
- Nội dung miễn phí hiện hữu đã đủ tốt cho nhiều trường hợp.
- Giá trị giao dịch nhỏ khiến 1% không đủ trả chi phí.
- Người dùng chuyển sang nhắn/ thanh toán ngoài sau lần kết nối đầu.
- Thông tin về giảng viên có thể chủ quan, sai hoặc gây tổn hại danh dự.
- Mua bán tài liệu trái phép, đề rò rỉ, thi hộ, đa cấp và lừa đảo.
- Xác minh bảng điểm/thẻ sinh viên chứa dữ liệu nhạy cảm.
- Người chưa thành niên tham gia phiên trực tuyến cần lớp bảo vệ và kiểm duyệt phù hợp.
- Free-tier infrastructure không phù hợp khi có tải thật.
- RAG có thể trả lời sai với độ tin cậy hiển thị cao (đã ghi nhận ở kho HCMUS) nếu nhóm mở rộng từ khóa quá rộng; cần sửa trước khi cho người dùng thật tin vào câu trả lời.

## 7. Việc ưu tiên ngay sau bản demo

1. Hoàn thiện bộ câu hỏi phỏng vấn và khảo sát kiểm chứng vấn đề.
2. Chọn ba hành trình để demo: hỏi kinh nghiệm, trao đổi lợi ích, chia sẻ giá nhỏ.
3. Khép kín admin dispute và chat media.
4. Thử closed pilot không tiền thật với 30–50 người HCMUS.
5. Dùng dữ liệu pilot để quyết định wedge, không dùng cảm nhận cá nhân để mở rộng.
