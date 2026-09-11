# TLUCS: Kế hoạch xây lại sản phẩm

## 1. Định vị đã chốt

**TLUCS: Trusted Local University Community Space** là cộng đồng đa trường giúp mọi người đăng, tìm và nhận các yêu cầu liên quan đến toàn bộ đời sống đại học. HCMUS là thị trường khởi động, nhưng dữ liệu và sản phẩm hỗ trợ nhiều trường ngay từ đầu.

Slogan thương hiệu: **Đúng cộng đồng. Đúng điều bạn cần.** Thông điệp riêng của Bảng yêu cầu: **Đúng người. Đúng trường. Đúng lúc.**

Mỗi tài khoản có thể đồng thời đăng và nhận yêu cầu. Không tồn tại vai trò “khách hàng” hay “chuyên gia”.

### Ba loại yêu cầu

- **Miễn phí:** hỗ trợ tự nguyện.
- **Trả phí:** thanh toán được TLUCS giữ, giải ngân sau khi hoàn tất và thu phí 1%.
- **Trao đổi:** mỗi bài nêu rõ “Tôi cần” và “Tôi có thể giúp”.

### Phạm vi nội dung

- Môn học, giảng viên, ôn tập và bổ túc.
- Ngành học, lộ trình tín chỉ, nghiên cứu, thực tập và nghề nghiệp.
- CV, portfolio, câu lạc bộ, cuộc thi và học bổng.
- Ký túc xá, nhà trọ, thủ tục và đời sống quanh trường.
- Học sinh THPT tìm hiểu trường/ngành.

## 2. Ma trận tái cấu trúc

| Nhóm hiện tại | Quyết định | Hướng xử lý |
| --- | --- | --- |
| React + Vite | Giữ và tái cấu trúc | Viết lại router, layout, state và design system |
| Express + PostgreSQL | Giữ công nghệ, thay toàn bộ nghiệp vụ | API độc lập `/api/v1`, schema mới và migration bằng code |
| WebSocket | Chuyển đổi | Từ tư vấn chuyên gia sang chat cộng đồng, chat giao dịch và presence |
| Auth email/password cũ | Thay thế | Google OAuth trước; access/refresh token sẵn sàng cho mobile |
| Hồ sơ da, scan, mỹ phẩm, thực phẩm | Xóa | Không chuyển dữ liệu |
| Chuyên gia, cơ sở dịch vụ, voucher | Xóa | Thay bằng tài khoản thống nhất và request marketplace |
| Chat tư vấn cũ | Xóa nghiệp vụ, giữ bài học kỹ thuật | Xây message/domain mới |
| Ví/thanh toán cũ | Xóa nghiệp vụ | Xây ledger/escrow mô phỏng theo mô hình mới |
| Review website cũ | Xóa | Xây đánh giá hai chiều theo giao dịch |
| Admin cũ | Xóa | Xây moderation, verification, dispute và server administration |
| Logo/ảnh/tài liệu hệ thống cũ | Xóa | Thay bằng bộ nhận diện TLUCS |
| CV/mentor/tài liệu chương trình ngoài app | Giữ | Không đủ căn cứ để coi là tài sản sản phẩm cũ |

## 3. Kiến trúc mục tiêu

### Web

- React + Vite, responsive và chỉ dùng tiếng Việt trong MVP.
- Feature modules thay vì gom theo loại file.
- API client thống nhất; không đặt luật nghiệp vụ quan trọng ở trình duyệt.
- Design system TLUCS: tin cậy như đại học, trẻ trung như cộng đồng sinh viên.

### API

- Node.js API độc lập, version `/api/v1`.
- Module: auth, accounts, universities, communities, requests, matching, conversations, scheduling, wallets, reviews, verification, moderation, notifications, maps và admin.
- WebSocket cho room chat, direct chat, presence, typing và thông báo.
- Cùng API phục vụ web và ứng dụng mobile tương lai.

### Database

