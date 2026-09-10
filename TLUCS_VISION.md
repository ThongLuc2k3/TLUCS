# TLUCS: Tài liệu Tầm nhìn Sản phẩm

> Bản mô tả trung tâm ý tưởng TLUCS và các tầm nhìn mở rộng. Những nhận định chưa có khảo sát vẫn là **giả thuyết cần kiểm chứng**, không trình bày như kết luận thị trường.

## 0. Tóm tắt trong 1 phút

**TLUCS là kho tri thức học thuật mở của cộng đồng sinh viên.** Cộng đồng tự bổ sung dữ liệu qua các bài chia sẻ tài liệu, thông tin và thảo luận. Người dùng **hỏi bằng câu hỏi thường ngày và nhận câu trả lời có ghi rõ nguồn**, thay vì phải tải và đọc hết tài liệu như cách tìm trên Drive hay group.

Bao quanh kho đó là **lớp kết nối "đúng người"**: khi tài liệu không đủ, người dùng đăng một yêu cầu (miễn phí, trao đổi hoặc trả phí nhỏ) để tìm đúng một người từng trải qua bối cảnh đó. Người này cam kết dành thời gian, trao đổi 1–1 có lịch, và kết quả phiên đó (nếu hai bên đồng ý) lại quay về làm dày kho.

Khởi động tại HCMUS, thiết kế đa trường ngay từ đầu.

## 1. Giải thích ngắn các thuật ngữ AI (cho người không chuyên)

> Phần này dành cho người đọc chưa quen với AI. Có thể bỏ qua nếu đã hiểu.

**Kho tri thức (knowledge base).** Giống một thư viện số của cộng đồng: tài liệu, ghi chú kinh nghiệm, câu hỏi–đáp hay. Điểm khác thư viện thường: mỗi mẩu được gắn "nhãn ngữ cảnh" (trường nào, môn nào, học kỳ nào, nguồn từ đâu, đáng tin đến mức nào).

**RAG (Retrieval-Augmented Generation) — "trả lời dựa trên tài liệu đã tìm được".** Cơ chế gồm hai bước:

1. *Tìm* — hệ thống lục trong kho ra vài mẩu liên quan nhất tới câu hỏi.
2. *Soạn* — AI đọc đúng những mẩu đó rồi viết lại thành câu trả lời gọn, kèm trích dẫn nguồn.

Khác với việc hỏi thẳng một chatbot (nó "nói theo trí nhớ chung", có thể bịa), RAG chỉ được dùng nội dung có thật trong kho TLUCS. Nếu không tìm thấy gì đủ liên quan, hệ thống **nói thẳng "chưa biết"** chứ không đoán.

**Tìm kiếm theo ngữ nghĩa (vector / embedding search).** Tìm kiếm thường khớp *đúng từ*. Tìm theo ngữ nghĩa hiểu *ý*: hỏi "môn máy học khó không" vẫn ra tài liệu ghi "Machine Learning" hay "học máy". Máy làm được điều này bằng cách quy mỗi đoạn văn thành một dãy số đại diện cho ý nghĩa, rồi so độ gần nhau giữa các dãy số.

**LLM (mô hình ngôn ngữ lớn).** Phần AI biết đọc – hiểu – viết tiếng Việt tự nhiên. Trong TLUCS nó đóng vai người "soạn lại" câu trả lời và trò chuyện, **không phải nguồn sự thật** — sự thật đến từ kho.

**Ngưỡng tin cậy 85%.** Mỗi kết quả tìm được có một điểm "mức độ khớp". TLUCS chỉ trả lời khi điểm này từ 85% trở lên. Dưới ngưỡng thì báo "chưa biết" và gợi ý hỏi cộng đồng. Mục đích: thà không trả lời còn hơn trả lời sai ngữ cảnh.

**AI Agent (trợ lý biết thao tác).** Không chỉ trả lời, mà làm giúp các việc trên nền tảng: soạn sẵn một bài đăng yêu cầu, tìm người phù hợp, đánh dấu thông báo. Mọi thao tác **thay đổi dữ liệu hoặc liên quan tiền đều phải người dùng bấm xác nhận** — Agent không tự ý làm.

**Metadata.** "Dữ liệu mô tả dữ liệu" — các nhãn đi kèm mỗi tài liệu (trường, môn, kỳ, nguồn, ngày cập nhật, hạn dùng). Nhờ metadata mà kho lọc đúng ngữ cảnh của người hỏi.