- Neon PostgreSQL, Drizzle ORM, migration quản lý bằng code.
- Kết nối pooled cho API; direct connection cho migration.
- Nhánh database riêng cho development, test/CI và production.
- Tiền lưu dưới dạng số nguyên VND; ledger bất biến thay vì chỉ cập nhật số dư.
- Dữ liệu đa trường luôn dùng khóa `university_id`, không hard-code HCMUS.

## 4. Miền dữ liệu mới

### Danh tính và trường học

- `users`, `auth_accounts`, `sessions`, `profiles`
- `universities`, `campuses`, `faculties`, `majors`, `courses`
- `memberships`, `verification_requests`, `verification_evidence`, `badges`

Xác minh theo tầng: chưa xác minh → đang xét → danh tính → trường → môn học. Tên hiển thị dùng công khai; tên thật chỉ hiện cho hai bên sau khi ghép.

Hồ sơ uy tín không dùng một điểm bí ẩn duy nhất. Công khai riêng huy hiệu, điểm/số lượt đánh giá, số yêu cầu hoàn tất, tỷ lệ đúng giờ, hủy/no-show, điểm người chia sẻ, lượt mở khóa và thời gian phản hồi. Số liệu tổng hợp bắt nguồn từ event bất biến; hạn chế tính năng đang có hiệu lực được giải thích rõ.

### Cộng đồng

- `community_servers`, `channels`, `posts`, `comments`, `reactions`
- `channel_memberships`, `server_roles`, `reports`, `moderation_cases`

Mọi người được xem/đăng ở mọi server. Sinh viên xác minh được tự động gắn huy hiệu thành viên trường. Nội dung bị AI nghi ngờ được giam để admin/moderator duyệt trước khi đăng.

Kiểm duyệt dùng pipeline lai: luật bắt buộc phát hiện QR/link né thanh toán, đa cấp, thi hộ, đề rò rỉ và dấu hiệu rõ ràng; AI phân tích ngữ cảnh qua provider adapter. AI lỗi, timeout hoặc không chắc chắn thì giam bài. Mọi lần chạy lưu phiên bản luật, model, độ tin cậy, phát hiện và quyết định người duyệt để audit.

Kết quả gồm: an toàn tự đăng; không chắc chắn bị giam; nguy hiểm rõ ràng bị giam ưu tiên và cảnh báo admin nhưng chưa tự khóa tài khoản; chỉ tệp độc hại hoặc nội dung chắc chắn không thể phát hành mới bị từ chối tự động.

Mỗi server có sẵn các kênh Chung, Hỏi môn học, Đời sống sinh viên, Nhà trọ–ký túc xá, Thực tập–việc làm và Hoạt động–câu lạc bộ. Admin trường được tạo, sắp xếp, lưu trữ kênh bổ sung; thành viên chỉ gửi đề xuất kênh để admin xét duyệt.

Diễn đàn chung có các feed Dành cho bạn, Mới nhất và Đang nổi, đồng thời chia theo chuyên mục cố định. Mỗi bài hiển thị chủ đề và từ khóa ngay trên thẻ; từ khóa cũng là điểm vào bộ lọc. Xếp hạng Dành cho bạn dựa trên trường, chủ đề quan tâm và tương tác; Đang nổi dùng điểm tương tác có suy giảm theo thời gian.

Tương tác MVP gồm cảm xúc, bình luận nhiều cấp, lưu bài, chia sẻ liên kết và theo dõi bài để nhận thông báo. Chưa có repost hoặc story. API lưu cây bình luận không giới hạn cứng, nhưng giao diện thu gọn từ cấp sâu để dùng tốt trên điện thoại.

### Bảng tin và ghép yêu cầu

- `requests`, `request_requirements`, `request_slots`, `request_locations`
- `applications`, `matches`, `appointments`, `attendance_events`

Khớp 100% tiêu chí bắt buộc và lịch rảnh thì ghép ngay. Ứng viên gần khớp vào hàng đợi để người đăng chọn trước giờ hẹn.

Nếu nhiều người đạt 100% và nhận đồng thời, API khóa yêu cầu trong transaction PostgreSQL và ghép người xác nhận hợp lệ đầu tiên. Ràng buộc duy nhất bảo đảm mỗi yêu cầu chỉ có một match; các lượt đến sau được thông báo và gợi ý yêu cầu tương tự.

### Chat

- `conversations`, `conversation_members`, `messages`, `message_attachments`, `message_reads`
- Phòng server công khai và phòng riêng tự tạo sau khi ghép.
- MVP hỗ trợ text, ảnh, tệp và ghi âm; nút gọi chỉ mô phỏng giao diện.
- Người lạ chỉ gửi yêu cầu trò chuyện kèm lời nhắn ngắn; phòng riêng mở sau khi người nhận chấp nhận. Phòng gắn với yêu cầu được tạo tự động khi ghép.
- Chặn tài khoản ngăn lời mời chat, tin nhắn, ứng tuyển yêu cầu và thông báo trực tiếp; người chặn có thể ẩn nội dung công khai của tài khoản đó khỏi feed cá nhân.
- Chặn không đóng phòng của giao dịch đang hoạt động. Phòng chuyển sang chế độ giới hạn để hoàn tất, báo vắng mặt hoặc tranh chấp; khi có nguy cơ quấy rối, một bên có thể tắt tin nhắn trực tiếp và chỉ trao đổi qua quản trị viên.

### Tiền và uy tín

- `wallets`, `ledger_entries`, `payment_holds`, `payout_requests`, `transactions`
- `reviews`, `review_dimensions`, `disputes`, `dispute_evidence`

Người trả có thể dùng ví hoặc thanh toán thẳng. Tiền được giữ; sau xác nhận hoặc 12 giờ không tranh chấp thì trừ 1% và cộng phần còn lại vào ví người nhận.

Yêu cầu trả phí đặt cọc 5.000đ khi đăng; yêu cầu miễn phí/trao đổi không đặt cọc. Cọc là một phần tổng giá trị nên sau khi ghép người đăng chỉ trả phần còn lại, muộn nhất 30 phút trước giờ bắt đầu. Nếu quá hạn, match bị hủy; TLUCS trừ 1% từ tiền cọc và chuyển phần còn lại cho người đã giữ lịch.

Ngân sách trả phí từ 10.000đ đến 200.000đ theo bước 1.000đ. Doanh thu MVP duy nhất là 1% phần giao dịch giải ngân; toàn bộ chức năng còn lại miễn phí.

Thời điểm bắt đầu yêu cầu phải cách lúc đăng tối thiểu 30 phút và tối đa 3 ngày. Nếu một match phát sinh sau hạn thanh toán thông thường, người đăng có 5 phút để thanh toán toàn bộ phần còn lại; hết hạn thì hủy match và xử lý cọc.

Thời lượng gợi ý gồm 15, 30, 45, 60, 90 và 120 phút. Cho phép tùy chỉnh từ 15 đến 240 phút; phiên dài hơn 120 phút hiển thị cảnh báo nên tách thành nhiều buổi.

Trong MVP, mỗi yêu cầu chỉ có một phiên. Khi hoàn tất, nút Đặt lại sao chép nội dung, người hỗ trợ và thời lượng sang yêu cầu mới nhưng bắt buộc chọn lại lịch hợp lệ; mỗi phiên có giao dịch, đánh giá và tranh chấp độc lập. Chuỗi nhiều buổi được để sau pilot.

Yêu cầu trao đổi vẫn tạo lịch, phòng chat, xác nhận hoàn tất và đánh giá như phiên trả phí nhưng không có escrow hay bồi thường tiền. Vắng mặt được ghi nhận và có thể đánh giá.

Diễn đàn là nơi hỏi đáp và chia sẻ thông tin miễn phí bằng thảo luận công khai. Yêu cầu miễn phí chỉ dùng khi cần một người cam kết hỗ trợ 1–1 vào thời gian cụ thể; yêu cầu trao đổi và trả phí cũng giữ luồng ghép người, tạo lịch và phòng riêng. Bảng yêu cầu không mở bình luận công khai để tránh trùng chức năng với diễn đàn.