## 2. Ý tưởng trung tâm

### 2.1. Định vị

> **TLUCS là kho tri thức học thuật mở của cộng đồng sinh viên** — cộng đồng tự bổ sung dữ liệu qua các bài chia sẻ tài liệu, thông tin và thảo luận; **tra cứu bằng hỏi–đáp tự nhiên (RAG) thay vì đọc hết tài liệu** — kèm một **lớp kết nối "đúng người"** (miễn phí / trao đổi / trả phí) cho những nhu cầu cần ngữ cảnh sâu, đúng lúc và có người cam kết thời gian.

Gọi là "mở" theo tinh thần mã nguồn mở: cộng đồng đóng góp – dùng chung – có ghi công – tầng miễn phí luôn mở. Chính xác hơn là **"open core"**: phần công khai mở hoàn toàn; phần trả phí và phần riêng tư chỉ hiển thị metadata/preview và do người đóng góp kiểm soát.

### 2.2. Hai động cơ nuôi nhau

```text
        +---------------------------------------------+
        |   KHO TRI THUC HOC THUAT MO  (trung tam)     |
        |   - Cong dong tu bo sung                     |
        |   - Chuan hoa + gan ngu canh (truong/mon/ky) |
        |   - Tra cuu bang RAG, tra loi co trich nguon |
        +------^-----------------------------^---------+
               | nap du lieu                 | nap du lieu
      +--------+--------+          +---------+--------------+
      | DONG CO A        |          | DONG CO B             |
      | Bang chia se     |          | Bang yeu cau +        |
      | + Dien dan       |          | ghep nguoi + phien    |
      | (nguon DOI DAO,  |          | (nguon TINH, co cam   |
      |  chat luong dao  |          |  ket, dung nguoi,     |
      |  dong -> can loc)|          |  giau ngu canh)       |
      +-----------------+          +----------------------+
               |                            |
               +--> khi kho KHONG du tin cay <--+
                 Agent day nguoi dung sang Dong co B,
                 ket qua phien quay lai lam day kho
```

- **Động cơ A — nguồn dồi dào:** tài liệu, thông tin, thảo luận công khai. Rẻ để tạo, số lượng lớn, chất lượng dao động nên cần lọc.
- **Động cơ B — nguồn tinh:** phiên hỗ trợ 1–1 với người đã trải qua đúng bối cảnh. Ít hơn, tốn công hơn, nhưng giàu ngữ cảnh và có cam kết.
- **Vòng lặp:** hỏi kho trước; kho trả lời không đủ tin cậy thì Agent gợi ý đăng diễn đàn hoặc tạo Bảng yêu cầu; câu trả lời (nếu hai bên đồng ý) quay lại làm dày kho.

### 2.3. Trung tâm: Kho tri thức học thuật mở

**Vấn đề nó giải quyết:** tài liệu miễn phí, kinh nghiệm trao đổi, thông tin hữu ích đang nằm rải rác ở Drive, group, chat riêng — muốn dùng phải *đọc hết* như tìm tài liệu thủ công. Tri thức "cháy một lần rồi trôi"; mỗi kỳ sinh viên mới lại hỏi lại từ đầu.

**Cộng đồng tự bổ sung dữ liệu từ đâu:**

| Nguồn | Cơ chế đưa vào kho |
| --- | --- |
| Bài chia sẻ tài liệu miễn phí (`instant_unlock`, 0đ) | Đưa toàn văn vào kho, index đầy đủ |
| Bài chia sẻ / buổi trao đổi **trả phí** | Chỉ index metadata + preview; RAG dẫn tới bài, không lộ toàn văn — đây là lớp "chia sẻ trả phí đúng người" |
| Câu trả lời / bình luận diễn đàn được đánh giá cao | Người hỏi xác nhận "hữu ích" hoặc đủ reaction thì ingest, gắn nguồn |
| Bản tóm tắt phiên hỗ trợ | Chỉ khi cả hai bên đồng ý đóng góp, đã ẩn danh, cắt phần riêng tư |
| FAQ chính thức của khoa / CLB / đoàn khoa | `authority` cao, ưu tiên xếp hạng |
| Tổng hợp review giảng viên / môn từ nhiều nguồn | Bản "đồng thuận có ngữ cảnh", ghi rõ là trải nghiệm cá nhân, cấm công kích |