Ngoài Bảng yêu cầu có **Bảng chia sẻ**: người đăng chủ động đưa thông tin hữu ích, người quan tâm mở quyền truy cập rồi tham gia chat nhóm/tài liệu. Nội dung có thể miễn phí hoặc 1.000–20.000đ/người theo bước 1.000đ; giá cao hơn phải được admin duyệt chống lừa đảo. Link lạ hoặc QR làm bài bị giam chờ duyệt. Mỗi thành viên có escrow riêng; sau xác nhận hoặc hết hạn không tranh chấp, tiền được giải ngân sau phí 1%.

Bài chia sẻ có hai định dạng: Mở khóa ngay cho nội dung/tài liệu có sẵn, và Tham gia trao đổi cho buổi có lịch, chat nhóm cùng người đăng. Feed và bộ lọc phải thể hiện rõ định dạng trước khi người dùng thanh toán.

Với Mở khóa ngay, mốc giữ tiền 12 giờ bắt đầu khi quyền truy cập thực sự được cấp. Người mua được xác nhận sớm hoặc tranh chấp vì không truy cập được, sai mô tả hay vi phạm. Không hoàn tiền chỉ vì không thích sau khi đã xem; không có tranh chấp thì tự động giải ngân sau 12 giờ.

Bài trả phí bắt buộc công khai mô tả, nội dung người mua nhận, định dạng, preview làm mờ nếu có, dung lượng/số trang/thời lượng, ngày cập nhật, trường–môn–từ khóa và điều kiện hoàn tiền. Hệ thống chụp snapshot lời chào bán tại thời điểm mua để người đăng không thể sửa mô tả rồi né tranh chấp.

Tuyên bố thành tích dùng để bán nội dung phải có bằng chứng riêng và được TLUCS duyệt. Bằng chứng không công khai; bài chỉ hiện tuyên bố, nhãn Thành tích đã xác minh và thời điểm duyệt. Chưa xác minh có thể chia sẻ miễn phí nhưng không được trình bày như thành tích đã chứng thực; bằng chứng giả bị gỡ và xử lý uy tín.

Đánh giá Bảng chia sẻ tách điểm nội dung (đúng mô tả, hữu ích, cập nhật) và điểm người chia sẻ (giao tiếp, đúng giờ, hỗ trợ), kèm sao và nhận xét. Điểm hồ sơ chỉ tổng hợp phần người chia sẻ; điểm nội dung gắn với từng bài.

Người đăng tài liệu phải xác nhận có quyền phân phối, không phải đề/đáp án rò rỉ hay tài liệu nội bộ bị cấm, và chấp nhận quy trình gỡ khiếu nại bản quyền. Người mua chỉ được dùng cá nhân, không bán lại. Hệ thống lưu phiên bản điều khoản đã chấp nhận; nội dung có thể tạm ẩn và tiền tiếp tục bị giữ khi có khiếu nại hợp lệ.

Upload MVP cho PDF, DOCX, PPTX, XLSX, JPG/PNG/WebP, MP3/M4A và MP4; không nhận tệp thực thi, script hoặc file nén. Giới hạn 100 MB/tệp và 10 tệp/bài chia sẻ. Tệp được cách ly, kiểm tra signature/MIME, virus và nội dung trước khi cấp quyền truy cập.

Buổi Tham gia trao đổi có số người tối thiểu/tối đa và hạn đăng ký. Buổi trả phí yêu cầu chủ bài cọc 10% giá vé; buổi miễn phí không cọc nhưng vẫn bị cảnh cáo khi hủy/no-show. Không đủ số người tối thiểu thì hoàn 100% cho người tham gia, cảnh báo chủ bài, TLUCS trừ 1% cọc và chia đều phần còn lại cho người đã đăng ký; số dư lẻ được phân bổ minh bạch qua ledger. Link bình thường được phép, chỉ link/QR đáng ngờ hoặc né thanh toán mới làm bài bị giam. Tố cáo đa cấp/lôi kéo tài chính được ưu tiên để admin xem xét khóa tài khoản.

Nếu đã đủ người nhưng chủ bài hủy, người tham gia vẫn được hoàn 100% và nhận phần cọc sau phí 1%; sự kiện làm giảm uy tín. Ba lần hủy chủ động trong 30 ngày sẽ tạm khóa quyền tạo buổi trả phí. Hủy do hệ thống, TLUCS hoặc quyết định admin không tính vào ngưỡng.

Khóa quyền tạo buổi trả phí 7 ngày ở lần đầu; nếu tái phạm trong 90 ngày thì khóa 30 ngày. Nghi ngờ lừa đảo chuyển admin xem xét chế tài dài hơn. Các quyền diễn đàn, chat và yêu cầu miễn phí vẫn hoạt động trừ khi có vi phạm riêng.

Người mua vé hủy trước hạn đăng ký được hoàn 100%; hủy sau hạn nhưng trước giờ bắt đầu được hoàn 50%, 50% còn lại chuyển chủ bài sau phí 1%; không tham gia và không hủy thì không hoàn. Nếu việc rời buổi làm nhóm tụt dưới mức tối thiểu, hệ thống cảnh báo chủ bài và thành viên còn lại để xử lý trước hạn.

## 5. Luật nghiệp vụ đã chốt

- Người đăng vắng quá 50% thời lượng: dừng phiên, người nhận nhận 50%, người đăng được hoàn 50%.
- Người nhận vắng quá 50%: người đăng dừng, được hoàn toàn bộ, đánh giá 1 sao kèm nhận xét và đăng lại nhanh.
- Hai bên đánh giá 1–5 sao, nhận xét và tiêu chí sau giao dịch.
- Toàn bộ yêu cầu và phiên hỗ trợ diễn ra trực tuyến trên nền tảng; không có lựa chọn gặp trực tiếp hoặc trao đổi địa điểm.
- Thông báo qua website, email và web push.
- Học sinh THPT có tài khoản được dùng yêu cầu miễn phí/trả phí/trao đổi; cần bổ sung lớp an toàn cho người chưa đủ 18 tuổi trước pilot thật.
- Mỗi tranh chấp được khiếu nại một lần trong 48 giờ nếu có bằng chứng mới. Quản trị viên khác xem xét khi có thể; quyết định cũ không bị sửa mà được lưu cùng quyết định phúc tra trong audit log.

## 6. Phạm vi MVP

### M0: Nền móng

- Dọn sạch dấu vết hệ thống cũ; cấu trúc monorepo rõ web/server.
- Design tokens, navigation, error/loading/empty states.
- Schema mới, migration, seed nhiều trường với HCMUS là mặc định pilot.

### M1: Tài khoản và khám phá

- Google login; onboarding bắt buộc tên hiển thị, trạng thái chính, trường mặc định, khu vực, chủ đề quan tâm và khung giờ thường rảnh.
- Một người có nhiều quan hệ trường nhưng chọn một trạng thái chính để cá nhân hóa; ảnh đại diện và xác minh bổ sung sau.
- Chọn trường mặc định; tìm kiếm và bộ lọc toàn cục.
- Danh mục trường/campus/khoa/ngành/môn/chủ đề.
- Thanh tìm kiếm toàn TLUCS trả kết quả phân nhóm Yêu cầu, Bảng chia sẻ, Diễn đàn, Người dùng, Server trường và Môn/chủ đề. Trường mặc định chỉ tăng ưu tiên xếp hạng; người dùng luôn có thể tìm liên trường.
- Bộ chọn trường toàn cục mặc định theo hồ sơ, có Tất cả trường và đồng bộ giữa thiết bị. Nó chỉ đổi ngữ cảnh đang xem, không đổi quan hệ/huy hiệu. Bộ lọc chi tiết của mỗi tab được lưu độc lập.
- Route `/` hiển thị landing page với khách và dashboard cá nhân sau đăng nhập. Dashboard có yêu cầu phù hợp, bài chia sẻ theo sở thích, nội dung server trường, lịch sắp tới, tin nhắn/thông báo chưa đọc và lối tắt tạo nội dung.

### M2: Cộng đồng