**Sơ đồ nạp và chuẩn hóa dữ liệu:**

```text
Bai chia se ---+
Dien dan ------+
Phien (opt-in)-+--> KIEM DUYET LAI  --> CHUAN HOA + GAN NHAN    --> KHO (index)
FAQ khoa ------+    (luat cung + AI)     truong . khoa . mon . ky     - tim theo tu khoa
Review tong ---+    dat nguong chat       nguon . loai bang chung      - tim theo ngu nghia
                    luong moi vao         do tin cay . han dung        - loc theo ngu canh
```

**Chuẩn hóa & gắn ngữ cảnh** (mở rộng nhãn đã có `domain / risk_level / authority / reviewed_at / tags`): thêm `university_id`, `faculty`, `course`, `term`, `contributor_id`, `provenance`, `evidence_type` (chính thức / trải nghiệm cá nhân / tổng hợp), `confidence`, `expires_at` (tri thức theo mùa như lịch đăng ký, quy chế — có hạn dùng).

**Cách RAG trả lời một câu hỏi:**

```text
Cau hoi nguoi dung
   |  (hieu loi chinh ta, "10k" = 10.000d, gio giac doi thuong)
   v
Chuan hoa + mo rong y dinh  --- "hoc may" <-> "machine learning" <-> "ML"
   v
Tim trong kho  (tu khoa + ngu nghia)  ->  loc theo truong/khoa/mon cua nguoi hoi
   v
Cham diem muc khop moi ket qua
   +- >= 85%  ->  AI soan cau tra loi gon + TRICH DAN NGUON + nhan do tin cay
   +- <  85%  ->  "Minh chua biet tu kho hien co"  ->  goi y dang dien dan / tao Bang yeu cau
```

**Open core — phân tầng:**

- *Công khai:* ai cũng tra được, miễn phí, không cần xác minh.
- *Trả phí:* index metadata/preview; Agent nói "có tài liệu phù hợp, cần mở khóa từ người đăng".
- *Riêng tư / phiên:* opt-in, ẩn danh hóa; người đóng góp gỡ / sửa / kế thừa phiên bản được.

**Ghi công (như đóng góp mã nguồn mở):** khi tài liệu / câu trả lời của một người được RAG trích dẫn và người dùng đánh giá hữu ích thì người đó nhận **"điểm đóng góp tri thức"** — một trục mới trong hồ sơ uy tín, quy đổi được thành huy hiệu / điểm rèn luyện / mục portfolio.

**Vòng xoáy tri thức (flywheel):**

```text
   nhieu nguoi dung
        |
        v
  nhieu cau hoi + tai lieu + phien
        |
        v
  kho day hon, nhan ngu canh tot hon
        |
        v
  RAG tra loi dung & nhanh hon
        |
        v
  nguoi dung thay huu ich -> quay lai, ru them --+
        ^                                        |
        +----------------------------------------+
  (cau hoi kho tra loi yeu -> gan co "khoang trong tri thuc"
   -> cong dong viet bai / doan khoa mo buoi on dung cho)
```

**Chống rác & sai lệch:** chỉ ingest nội dung đạt ngưỡng chất lượng (đánh giá cộng đồng + kiểm duyệt lai đã có); provenance minh bạch; tách rạch ròi "quy định chính thức" khỏi "trải nghiệm cá nhân"; không biến TLUCS thành nơi chấm điểm con người thiếu kiểm chứng.

### 2.4. Lớp kết nối "đúng người"

- **Một danh tính, nhiều vai trò** — không có "khách hàng" và "chuyên gia" cố định. Hôm nay hỏi, mai giúp.
- **Ba cơ chế trên cùng bảng tin:** *miễn phí* (tương trợ) · *trao đổi* ("Tôi cần" và "Tôi có thể giúp") · *trả phí nhỏ* 10k–200k (tiền là **tín hiệu cam kết thời gian**, không phải mua câu trả lời).
- **Ghép theo ngữ cảnh địa phương trước:** trường, môn/chủ đề, trải nghiệm xác minh, lịch, khu vực, uy tín. Khớp đủ nhận ngay; gần khớp vào hàng đợi.
- **Từ bài đăng đến kết quả có cấu trúc:** phòng chat riêng, lịch, check-in, xác nhận hoàn tất, đánh giá hai chiều. Trả phí thì giữ tiền (escrow) và giải ngân sau 12 giờ không tranh chấp, phí nền tảng **1%**.
- **Bảng chia sẻ đảo chiều Bảng yêu cầu:** một bên bắt đầu từ *nhu cầu*, một bên từ *nguồn lực sẵn có*.
- **Trust graph theo ngữ cảnh đại học:** không phải một điểm sao bí ẩn, mà tập hợp công khai — huy hiệu trường, môn đã học (xác minh nhiều tầng), số phiên hoàn tất, đúng giờ, no-show, thời gian phản hồi, điểm nội dung tách khỏi điểm người chia sẻ, cộng thêm **điểm đóng góp tri thức**.