- Diễn đàn chung, server trường, channel chat và bài đăng.
- Bình luận, reaction, report, hàng duyệt và admin/moderator cơ bản.

### M3: Request marketplace

- Tạo ba loại yêu cầu; online/trực tiếp; lịch và khu vực bản đồ.
- Bảng tin, tìm kiếm, bộ lọc và chi tiết yêu cầu.
- Matching tức thì, hàng đợi ứng viên và đăng lại.

### M4: Phiên hỗ trợ

- Chat riêng tự tạo sau khi ghép.
- Text, ảnh, file, ghi âm; lịch hẹn và attendance/check-in.
- Giao diện nút gọi mô phỏng, chưa cung cấp media calling.

### M5: Giao dịch và uy tín

- Ví/ledger/escrow mô phỏng, phí 1%, hoàn tiền và giải ngân 12 giờ.
- Quy tắc vắng mặt, tranh chấp, đánh giá sao và nhận xét.

### M6: Vận hành

- In-app/email/web-push notifications.
- Xác minh nhiều tầng, admin portal, moderation queue và audit log.
- Analytics phục vụ pilot HCMUS.

## 7. Ngoài MVP, trước pilot thật

- Kết nối cổng thanh toán thật, KYC nhận tiền và đối soát.
- Đánh giá pháp lý/điều khoản cho người chưa thành niên, escrow và thu phí.
- Hạ tầng media call thật nếu số liệu cho thấy cần thiết.
- AI moderation production-grade với quy trình kháng nghị.
- Admin trường đã xác minh và phân quyền chi tiết.
- Chống gian lận, giới hạn giao dịch và cơ chế dự phòng thanh toán.
- Kiểm thử tải chat, bảo mật, quyền riêng tư vị trí và disaster recovery.

## 8. Chỉ số pilot HCMUS

Quy mô đợt đầu: 100–200 người dùng trong 2–3 khoa và nhóm môn có nhu cầu cao. Kiểm duyệt, xác minh và tranh chấp có thể vận hành thủ công; chỉ mở rộng toàn HCMUS sau khi đạt ngưỡng an toàn và tỷ lệ ghép mục tiêu.

Nhóm khởi động: Công nghệ thông tin, Toán–Tin học/Khoa học dữ liệu và Điện tử–Viễn thông. Chủ đề seed: lập trình, cấu trúc dữ liệu, AI, xác suất–thống kê, toán cơ sở, chọn môn/giảng viên và thực tập. Đây là ưu tiên vận hành, không hạn chế khoa khác tham gia.

- Tỷ lệ yêu cầu được ghép và thời gian ghép trung vị.
- Tỷ lệ ứng viên khớp 100% so với hàng đợi.
- Tỷ lệ phiên hoàn tất, vắng mặt và tranh chấp.
- Số người đăng đồng thời từng nhận yêu cầu.
- Retention theo tuần của server HCMUS.
- Tỷ lệ nội dung bị AI giam, được duyệt và bị từ chối.
- Điểm hài lòng sau giao dịch và tỷ lệ đăng lại.

Ngưỡng mở rộng pilot: tỷ lệ ghép ≥60%, hoàn tất trên số đã ghép ≥85%, tranh chấp <5%, no-show <10%, weekly retention ≥30%, hài lòng ≥4/5 và thời gian ghép trung vị <2 giờ.

## 9. Tiêu chuẩn hoàn thành MVP

- Không còn route, bảng, asset hay nội dung của hệ thống cũ trong sản phẩm.
- Luồng từ đăng nhập → đăng yêu cầu → ghép → chat → hoàn tất → ledger → đánh giá chạy end-to-end.
- Mỗi màn hình danh sách có tìm kiếm, lọc, phân trang và trạng thái rỗng/lỗi/loading.
- Có test cho matching, escrow, vắng mặt, quyền server và moderation.
- Build web/server sạch; migration có thể chạy trên database rỗng; seed demo tái lập được.

## 10. Trạng thái triển khai hiện tại

Cập nhật ngày 11/09/2026 trên nhánh `main`, mốc mã nguồn `b1129d8`.

### Đã triển khai

- Web React/Vite và API Express độc lập theo namespace `/api/v1`; môi trường local chạy đồng thời bằng `npm run dev:all` tại cổng 5173 và 4000.
- Google OAuth, access/refresh session, ghi nhớ tài khoản Google đã dùng và tự khôi phục phiên. Người dùng vẫn có thể đăng xuất để đổi tài khoản.
- Điều hướng, dashboard, chọn trường, tìm kiếm toàn cục, Bảng yêu cầu, Bảng chia sẻ, Diễn đàn, server trường, tin nhắn, phiên hỗ trợ, thông báo, ví, hồ sơ và trang quản trị.
- Ba loại yêu cầu miễn phí, trả phí và trao đổi; nội dung môn học/chủ đề được giữ đúng khi hiển thị trên bảng tin; tiền VND được định dạng theo nhóm nghìn.
- Thẻ nội dung trên các bảng có thể mở lớp chi tiết để đọc toàn bộ bài và thực hiện hành động liên quan.
- Bảng chia sẻ hỗ trợ bài miễn phí và trả phí, tham gia, xác nhận, hủy, tranh chấp, đánh giá và tài liệu đính kèm (kiểm tra MIME + chữ ký byte đầu).
- Chat riêng, chat server, lời mời trò chuyện, chặn người dùng và WebSocket cho tin nhắn thời gian thực.
- Ví mô phỏng có liên kết ngân hàng, nạp bằng mệnh giá hoặc số tiền tự nhập, QR mô phỏng, rút tiền, thanh toán, giữ tiền và giải ngân; thêm chế độ `manual_review` (chuyển khoản thủ công, số tài khoản mã hóa AES-256-GCM) cho bước chuyển tiếp trước khi có cổng thanh toán thật.
- Phiên hỗ trợ có lịch hẹn, điểm danh, hoàn tất, báo vắng mặt, đánh giá và tranh chấp.
- **Kho tri thức học thuật mở + RAG ngữ nghĩa:** kho `knowledge/*.md` (gồm 5 tài liệu HCMUS: tổng quan, tuyển sinh/học phí 2026, nhập học, đăng ký học phần/học vụ, KTX/thư viện/hỗ trợ) được chunk theo heading, sinh embedding thật bằng `gemini-embedding-001` (768 chiều, chuẩn hóa), lưu trong Neon qua pgvector + HNSW cosine index. Truy vấn kết hợp keyword và cosine similarity bằng RRF, tự rơi về keyword khi Gemini/DB lỗi.
- Trợ lý AI nổi ở góc màn hình dùng Groq (chính) và Gemini (dự phòng), có bộ định tuyến ý định (`static/rag/agent_read/agent_write/confirm/clarify`). Chế độ AI Agent có ~35 tool đọc/ghi (yêu cầu, bài chia sẻ, ví, phiên, diễn đàn, cộng đồng, tin nhắn, xác minh, báo cáo…); mọi tool ghi đều tạo hành động chờ xác nhận (`pendingAssistantActionService`) trước khi thực thi. Chatbox tự cuộn xuống tin mới nhất khi mở và tự reset lịch sử theo ngày.
- Thông báo trong-app, **email thật qua Resend** và **web push thật (VAPID ký ES256)** khi người dùng có subscription.
- Trang quản trị: dashboard, quản lý người dùng/nội dung (ẩn/khôi phục có lý do), danh sách giao dịch, duyệt yêu cầu nạp/rút thủ công, **giải quyết tranh chấp (hoàn tiền/giải ngân/chia đôi/bác đơn) có transaction + audit log + thông báo hai bên**, và nhật ký audit tra cứu được.
- Seed demo có 15 tài khoản, mỗi tài khoản có 100.000đ trong ví, nhiều yêu cầu/bài chia sẻ/bài diễn đàn và nội dung hội thoại ở phòng riêng, server và trường khác nhau để trình diễn sản phẩm.
- Render Blueprint triển khai web tĩnh và Node API; API dùng Neon PostgreSQL (bật pgvector) và Cloudinary theo biến môi trường.
- README, Project Brief, Master Plan, Roadmap đồng bộ định vị: TLUCS là kho tri thức học thuật mở của cộng đồng, lớp kết nối "đúng người" là cơ chế bổ trợ. Có thêm `TLUCS_VISION.md`/`.pdf` mô tả chi tiết và bộ slide/standee bản trực quan.