### 2.5. Bản đồ cung – cầu theo thời gian

Đầu ra tự nhiên của cả hai động cơ: mỗi yêu cầu, câu hỏi, lượt tra cứu là một tín hiệu nhu cầu gắn *trường / môn / chủ đề / thời điểm*. Tổng hợp ẩn danh thành dashboard cho trường / khoa / CLB:

- Môn nào đang "nóng" mà ít người nhận — **khoảng trống cung**.
- Nhu cầu theo mùa: đăng ký học phần, giữa kỳ, cuối kỳ, thực tập, học bổng.
- **Khoảng trống tri thức:** câu hỏi lặp lại nhiều mà kho trả lời yếu — gợi ý viết bài hoặc mở buổi ôn *đúng môn, đúng tuần*.

Đây là chỗ TLUCS chuyển từ "công cụ cho cá nhân" thành **hạ tầng điều phối nguồn lực học thuật của trường**.

### 2.6. Hai lớp cộng đồng (diễn đàn / server trường)

- Nơi thảo luận rộng, câu hỏi nhẹ, xây quan hệ.
- Đồng thời là **nguồn tri thức thô** cho kho.
- Có "đường chuyển đổi" từ thảo luận công khai sang yêu cầu có lịch, phòng riêng, escrow, đánh giá — không rời hệ sinh thái.

### 2.7. Vấn đề nền tảng

Không phải "sinh viên thiếu gia sư", mà là **nguồn lực trong cộng đồng đại học đã tồn tại nhưng bị phân mảnh** — khó tìm đúng người, khó đánh giá độ phù hợp, thiếu cơ chế khiến một người sẵn sàng dành thời gian; và **tri thức trải nghiệm không được chuẩn hóa, không tìm kiếm được, không tạo uy tín hay giá trị tích lũy**. Sinh viên năm đầu và người ít quan hệ chịu thiệt nhất. Đời sống đại học bị chẻ ra nhiều kênh rời rạc làm mất lịch sử uy tín và ngữ cảnh trường.

### 2.8. Nguyên tắc bất biến

1. Tầng tri thức miễn phí **luôn mở** — RAG và kho không được thành lý do bóp nội dung miễn phí để ép trả tiền.
2. Mọi câu trả lời RAG **có nguồn**; tách trải nghiệm cá nhân khỏi quy định chính thức.
3. Người đóng góp **kiểm soát** nội dung của mình (opt-in, gỡ/sửa, ẩn danh).
4. Không mở rộng trước khi kiểm chứng pilot HCMUS (tỷ lệ ghép ≥ 60%, hoàn tất ≥ 85%, weekly retention ≥ 30%).
5. 1% chưa phải mô hình bền vững — doanh thu bổ sung nghiên cứu *sau* khi có dữ liệu, không phá tính trung lập.
6. Khởi động vẫn hẹp: CNTT / Toán–Tin / Điện tử–Viễn thông tại HCMUS.

## 3. Tầm nhìn mở rộng

### 3.1. Hộ chiếu uy tín tích lũy và liên giai đoạn

Uy tín (gồm điểm đóng góp tri thức) đi theo người khi lên khóa, tốt nghiệp thành alumni mentor, hoặc tham gia trường thứ hai. Xuất được thành chứng nhận đóng góp cộng đồng dùng cho điểm rèn luyện, học bổng, hồ sơ xin việc.

### 3.2. Lớp cựu sinh viên và doanh nghiệp

Mentoring ngắn (định hướng nghề, review portfolio, mock interview). Doanh nghiệp *tài trợ phiên miễn phí* cho sinh viên thay vì mua quảng cáo — mô hình B2B không phá nguyên tắc miễn phí. Alumni là nguồn tri thức "ngành này ra làm gì".