### Đang ở mức mô phỏng, giới hạn hoặc còn lỗi cần sửa

- **Chất lượng truy hồi RAG chưa ổn định:** một số câu hỏi tự nhiên (ví dụ hỏi thư viện, hỏi số ngành đào tạo) vẫn nhận **kết quả sai với độ tin cậy cao** vì nhóm mở rộng từ khóa trong `query-expansions.json` gộp quá rộng và `answerFromKnowledge` luôn báo `matched:true` cho kết quả đứng đầu bất kể có thực sự khớp hay không. Cần tách nhỏ/giảm trọng số nhóm mở rộng, khôi phục ngưỡng lọc trước khi xếp hạng RRF, và cho phép trả lời "chưa biết" khi kết quả #1 yếu.
- Nạp, rút, liên kết ngân hàng, QR và luồng thanh toán mô phỏng chưa phát sinh tiền thật; chế độ `manual_review` mới là bước trung gian (đối soát thủ công), chưa phải cổng thanh toán tự động, chưa KYC.
- Nút gọi chỉ mô phỏng giao diện; chưa có thoại hoặc video thời gian thực.
- Chat riêng có schema cho ảnh/tệp/ghi âm (`attachment_url`) nhưng **chưa có endpoint tải tệp lên** cho tin nhắn; WebSocket mới phát tin nhắn, chưa có typing indicator hay trạng thái online (presence).
- Upload tài liệu chia sẻ mới kiểm tra MIME/chữ ký byte đầu; `scan_status` gán cứng `'safe'`, **chưa có engine quét virus thật và chưa cách ly tệp nghi ngờ**.
- **Chưa có lớp an toàn cho người dùng dưới 18 tuổi**: tài khoản `high_school_student` được phép dùng yêu cầu miễn phí/trả phí/trao đổi như người lớn, không có xác minh tuổi hay đồng ý phụ huynh.
- Dữ liệu 15 người dùng và hội thoại là dữ liệu seed phục vụ demo, không đại diện cho hoạt động người dùng thật.
- Moderation, verification, report có nền tảng cơ bản; phân quyền chi tiết và quy trình kháng nghị vẫn cần hoàn thiện trước pilot thật.
- Chưa tách database development/test/production; test hiện chạy với `DATABASE_URL` rỗng (rơi về dữ liệu trong bộ nhớ) thay vì một nhánh Neon test riêng.
- Test tự động mới ở cấp service (Node `--test`, 69 test); chưa có test end-to-end cấp trình duyệt (Playwright/Cypress) cho các luồng chính.

### Ưu tiên tiếp theo

1. Sửa chất lượng truy hồi RAG (tách nhóm mở rộng từ khóa, khôi phục ngưỡng lọc trước RRF, `matched` phản ánh đúng độ tin cậy thật).
2. Thêm endpoint tải ảnh/tệp/ghi âm cho chat riêng; bổ sung typing indicator, presence và khả năng phục hồi kết nối WebSocket.
3. Thiết kế lớp an toàn cho người dùng dưới 18 tuổi trước khi mời người dùng thật ngoài nhóm thí điểm nội bộ.
4. Thay `scan_status:'safe'` cố định bằng quét virus/nội dung thật và cơ chế cách ly tệp nghi ngờ.
5. Viết test end-to-end cấp trình duyệt cho các luồng chính (miễn phí/trả phí/trao đổi, Bảng chia sẻ, tranh chấp).
6. Tách database development, test và production; bổ sung quy trình migration có kiểm thử và rollback an toàn.
7. Thực hiện kiểm thử bảo mật, tải, quyền riêng tư, backup và disaster recovery trước khi mời người dùng thật.