### 3.3. Agent thành trợ lý học vụ cá nhân

Agent đọc ngữ cảnh (trường, khóa, môn đã học, lộ trình tín chỉ, lịch) và chủ động: nhắc mốc đăng ký học phần và deadline học bổng, gợi ý môn kỳ tới, tóm tắt "cần chuẩn bị gì cho môn X". Giữ nguyên tắc: tool ghi phải xác nhận, không vượt quyền, RAG dưới ngưỡng thì nói chưa biết.

### 3.4. Cẩm nang môn học sống

Câu hỏi lặp lại được cộng đồng (có AI hỗ trợ) tổng hợp thành trang cẩm nang **có phiên bản, có người bảo trì, có ghi công** — bước "kết tinh" của kho từ mảnh vụn thành tài liệu chuẩn.

### 3.5. Kinh tế tuần hoàn và học bổng vi mô minh bạch

Phí 1% và các khoản quyên góp vào một quỹ minh bạch (ghi trên ledger bất biến) tài trợ phiên cho sinh viên khó khăn. Có tính năng "trả trước một phiên cho người khác".

### 3.6. TLUCS như hạ tầng mở

Multi-tenant thật (taxonomy, moderator, cấu hình riêng từng trường). API/SDK để hệ thống học vụ đẩy danh mục môn, đoàn khoa cắm lịch buổi ôn, CLB tuyển thành viên.

### 3.7. Giữ giá trị ở lại nền tảng

Lịch sử uy tín, kho tra cứu được, dashboard cung–cầu, hộ chiếu đóng góp và quỹ học bổng khiến người dùng ở lại vì *mất gì khi rời*, không phải vì *bị chặn khi rời*.

### 3.8. Xa hơn (chưa ưu tiên)

Đa ngôn ngữ cho sinh viên quốc tế; hội đồng sinh viên tham gia quản trị kho tri thức; chuỗi học nhóm dài hạn.

## 4. Sơ đồ tổng thể

```text
TLUCS
├── KHO TRI THUC HOC THUAT MO  * trung tam
│   ├── Nguon nap: bai chia se . dien dan . phien (opt-in) . FAQ khoa . review tong hop
│   ├── Chuan hoa: truong/khoa/mon/ky . nguon . loai bang chung . do tin cay . han dung
│   ├── Truy xuat RAG: tu khoa + ngu nghia . loc ngu canh . nguong 85% . trich dan nguon
│   ├── Open core: cong khai / tra phi (metadata) / rieng tu (opt-in)
│   └── Ghi cong: diem dong gop tri thuc -> ho so uy tin
│
├── LOP KET NOI "DUNG NGUOI"
│   ├── Bang yeu cau: mien phi . trao doi . tra phi (10k-200k, phi nen tang 1%)
│   ├── Bang chia se: mo khoa ngay . buoi trao doi co lich
│   ├── Ghep theo ngu canh dia phuong -> phong rieng . lich . check-in . danh gia 2 chieu
│   └── Vi/escrow mo phong . giai ngan 12h khong tranh chap
│
├── CONG DONG
│   ├── Dien dan lien truong (feed Danh cho ban / Moi / Dang noi)
│   └── Server rieng tung truong (kenh mac dinh . chat real-time . moderator SV)
│
├── DANH TINH & NIEM TIN
│   ├── Dang nhap Google . ten hien thi . ten that chi lo sau khi ghep
│   ├── Xac minh nhieu tang: email truong -> the SV -> bang diem/mon
│   └── Trust graph nhieu truc (dung gio . hoan tat . noi dung . dong gop tri thuc)
│
├── AI
│   ├── RAG noi bo (nguong tin cay 85%, khong doan)
│   └── AI Agent: doc du lieu chay ngay . thao tac ghi phai xac nhan
│
├── AN TOAN & VAN HANH
│   ├── Kiem duyet lai: luat cung + AI + hang cho nguoi duyet + audit log
│   ├── Cam: lam ho/thi ho . mua ban de-dap an . da cap . lua dao . du lieu trai phep
│   └── Bao cao . tranh chap . phuc tra
│
└── DASHBOARD CUNG-CAU (cho truong / khoa / CLB)
    └── Mon "nong" . nhu cau theo mua . khoang trong tri thuc
```
