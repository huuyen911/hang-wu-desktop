# Hằng Wonder Union — Đặc tả nghiệp vụ cho người dùng

*Tài liệu này giải thích phần mềm làm được gì, làm theo quy tắc nào, và bạn cần thao tác ra sao. Không cần biết gì về kỹ thuật để đọc.*

Phiên bản phần mềm: **0.1.5**

---

## Mục lục

- [1. Tài liệu này dành cho ai](#1-tài-liệu-này-dành-cho-ai)
- [2. Phần mềm này để làm gì](#2-phần-mềm-này-để-làm-gì)
- [3. Các khái niệm cần hiểu trước](#3-các-khái-niệm-cần-hiểu-trước)
- [4. Quy trình làm việc một tháng](#4-quy-trình-làm-việc-một-tháng)
- [5. Khai báo dữ liệu gốc](#5-khai-báo-dữ-liệu-gốc)
- [6. Làm báo cáo bán hàng](#6-làm-báo-cáo-bán-hàng)
- [7. Chốt phiên — khoá số liệu lại](#7-chốt-phiên--khoá-số-liệu-lại)
- [8. Xuất file Excel](#8-xuất-file-excel)
- [9. Sao lưu & phục hồi dữ liệu](#9-sao-lưu--phục-hồi-dữ-liệu)
- [10. Cập nhật phần mềm](#10-cập-nhật-phần-mềm)
- [11. Quy tắc tính toán — giải thích bằng ví dụ](#11-quy-tắc-tính-toán--giải-thích-bằng-ví-dụ)
- [12. Bảng màu sắc & ký hiệu](#12-bảng-màu-sắc--ký-hiệu)
- [13. Câu hỏi thường gặp](#13-câu-hỏi-thường-gặp)
- [14. Những điều phần mềm KHÔNG làm](#14-những-điều-phần-mềm-không-làm)
- [15. Bảng kiểm hàng tháng](#15-bảng-kiểm-hàng-tháng)

---

## 1. Tài liệu này dành cho ai

Dành cho **người trực tiếp dùng phần mềm** — người nhập danh mục sản phẩm, nhập file bán hàng hàng tháng, và đọc/xuất báo cáo thưởng.

Bạn sẽ hiểu được:

- Phải khai báo những gì, theo thứ tự nào, thì báo cáo mới ra đúng.
- Mỗi con số trên màn hình được tính ra từ đâu.
- Vì sao đôi khi một CEO hoặc một cột không hiện lên.
- Khi nào nên "chốt phiên", và chốt rồi thì mất/được gì.

---

## 2. Phần mềm này để làm gì

Mỗi tháng bạn có một file Excel xuất từ hệ thống bán hàng, liệt kê từng dòng hàng đã bán: ai mua, mua sản phẩm gì, bao nhiêu, giá bao nhiêu.

Phần mềm giúp bạn biến file đó thành **báo cáo có thể dùng được**:

```
   File Excel bán hàng               Phần mềm                    Kết quả
   ────────────────────              ────────                    ───────
   Hàng nghìn dòng lẻ    ──────►   Đối chiếu với     ──────►   • Bảng tổng hợp: ai mua bao nhiêu thùng
   (mã CEO, mã SP,                  danh mục bạn                • Bảng chi tiết từng hoá đơn
    số lượng, tiền...)              đã khai báo                 • Bảng tính thưởng cho từng CEO
                                                                • File Excel để gửi đi
```

**Ba điểm quan trọng:**

1. **Phần mềm chạy hoàn toàn trên máy bạn.** Không cần internet để làm việc. Dữ liệu không gửi đi đâu cả.
2. **Không có tài khoản, không đăng nhập.** Ai mở được máy là dùng được.
3. **Chất lượng báo cáo phụ thuộc vào danh mục bạn khai.** File Excel chỉ có số lượng bán; còn *quy cách đóng thùng*, *mức thưởng*, *ai là cấp trên của ai* thì phần mềm lấy từ danh mục bạn tự nhập. Khai thiếu → báo cáo thiếu.

---

## 3. Các khái niệm cần hiểu trước

### 3.1 Thương hiệu

Có đúng **hai** thương hiệu: **Weilaiya** và **Elvawell**. Không thêm được thương hiệu thứ ba.

Mọi thứ trong phần mềm đều gắn với một trong hai thương hiệu này: sản phẩm thuộc thương hiệu nào, nhóm sản phẩm thuộc thương hiệu nào, báo cáo xem theo thương hiệu nào.

### 3.2 CEO

**CEO** là cách phần mềm gọi khách hàng / đại lý. Mỗi CEO có:

| Thông tin | Ý nghĩa |
|---|---|
| **Mã CEO** | Định danh duy nhất, ví dụ `W001`, `E015` |
| **Tên CEO** | Tên hiển thị |
| **CEO cấp trên** | Người đứng trên trong hệ thống. Có thể để trống nếu là cấp cao nhất |
| **Nhân viên chăm sóc** | Hằng hoặc Hiền |

> **Quy ước quan trọng về mã CEO:**
> Phần mềm nhận biết CEO thuộc thương hiệu nào **qua chữ cái đầu của mã**:
> - Mã bắt đầu bằng **W** → thuộc **Weilaiya**
> - Mã bắt đầu bằng **E** → thuộc **Elvawell**
>
> Nếu bạn đặt mã CEO là `KH001` hay `123`, CEO đó **sẽ không xuất hiện trên tab báo cáo nào cả**.

### 3.3 Cây cấp trên — cấp dưới

Các CEO tạo thành một sơ đồ hình cây:

```
        W001  (không có cấp trên)
        ├── W002
        │   ├── W004
        │   └── W005
        └── W003
```

Ý nghĩa nghiệp vụ: khi cấp dưới bán hàng, cấp trên **được hưởng một phần thưởng**.

> **Chỉ chuyển lên đúng MỘT cấp.** Trong ví dụ trên, W004 bán hàng → W002 được hưởng thưởng cấp trên. **W001 không được gì** từ doanh số của W004.

### 3.4 Sản phẩm và quy cách

Mỗi sản phẩm có **quy cách** = số đơn vị trong một thùng.

> Ví dụ: sản phẩm `SP-A` có quy cách `24` nghĩa là 24 chai một thùng.

Quy cách dùng để quy đổi từ **số lượng bán** sang **số thùng** — và số thùng chính là cơ sở tính thưởng.

> **Sản phẩm chưa khai quy cách trong danh mục thì không quy ra thùng được → không tính được thưởng.**

### 3.5 Sản phẩm chính

Đây là khái niệm dễ nhầm nhất, cần đọc kỹ.

Mỗi sản phẩm có **hai công tắc độc lập**:

- ☐ Sản phẩm chính — **Weilaiya**
- ☐ Sản phẩm chính — **Elvawell**

Ý nghĩa: **báo cáo chỉ hiển thị những sản phẩm được đánh dấu là "sản phẩm chính"** của thương hiệu bạn đang xem. Sản phẩm không được đánh dấu sẽ bị ẩn hoàn toàn khỏi tab Báo cáo — không tính vào tổng số lượng, không tính vào tổng tiền, không tính thưởng.

Hai công tắc này **độc lập với thương hiệu gốc của sản phẩm**. Nghĩa là:

> Sản phẩm `SP-X` thuộc thương hiệu **Weilaiya**, nhưng bạn vẫn có thể bật công tắc *"Sản phẩm chính — Elvawell"*. Khi đó, ở tab báo cáo Elvawell, sản phẩm này **sẽ được tính**.

Bốn tổ hợp có thể có:

| Bật Weilaiya | Bật Elvawell | Kết quả |
|:---:|:---:|---|
| ✔ | ✖ | Chỉ hiện ở tab Weilaiya |
| ✖ | ✔ | Chỉ hiện ở tab Elvawell |
| ✔ | ✔ | Hiện ở cả hai tab |
| ✖ | ✖ | **Không hiện ở tab nào** — sản phẩm bị bỏ qua trong báo cáo |

### 3.6 Nhóm sản phẩm

**Nhóm sản phẩm** là cách bạn gom nhiều sản phẩm lại để tính chung. Nhóm là **cột** trong bảng báo cáo tổng hợp, và là **đơn vị tính thưởng**.

Ba quy tắc bắt buộc:

1. **Một nhóm chỉ chứa sản phẩm cùng thương hiệu với nhóm.**
2. **Một sản phẩm chỉ được thuộc tối đa một nhóm** trên toàn hệ thống. Không thể cho `SP-A` vừa vào nhóm "Dưỡng da" vừa vào nhóm "Khuyến mãi".
3. **Nhóm phải có ít nhất một sản phẩm.**

Sản phẩm **không thuộc nhóm nào** vẫn xuất hiện trên báo cáo, nhưng đứng riêng thành một cột lẻ mang tên chính mã sản phẩm đó, và mức thưởng lấy trực tiếp từ khai báo trên sản phẩm.

### 3.7 Mức thưởng

Thưởng được khai theo **đồng / thùng**, ở **hai chỗ**:

| Khai ở đâu | Áp dụng cho |
|---|---|
| Trên **nhóm sản phẩm** | Mọi sản phẩm thuộc nhóm đó |
| Trên **từng sản phẩm** | Chỉ dùng khi sản phẩm **không thuộc nhóm nào** |

Mỗi chỗ có hai ô:

- **Thưởng CEO** — số tiền chính CEO đó nhận, trên mỗi thùng.
- **Thưởng cấp trên** — số tiền CEO cấp trên nhận, trên mỗi thùng cấp dưới bán được.

> **Nếu sản phẩm đã nằm trong một nhóm, mức thưởng khai trên sản phẩm sẽ bị bỏ qua.** Nhóm luôn được ưu tiên.

### 3.8 Phiên

**Phiên** = một lần bạn nhập file Excel vào.

Mỗi lần nhập tạo ra một phiên mới, được lưu vĩnh viễn. Bạn đặt tên cho nó (ví dụ *"Báo cáo tháng 7/2026"*), và có thể mở lại xem bất cứ lúc nào, sửa dòng, đổi tên, hoặc xoá.

Danh sách phiên nằm ngay ở màn hình Báo cáo bán hàng.

### 3.9 Cross-brand (mua chéo thương hiệu)

Một CEO mã `W001` (thuộc Weilaiya) hoàn toàn có thể mua sản phẩm của Elvawell. Phần mềm gọi đây là **cross-brand** và hiển thị các giao dịch đó **ngay trong tab Weilaiya**, có gắn nhãn cam chữ **E** để bạn phân biệt.

Nghĩa là: bạn xem tab của một thương hiệu thì thấy **toàn bộ** hoạt động của các CEO thuộc thương hiệu đó, kể cả phần họ mua bên kia.

---

## 4. Quy trình làm việc một tháng

```
  ┌─ LÀM MỘT LẦN, RỒI CHỈ BỔ SUNG ────────────────────────────┐
  │                                                            │
  │  ① Khai Sản phẩm     ② Khai Nhóm SP      ③ Khai CEO       │
  │     (quy cách,          (gom SP,            (mã, tên,      │
  │      SP chính)           mức thưởng)         cấp trên)     │
  └────────────────────────────┬───────────────────────────────┘
                               │
  ┌─ LÀM MỖI THÁNG ────────────▼───────────────────────────────┐
  │                                                            │
  │  ④ Nhập file Excel  →  ⑤ Đặt tên phiên  →  ⑥ Kiểm tra     │
  │                                              báo cáo       │
  │                                                 │          │
  │  ⑨ Sao lưu  ←  ⑧ Xuất Excel  ←  ⑦ Chốt phiên  ─┘          │
  └────────────────────────────────────────────────────────────┘
```

**Thứ tự khai báo dữ liệu gốc là bắt buộc:**

> Sản phẩm **trước** → Nhóm sản phẩm **sau** (vì nhóm cần chọn sản phẩm) → CEO (khai lúc nào cũng được, nhưng phải khai cấp trên trước rồi mới gán được cho cấp dưới).

---

## 5. Khai báo dữ liệu gốc

Vào mục **Dữ liệu** ở thanh bên trái.

---

### 5.1 Màn hình **Sản phẩm**

#### Bạn nhập gì

| Ô | Bắt buộc | Giải thích | Ví dụ |
|---|:---:|---|---|
| **Mã sản phẩm** | ✔ | Phải trùng đúng mã trong file Excel bán hàng. Không được trùng với sản phẩm khác. | `WLY-001` |
| **Tên sản phẩm** | ✔ | Tên hiển thị | `Dầu gội bưởi 300ml` |
| **Quy cách** | ✔ | Số đơn vị trong một thùng. Phải là số nguyên lớn hơn 0 | `24` |
| **Thương hiệu** | ✔ | Weilaiya hoặc Elvawell | `Weilaiya` |
| **Thưởng CEO** | ✖ | Đồng/thùng. Chỉ dùng khi SP không thuộc nhóm nào | `50.000` |
| **Thưởng cấp trên** | ✖ | Đồng/thùng. Chỉ dùng khi SP không thuộc nhóm nào | `20.000` |
| **Sản phẩm chính — Elvawell** | ✖ | Bật thì sản phẩm được tính trong báo cáo Elvawell | ☐ |
| **Sản phẩm chính — Weilaiya** | ✖ | Bật thì sản phẩm được tính trong báo cáo Weilaiya | ☑ |

> ⚠️ **Mã sản phẩm phải khớp tuyệt đối với file Excel.** Nếu file ghi `WLY-001` mà bạn khai `WLY001`, phần mềm coi đó là hai sản phẩm khác nhau: sản phẩm trong file sẽ hiện lên báo cáo với cảnh báo *"chưa có trong danh mục"* và không quy ra thùng được.

#### Bạn tìm và lọc thế nào

- Ô tìm kiếm: gõ mã hoặc tên. **Không cần gõ dấu** — gõ `duong da` vẫn ra `Dưỡng da`.
- Lọc theo thương hiệu.
- Hai ô tích: **Chính (Elvawell)** / **Chính (Weilaiya)** — lọc ra những sản phẩm đã bật công tắc tương ứng. Rất tiện để rà soát xem đã bật đủ chưa.

#### Xoá sản phẩm

Xoá một sản phẩm sẽ **tự động gỡ nó ra khỏi nhóm** đang chứa nó. Nhóm vẫn còn, chỉ mất một thành viên.

---

### 5.2 Màn hình **Nhóm sản phẩm**

#### Bạn nhập gì

| Ô | Bắt buộc | Giải thích |
|---|:---:|---|
| **Tên nhóm sản phẩm** | ✔ | Không được trùng. Đây chính là tên cột trên bảng báo cáo |
| **Thương hiệu** | ✔ | Weilaiya hoặc Elvawell |
| **Thưởng CEO** | ✖ | Đồng/thùng, áp cho mọi sản phẩm trong nhóm |
| **Thưởng cấp trên** | ✖ | Đồng/thùng, áp cho mọi sản phẩm trong nhóm |
| **Sản phẩm** | ✔ | Chọn từ danh sách. Ít nhất một sản phẩm |

#### ⚠️ Vì sao không thấy sản phẩm trong danh sách chọn?

Danh sách sản phẩm khi tạo nhóm **chỉ hiện những sản phẩm đã bật công tắc "Sản phẩm chính"** của đúng thương hiệu bạn đang chọn cho nhóm.

> **Không thấy sản phẩm cần chọn?** Sang màn hình *Sản phẩm*, mở sản phẩm đó ra, bật công tắc *"Sản phẩm chính — <thương hiệu>"*, lưu lại, rồi quay về.

#### ⚠️ Vì sao chọn được nhưng lưu lại báo lỗi?

Có thể xảy ra tình huống: sản phẩm hiện trong danh sách chọn nhưng khi bấm Lưu thì báo

> *"Sản phẩm sau không thuộc thương hiệu Elvawell: WLY-001 - Dầu gội bưởi"*

Lý do: danh sách chọn lọc theo **công tắc sản phẩm chính**, còn khi lưu thì phần mềm kiểm tra **thương hiệu gốc** của sản phẩm. Hai tiêu chí này khác nhau.

**Cách xử lý:** nhóm Elvawell chỉ nhận được sản phẩm có *Thương hiệu = Elvawell*. Nếu bạn muốn tính một sản phẩm Weilaiya trong báo cáo Elvawell, hãy **để nó ở ngoài nhóm** (nó sẽ thành một cột lẻ) và khai mức thưởng trực tiếp trên sản phẩm đó.

#### Lưu ý khác

- **Đổi thương hiệu của nhóm sẽ xoá sạch danh sách sản phẩm đang chọn.** Phải chọn lại từ đầu.
- Nếu báo lỗi *"Sản phẩm sau đã thuộc nhóm khác: … (nhóm "Dưỡng da")"* → gỡ sản phẩm khỏi nhóm cũ trước.
- Xoá một nhóm **không xoá sản phẩm**; các sản phẩm chỉ trở về trạng thái "chưa phân nhóm".

#### Tìm kiếm

Có hai ô tìm riêng:
- **Tên nhóm sản phẩm** — tìm theo tên nhóm.
- **Mã, tên sản phẩm** — tìm những **nhóm đang chứa** sản phẩm đó. Rất tiện khi bạn muốn biết *"sản phẩm này đang nằm trong nhóm nào?"*.

---

### 5.3 Màn hình **CEO**

Màn hình này hiển thị dạng **cây**, không phải bảng — để bạn nhìn thấy ngay ai là cấp trên của ai.

```
▾ W001  Nguyễn Văn A      [2]  [Hằng]        ✏ 🗑
  ▾ W002  Trần Thị B      [1]  [Hiền]        ✏ 🗑
      W004  Lê Văn C           [Hằng]        ✏ 🗑
    W003  Phạm Thị D           [Hằng]        ✏ 🗑
```

- Con số trong ngoặc vuông `[2]` = số CEO cấp dưới **trực tiếp**.
- Bấm vào một hàng có cấp dưới để **gập / mở**.
- Nhãn màu bên phải là **nhân viên chăm sóc**: `Hằng` màu xanh ngọc, `Hiền` màu hồng.

#### Bạn nhập gì

| Ô | Bắt buộc | Giải thích |
|---|:---:|---|
| **Mã CEO** | ✔ | Phải trùng đúng mã trong file Excel. Bắt đầu bằng `W` hoặc `E`. Không được trùng |
| **Tên CEO** | ✔ | |
| **CEO cấp trên** | ✖ | Chọn từ danh sách. Để trống nếu là cấp cao nhất |
| **Nhân viên chăm sóc** | ✔ | Hằng hoặc Hiền |

#### Tìm kiếm trong cây

Khi bạn gõ tìm kiếm hoặc lọc theo nhân viên chăm sóc:

- Cây **giữ lại cả nhánh** chứa kết quả — bạn vẫn thấy được cấp trên của người khớp, để không mất ngữ cảnh.
- Người **khớp trực tiếp** được tô **nền vàng**.
- Mọi nhánh tự động bung ra.
- Con số ở góc là **số người khớp thật sự**, không phải số dòng đang hiển thị.

#### Khi xoá một CEO

Cấp dưới của người bị xoá **không bị xoá theo**, nhưng sẽ **mất cấp trên** (trở thành gốc của cây). Bạn cần gán lại cấp trên cho họ, nếu không phần thưởng chuyển lên sẽ bị mất.

---

## 6. Làm báo cáo bán hàng

Vào **Công cụ → Báo cáo hàng bán**.

---

### 6.1 Nhập file Excel

Có hai cách, kết quả như nhau:

1. **Kéo file từ Windows Explorer thả vào khung** — khung sẽ chuyển màu xanh khi bạn kéo tới.
2. **Bấm vào khung** (hoặc nút *Chọn file*) để mở hộp thoại chọn file.

Chỉ nhận file **`.xlsx`** hoặc **`.xls`**.

#### File Excel phải có cấu trúc như thế nào

Phần mềm đọc **sheet đầu tiên** và lấy dữ liệu ở **các cột cố định**:

| Cột Excel | Nội dung |
|:---:|---|
| **A** | Mã CEO |
| **B** | Tên CEO |
| **J** | Mã sản phẩm |
| **K** | Tên sản phẩm |
| **L** | Thương hiệu |
| **N** | Đơn vị tính |
| **T** | Mã hoá đơn |
| **V** | Tháng / thời gian |
| **W** | Số lượng |
| **X** | Đơn giá |
| **Z** | Thành tiền |

> ⚠️ **Vị trí các cột là cố định trong phần mềm.** Nếu hệ thống bán hàng đổi bố cục file xuất, phần mềm sẽ không đọc được và cần cập nhật phiên bản mới.

#### Dòng nào được nhận, dòng nào bị bỏ

Phần mềm **giữ lại** một dòng khi cả bốn điều kiện sau đúng:

- Cột A (mã CEO) có nội dung
- Cột L (thương hiệu) có nội dung
- Cột W (số lượng) đọc được thành số
- Cột J (mã sản phẩm) có nội dung

Mọi dòng khác — tiêu đề, dòng trống, dòng tổng cộng, dòng ghi chú — **bị bỏ qua âm thầm**, không báo lỗi. Nhờ vậy bạn không cần dọn file trước khi nhập.

Nếu **không dòng nào** hợp lệ, phần mềm báo:

> *Không tìm thấy dữ liệu hợp lệ trong file. Hãy kiểm tra lại định dạng.*

#### Cách phần mềm đọc số

File Excel thường ghi số theo nhiều kiểu khác nhau. Phần mềm tự nhận diện:

| Trong file ghi | Phần mềm hiểu là |
|---|---|
| `1.234.567` | 1.234.567 |
| `1.234,56` | 1.234,56 |
| `1,234.56` | 1.234,56 |
| `1234,5` | 1.234,5 |

> **Một lưu ý:** chuỗi `1.234` (chỉ một dấu chấm) được hiểu là **1,234** chứ không phải **1234**. Đây là điểm không thể phân biệt nếu chỉ nhìn chuỗi. Nếu file của bạn hay xuất số kiểu này, nên để Excel định dạng ô là **kiểu số** thay vì kiểu văn bản.

---

### 6.2 Đặt tên phiên

Sau khi đọc xong file, phần mềm hỏi tên phiên:

> *File `bao-cao-thang-7.xlsx` — 1.284 dòng hợp lệ. Đặt tên để xem lại trong lịch sử.*

Tên gợi ý sẵn là tên file (bỏ phần đuôi). Bạn nên đặt tên có ý nghĩa, ví dụ **"Tháng 7/2026"**.

Bấm **Lưu & mở** → phiên được lưu và mở ra ngay.

---

### 6.3 Danh sách phiên đã nhập

Ngay dưới khung nhập file là bảng lịch sử:

| Cột | Ý nghĩa |
|---|---|
| **Tên phiên** | Tên bạn đặt. Có nhãn cam 🔒 *Đã chốt* nếu phiên đã bị khoá |
| **File** | Tên file gốc |
| **Số dòng** | Số dòng hợp lệ |
| **Ngày import** | Lần nhập đầu tiên |
| **Cập nhật gần nhất** | Chỉ hiện nếu bạn đã sửa dữ liệu sau khi nhập; chưa sửa thì hiện `—` |
| **Thao tác** | 📂 Mở · ✏️ Đổi tên · 🗑 Xoá |

Phiên **đã chốt** thì nút Đổi tên và Xoá bị mờ đi, không bấm được.

---

### 6.4 Màn hình báo cáo

Khi mở một phiên, bạn thấy:

```
┌────────────────────────────────────────────────────────────────────┐
│ ← Danh sách phiên   Tháng 7/2026        [🔒 Chốt phiên] [Báo cáo|Dữ liệu] │
├────────────────────────────────────────────────────────────────────┤
│  Weilaiya  │  Elvawell                          ← tab thương hiệu   │
├────────────────────────────────────────────────────────────────────┤
│ 👥 Tổng CEO  📦 Tổng sản phẩm  📋 Tổng thùng  💰 Tổng tiền  🎁 Tổng thưởng │
│      45          128.400          5.350       2.140.000.000   87.500.000 │
├────────────────────────────────────────────────────────────────────┤
│ [CEO ▾] [Mã/Tên/Nhóm SP] [Mã hoá đơn] [Trạng thái nhập hàng ▾]     │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│           Tổng hợp  │  Chi tiết  │  Thưởng CEO                     │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

#### Hai tab lớn: **Báo cáo** và **Dữ liệu**

- **Báo cáo** — nơi bạn xem kết quả đã tổng hợp.
- **Dữ liệu** — bảng thô từng dòng, để sửa chữa.

#### Tab thương hiệu

Các tab thương hiệu được tạo **từ chính nội dung file**, không phải từ danh mục. Nếu file tháng này chỉ có hàng Weilaiya thì chỉ có một tab.

Bộ lọc bạn đặt ở tab này **được nhớ riêng cho từng tab** — chuyển qua lại không mất.

#### Thanh thống kê

| Ô | Ý nghĩa |
|---|---|
| **Tổng CEO** | Số CEO đang hiển thị. Khi đang lọc sẽ hiện dạng `12/45` |
| **Tổng sản phẩm** | Tổng số lượng đơn vị (chai, hộp…) đã bán |
| **Tổng thùng** | Tổng quy đổi ra thùng. Chỉ hiện khi lớn hơn 0 |
| **Tổng tiền** | Tổng thành tiền |
| **Tổng thưởng** | Tổng thưởng của tất cả CEO đang hiển thị |

> ⚠️ **Con số "Tổng thùng" ở thanh này là số chưa làm tròn**, nên có thể **lớn hơn** tổng của cột "Tổng thùng" trong bảng Tổng hợp bên dưới. Xem giải thích chi tiết ở [mục 11.2](#112-vì-sao-hai-chỗ-tổng-thùng-lệch-nhau).

#### Bốn bộ lọc

| Bộ lọc | Tác dụng |
|---|---|
| **CEO** | Chỉ xem một CEO |
| **Mã / Tên / Nhóm sản phẩm** | Giữ lại các CEO **có mua** sản phẩm/nhóm khớp từ khoá. Tìm không dấu |
| **Mã hoá đơn** | Giữ lại các CEO có hoá đơn khớp |
| **Trạng thái nhập hàng** | *Có nhập hàng* / *Không nhập hàng* |

> **Lưu ý về "Trạng thái nhập hàng":** tiêu chí này được đánh giá **sau khi** phần mềm đã lọc bỏ các sản phẩm không phải "sản phẩm chính". Một CEO có mua hàng nhưng toàn sản phẩm phụ sẽ bị xếp vào nhóm **"Không nhập hàng"**.

---

### 6.5 Chế độ **Tổng hợp** (bảng ma trận)

Đây là bảng chính. **Mỗi hàng là một CEO, mỗi cột là một nhóm sản phẩm, mỗi ô là số thùng.**

```
       ┌──────┬────────────┬────────┬────────┬─────────┬───────────┬──────────┐
       │ Mã   │ Tên CEO    │ Dưỡng  │ Làm    │ [E] Kem │ Tổng thùng│ Tổng SP  │
       │ CEO  │            │ da     │ sạch   │ dưỡng   │           │          │
       ├──────┼────────────┼────────┼────────┼─────────┼───────────┼──────────┤
   Σ   │ Tổng │            │  1.240 │   860  │    95   │   2.195   │  52.680  │
       ├──────┼────────────┼────────┼────────┼─────────┼───────────┼──────────┤
   1   │ W001 │ Nguyễn A   │    58  │    42  │     6   │     106   │   2.544  │
   2   │ W002 │ Trần B  [E]│    31  │     —  │    12   │      43   │   1.032  │
   3   │ W009 │ Lê C       │     —  │    15  │     —   │      15   │     360  │
       └──────┴────────────┴────────┴────────┴─────────┴───────────┴──────────┘
```

#### Cách đọc bảng

| Thành phần | Ý nghĩa |
|---|---|
| **Hàng Σ (màu xanh nhạt)** | Tổng của cả cột. Luôn dính ở trên khi cuộn |
| **Ba cột đầu** | Luôn dính bên trái khi cuộn ngang |
| **Hai cột cuối** | Luôn dính bên phải |
| **Ô có số** (nền xanh nhạt) | Bấm vào để xem chi tiết từng hoá đơn |
| **Ô ghi `—`** | CEO này không đạt tối thiểu 1 thùng ở cột đó |
| **Nhãn cam `[E]` / `[W]`** trên tiêu đề cột | Cột đó thuộc thương hiệu khác — đây là hàng mua chéo |
| **Nhãn cam cạnh tên CEO** | CEO này có mua hàng của thương hiệu khác |
| **Mã CEO màu đỏ** | Mã này có trong file Excel nhưng **chưa được khai trong danh mục CEO** |
| **Tên cột màu đỏ** | Sản phẩm này có trong file nhưng **chưa được khai trong danh mục Sản phẩm** |

#### Sắp xếp

Bấm vào **tiêu đề bất kỳ cột nào** (kể cả *Tổng thùng*, *Tổng sản phẩm*) để sắp xếp. Bấm liên tiếp sẽ đổi: **giảm dần → tăng dần → bỏ sắp xếp**.

#### Vì sao một số cột không xuất hiện?

Phần mềm **tự ẩn** những cột mà **không CEO nào đạt tối thiểu 1 thùng**. Điều này giữ bảng gọn.

**Ngoại lệ:** cột của sản phẩm **chưa có trong danh mục** luôn được giữ lại và tô đỏ — để bạn biết mà bổ sung.

#### Xem chi tiết một ô

Bấm vào một ô có số → mở cửa sổ liệt kê từng mã sản phẩm trong ô đó: tổng số lượng, tổng thùng, tổng tiền, và danh sách hoá đơn / thời gian / đơn giá.

Bấm vào ô **Tổng thùng** hoặc **Tổng sản phẩm** → xem chi tiết toàn bộ sản phẩm của CEO đó.

---

### 6.6 Chế độ **Chi tiết**

Màn hình chia đôi:

**Bên trái** — danh sách CEO, có thể sắp xếp theo **Thùng** hoặc **Sản phẩm**, tăng hay giảm dần. Mỗi mục hiện mã, tên, số thùng và số sản phẩm. CEO chưa phát sinh đơn hiện chữ nghiêng *"Không có dữ liệu"*.

**Bên phải** — bảng chi tiết của CEO đang chọn, **gộp tất cả các tháng**, chia thành từng khối theo nhóm sản phẩm:

```
╔═══════════════════════════════════════════════════════════════════╗
║ Dưỡng da                        1.392        58        69.600.000 ║  ← khối nhóm (nền xanh ngọc)
╟───────────────────────────────────────────────────────────────────╢
║   WLY-001  Dầu gội bưởi   HD001    chai   960   24   40   ...     ║
║   WLY-002  Dầu xả bưởi    HD001    chai   432   24   18   ...     ║
╠═══════════════════════════════════════════════════════════════════╣
║ [E] Kem dưỡng                     144         6        14.400.000 ║  ← khối cross-brand
╟───────────────────────────────────────────────────────────────────╢
║   ELV-010  Kem đêm        HD004    hộp   144   24    6   ...      ║
╠═══════════════════════════════════════════════════════════════════╣
║ Chưa phân nhóm                     80         —         3.200.000 ║  ← khối đỏ
╟───────────────────────────────────────────────────────────────────╢
║   XXX-999  Sản phẩm lạ    HD007    cái    80    —    —   ...      ║  ← nền cam: thiếu quy cách
╚═══════════════════════════════════════════════════════════════════╝
```

Thứ tự khối: nhóm của thương hiệu đang xem → nhóm mua chéo → **Chưa phân nhóm** (nền đỏ nhạt).

Các cột *Mã hoá đơn*, *Thời gian*, *Đơn giá* liệt kê **nhiều dòng trong cùng một ô** khi sản phẩm được mua nhiều lần.

> 🟠 **Hàng nền cam** = sản phẩm chưa khai quy cách trong danh mục → cột *Quy cách* và *Số lượng thùng* hiện `—`. **Sản phẩm này không được tính thưởng.**

---

### 6.7 Chế độ **Thưởng CEO**

```
┌─────┬────────┬──────────────┬─────────┬──────────────┬─────────┬──────────────┬──────────────┐
│ STT │ Mã CEO │ Tên CEO      │ Thùng   │ Thưởng       │ Thùng từ│ Thưởng từ    │ Tổng thưởng  │
│     │        │              │ bản thân│ bản thân     │ cấp dưới│ cấp dưới     │              │
├─────┼────────┼──────────────┼─────────┼──────────────┼─────────┼──────────────┼──────────────┤
│  1  │ W001   │ Nguyễn Văn A │    106  │  5.300.000 ₫ │     74  │  1.480.000 ₫ │  6.780.000 ₫ │
│  2  │ W002   │ Trần Thị B   │     43  │  2.150.000 ₫ │     15  │    300.000 ₫ │  2.450.000 ₫ │
│  3  │ W009   │ Lê Văn C     │     15  │    750.000 ₫ │      —  │          — ₫ │    750.000 ₫ │
├─────┴────────┴──────────────┼─────────┼──────────────┼─────────┼──────────────┼──────────────┤
│  Tổng                       │    164  │  8.200.000 ₫ │     89  │  1.780.000 ₫ │  9.980.000 ₫ │
└─────────────────────────────┴─────────┴──────────────┴─────────┴──────────────┴──────────────┘
```

Năm cột số đều **sắp xếp được** bằng cách bấm vào tiêu đề.

**Bấm vào một hàng** để xem chi tiết: thưởng của CEO đó đến từ những nhóm/sản phẩm nào, và phần nhận từ cấp dưới đến từ những ai, từng nhóm bao nhiêu.

> **Số thùng ở bảng này luôn khớp với bảng Tổng hợp**, kể cả khi bạn đang lọc. Cả hai dùng chung một cách tính.

Những nhóm/sản phẩm **chưa khai mức thưởng** vẫn hiện trong phần chi tiết với số tiền `0` — để cột *Thùng bản thân* khớp đúng với *Tổng thùng* bên bảng Tổng hợp.

---

### 6.8 Tab **Dữ liệu** — sửa chữa số liệu

Đây là bảng thô, từng dòng đúng như trong file Excel, có 12 cột thông tin.

#### Bạn làm được gì

| Việc | Cách làm |
|---|---|
| **Thêm dòng** | Nút *Thêm dòng* ở góc trái |
| **Sửa dòng** | Biểu tượng bút chì ở cuối hàng |
| **Xoá dòng** | Biểu tượng thùng rác, có hỏi xác nhận |
| **Lọc** | Theo CEO, thương hiệu, mã/tên sản phẩm, mã hoá đơn, tháng |

Bảng hiển thị **50 dòng mỗi trang**, sắp theo mã CEO rồi mã sản phẩm.

#### Cửa sổ thêm/sửa dòng

| Ô | Bắt buộc | Ghi chú |
|---|:---:|---|
| **CEO** | ✔ | Chọn từ danh mục CEO. Chọn xong tự điền tên |
| **Thương hiệu** | ✔ | Đổi thương hiệu sẽ **xoá sản phẩm đang chọn** |
| **Sản phẩm** | ✔ | Chỉ hiện sản phẩm cùng thương hiệu. Chọn xong tự điền tên |
| **Đơn vị tính** | ✖ | |
| **Mã hoá đơn** | ✖ | |
| **Thời gian** | ✖ | Chọn ngày giờ. Tháng được suy ra tự động |
| **Số lượng** | ✔ | |
| **Đơn giá** | ✖ | Bỏ trống = 0 |
| **Thành tiền** | ✖ | **Bỏ trống = tự tính Số lượng × Đơn giá** |

#### Mọi thay đổi được lưu tự động

Bạn **không cần bấm Lưu**. Phần mềm tự ghi xuống máy sau khoảng nửa giây kể từ thao tác cuối.

Nếu bạn đóng cửa sổ ngay sau khi sửa, phần mềm sẽ **chờ ghi xong rồi mới thoát** — không mất dữ liệu.

Nếu ghi thất bại, sẽ có thông báo đỏ *"Lưu phiên thất bại"*.

> Mỗi lần sửa dữ liệu, cột **Cập nhật gần nhất** ở danh sách phiên sẽ đổi, và phiên đó nhảy lên đầu danh sách.

---

## 7. Chốt phiên — khoá số liệu lại

### 7.1 Vì sao cần chốt

Báo cáo được tính từ **hai nguồn**: dữ liệu trong file (số lượng bán) và **danh mục hiện tại** (quy cách, nhóm, mức thưởng, cây cấp trên).

Nghĩa là nếu tháng sau bạn sửa quy cách của một sản phẩm, hoặc đổi mức thưởng của một nhóm, thì **báo cáo tháng trước cũng đổi theo**. Số bạn đã gửi đi và số bạn thấy trên màn hình sẽ không còn khớp.

**Chốt phiên** giải quyết việc này: phần mềm **chụp lại toàn bộ danh mục** tại thời điểm chốt và gắn vào phiên đó. Từ đó về sau, phiên này luôn tính bằng bản chụp — dù danh mục có đổi thế nào.

### 7.2 Chốt như thế nào

Bấm nút **🔒 Chốt phiên** ở góc trên bên phải. Cửa sổ xác nhận hiện ra:

> Số liệu báo cáo **và phần tính thưởng CEO** sẽ được **CỐ ĐỊNH** theo danh mục tại thời điểm này. Sau khi chốt, dù có sửa sản phẩm / quy cách / nhóm / CEO / mức thưởng trong danh mục, phiên này **VẪN GIỮ NGUYÊN** số liệu & thưởng.
>
> Phiên sẽ bị khoá: không sửa / đổi tên / xoá được cho tới khi bạn hủy chốt.

### 7.3 Sau khi chốt thì khác gì

| | Chưa chốt | Đã chốt |
|---|---|---|
| Số liệu báo cáo | Thay đổi theo danh mục hiện tại | **Cố định** |
| Thêm / sửa / xoá dòng | Được | Nút biến mất |
| Đổi tên phiên | Được | Không được |
| Xoá phiên | Được | Không được |
| Xem báo cáo, xuất Excel | Được | **Vẫn được bình thường** |

Trên màn hình sẽ có nhãn cam **🔒 Đã chốt lúc 31/07/2026 14:22**, và trong danh sách phiên cũng có nhãn tương tự.

### 7.4 Hủy chốt

Bấm **🔓 Hủy chốt**. Cửa sổ cảnh báo:

> Ngay khi bạn xác nhận, báo cáo & thưởng sẽ **CẬP NHẬT LẬP TỨC** theo danh mục mới nhất hiện tại. Các số liệu phụ thuộc danh mục — đặc biệt là **SỐ THÙNG**, cách gom nhóm, mức thưởng, việc lọc "chỉ sản phẩm chính" — có thể thay đổi so với bản đã chốt.

Bản chụp cũ **bị xoá hẳn**, không lấy lại được. Nếu chốt lại, phần mềm chụp một bản mới theo danh mục ở thời điểm chốt lại.

### 7.5 Khuyến nghị sử dụng

> **Chốt phiên ngay sau khi bạn kiểm tra xong và đã gửi báo cáo đi.**
>
> Trình tự an toàn:
> 1. Nhập file
> 2. Rà soát cảnh báo (mã đỏ, hàng cam) — bổ sung danh mục nếu cần
> 3. Kiểm tra số liệu, sửa dòng nếu có sai sót
> 4. Xuất Excel
> 5. **Chốt phiên**
> 6. Sao lưu

---

## 8. Xuất file Excel

Nút **Xuất Excel** ở góc trên bên phải, chỉ hiện khi bạn đang ở chế độ **Tổng hợp** hoặc **Thưởng CEO**.

| Đang xem | File xuất ra | Tên gợi ý |
|---|---|---|
| Tổng hợp | Bảng ma trận CEO × nhóm | `Báo cáo hàng bán theo khách 2026-07-31.xlsx` |
| Thưởng CEO | Bảng thưởng 5 cột | `Tính thưởng CEO Weilaiya 2026-07-31.xlsx` |

**File xuất ra chứa đúng những gì bạn đang thấy** — nghĩa là **bộ lọc hiện tại được áp dụng**. Đang lọc 12/45 CEO thì file chỉ có 12 CEO.

**Đặc điểm file Excel sinh ra:**

- Hàng tiêu đề nền xanh đậm chữ trắng.
- Hàng thứ hai là **hàng tổng**, dùng **công thức `SUM`** thật — nếu người nhận sửa số, tổng tự cập nhật.
- Cột *Tổng thùng* / *Tổng thưởng* cũng là công thức cộng các cột bên trái.
- Hàng chẵn/lẻ có màu nền xen kẽ cho dễ đọc.
- Ô có giá trị lớn hơn 0 in màu xanh đậm; ô bằng 0 in màu xám nhạt.
- Khác với màn hình: **file xuất giữ cả những cột không có số liệu**, và ô trống ghi `0` thay vì `—`.

---

## 9. Sao lưu & phục hồi dữ liệu

Vào **Hệ thống → Sao lưu & Phục hồi**.

### 9.1 Dữ liệu của bạn nằm ở đâu

Toàn bộ dữ liệu nằm trong **một file duy nhất** trên máy bạn:

```
%APPDATA%\com.hangwu.desktop\hang-wu.db
```

(Dán đường dẫn trên vào thanh địa chỉ của Windows Explorer để mở.)

Chép file đó đi = sao lưu xong. Xoá file đó = phần mềm khởi động lại từ trạng thái trắng.

> ⚠️ **Cài đè phiên bản mới không làm mất dữ liệu.** File này nằm ngoài thư mục cài đặt.

### 9.2 Sao lưu bằng file

**Xuất ra file** → chọn nơi lưu → sinh ra một file `.json` chứa toàn bộ: sản phẩm, nhóm sản phẩm, CEO, và **mọi phiên báo cáo**.

**Phục hồi từ file** → chọn file `.json` → xác nhận → dữ liệu được nạp lại.

> 🔴 **Phục hồi sẽ XOÁ SẠCH toàn bộ dữ liệu hiện tại** và thay bằng nội dung file. **Không hoàn tác được.** Phần mềm luôn hỏi xác nhận và liệt kê rõ những gì bị ảnh hưởng.

### 9.3 Sao lưu lên mây (Cloudflare R2)

Dùng khi bạn muốn chuyển dữ liệu sang máy khác mà không phải chép file tay.

#### Lần đầu — kết nối

Bấm một trong hai nút, phần mềm sẽ hỏi 4 thông tin lấy từ trang quản trị Cloudflare (**R2 → Manage API tokens**):

- Account ID
- Tên bucket
- Access Key ID
- Secret Access Key

Phần mềm **thử kết nối trước**; sai thông tin thì **không lưu gì cả** và báo lỗi cụ thể.

Kết nối thành công, khoá được cất vào **kho mật khẩu của Windows** (Windows Credential Manager) — không nằm trong file nào, không nằm trong dữ liệu.

Sau đó thẻ hiển thị tên bucket và khoá đã che (`••••••A3F9`), kèm hai nút **Đổi key** / **Xoá key**.

#### Sao lưu lên mây

Mỗi lần bấm, một bản sao lưu mới được đẩy lên với tên gắn mốc thời gian. **Bucket luôn giữ 10 bản gần nhất** — bản cũ hơn bị xoá tự động.

Nếu tải lên thành công nhưng dọn bản cũ gặp trục trặc, bạn sẽ thấy thông báo **màu vàng**: *"Sao lưu xong, nhưng chưa dọn được bản cũ"* — nghĩa là bản sao lưu **đã an toàn**, chỉ việc dọn dẹp chưa xong.

#### Phục hồi từ mây

Bấm **Phục hồi từ mây** → danh sách các bản trên bucket (mới nhất lên đầu, kèm ngày giờ và dung lượng) → chọn một bản → phần mềm tải về và hiện cửa sổ xác nhận có ghi rõ **bản này được xuất lúc nào** → xác nhận.

> 🔴 Cũng **ghi đè toàn bộ dữ liệu hiện tại**, giống phục hồi từ file.

#### Cảnh báo bảo mật

> File sao lưu trên mây **không được mã hoá**. Ai lấy được khoá R2 là đọc được toàn bộ dữ liệu của bạn.
>
> Khuyến nghị: tạo token chỉ có quyền trên **đúng một bucket** dùng riêng cho việc này, và cân nhắc bật **Bucket Lock** trên Cloudflare để chống xoá nhầm.

---

## 10. Cập nhật phần mềm

Nút **Kiểm tra cập nhật** ở góc dưới cùng thanh bên trái, ngay trên số phiên bản.

Phần mềm **không tự động kiểm tra**. Chỉ khi bạn bấm nút, nó mới kết nối ra ngoài.

| Kết quả | Bạn thấy gì |
|---|---|
| Đã mới nhất | Thông báo *"Đã là phiên bản mới nhất · v0.1.5"* |
| Có bản mới | Dòng *"Có bản mới: v0.1.6"* + nút **Tải & cài đặt** |
| Đang tải | Thanh tiến trình kèm phần trăm |
| Xong | Phần mềm **tự khởi động lại** |

Dữ liệu của bạn được giữ nguyên sau khi cập nhật.

---

## 11. Quy tắc tính toán — giải thích bằng ví dụ

### 11.1 Số thùng được tính thế nào

**Quy tắc:** phần mềm **gom toàn bộ sản phẩm trong cùng một nhóm lại trước**, cộng tất cả các tháng, **rồi mới làm tròn xuống một lần**.

> **Ví dụ 1 — vì sao phải gom trước rồi mới làm tròn**
>
> Nhóm **"Dưỡng da"** gồm hai sản phẩm:
> - `SP-A` — quy cách 24 chai/thùng
> - `SP-B` — quy cách 12 hộp/thùng
>
> CEO W001 trong tháng mua:
> - `SP-A`: **20 chai** → 20 ÷ 24 = **0,833** thùng
> - `SP-B`: **8 hộp** → 8 ÷ 12 = **0,667** thùng
>
> **Cách phần mềm tính:**
> `0,833 + 0,667 = 1,5` → làm tròn xuống → **1 thùng** ✔
>
> **Nếu làm tròn từng sản phẩm rồi mới cộng:**
> `0 + 0 = 0 thùng` ✖ — CEO sẽ mất trắng phần thưởng
>
> Cách phần mềm làm có lợi cho CEO và phản ánh đúng thực tế hơn.

> **Ví dụ 2 — cộng cả nhiều tháng trước khi làm tròn**
>
> CEO W002 mua `SP-A` (quy cách 24):
> - Tháng 6: 20 chai → 0,833 thùng
> - Tháng 7: 16 chai → 0,667 thùng
>
> Phần mềm cộng cả hai tháng: `0,833 + 0,667 = 1,5` → **1 thùng**.
>
> Báo cáo **không tính riêng từng tháng rồi cộng**. Nếu file của bạn có nhiều tháng, phần thưởng được tính trên tổng cả kỳ.

**Sản phẩm không thuộc nhóm nào** thì mỗi mã sản phẩm được gom và làm tròn riêng.

**Sản phẩm chưa khai quy cách** thì bị bỏ qua hoàn toàn khi tính thùng.

---

### 11.2 Vì sao hai chỗ "Tổng thùng" lệch nhau

Đây là điều bạn sẽ gặp và cần biết trước.

Có **hai chỗ** hiển thị tổng thùng, và chúng dùng **hai cách tính khác nhau**:

| Vị trí | Cách tính | Ví dụ |
|---|---|---|
| Ô **Tổng thùng** trên **thanh thống kê** (và số thùng ở danh sách CEO) | **Không làm tròn** — cộng cả phần lẻ | `2.195,66` |
| Cột **Tổng thùng** trong **bảng Tổng hợp** và bảng **Thưởng CEO** | **Có làm tròn xuống** theo từng cột | `2.195` |

> **Số nào là số dùng để tính thưởng?**
> → **Số trong bảng Tổng hợp và bảng Thưởng CEO** (số đã làm tròn). Đây là số chính thức.
>
> Số trên thanh thống kê chỉ để bạn ước lượng nhanh quy mô, và **thường lớn hơn hoặc bằng** số chính thức.

Tương tự, cột **"Số lượng thùng"** trong chế độ *Chi tiết* cũng là số chưa làm tròn (hiện tới 5 chữ số thập phân), vì ở đó bạn cần thấy con số thật để đối chiếu.

---

### 11.3 Thưởng được tính thế nào

**Công thức:**

```
Thưởng bản thân    = Σ (số thùng của mỗi nhóm × Thưởng CEO của nhóm đó)
Thưởng cấp trên    = Σ (số thùng của mỗi nhóm × Thưởng cấp trên của nhóm đó)
                     → khoản này KHÔNG vào túi CEO đó, mà chuyển lên CEO cấp trên trực tiếp

Tổng thưởng của một CEO = Thưởng bản thân của chính mình
                        + Tổng các khoản "thưởng cấp trên" từ các cấp dưới TRỰC TIẾP
```

> **Ví dụ đầy đủ**
>
> **Danh mục đã khai:**
>
> | Nhóm | Thưởng CEO | Thưởng cấp trên |
> |---|---:|---:|
> | Dưỡng da | 50.000 ₫/thùng | 20.000 ₫/thùng |
> | Làm sạch | 30.000 ₫/thùng | 10.000 ₫/thùng |
>
> **Cây CEO:** W001 → W002 → W004
>
> **Số thùng trong kỳ:**
>
> | CEO | Dưỡng da | Làm sạch |
> |---|---:|---:|
> | W001 | 10 | 20 |
> | W002 | 6 | 0 |
> | W004 | 4 | 5 |
>
> ---
>
> **W004** (không có cấp dưới)
> - Thưởng bản thân: `4 × 50.000 + 5 × 30.000` = **350.000 ₫**
> - Thưởng cấp trên sinh ra: `4 × 20.000 + 5 × 10.000` = 130.000 ₫ → **chuyển lên W002**
> - **Tổng W004 = 350.000 ₫**
>
> **W002** (cấp dưới trực tiếp: W004)
> - Thưởng bản thân: `6 × 50.000` = **300.000 ₫**
> - Nhận từ W004: **130.000 ₫**
> - Thưởng cấp trên sinh ra: `6 × 20.000` = 120.000 ₫ → **chuyển lên W001**
> - **Tổng W002 = 300.000 + 130.000 = 430.000 ₫**
>
> **W001** (cấp dưới trực tiếp: W002)
> - Thưởng bản thân: `10 × 50.000 + 20 × 30.000` = **1.100.000 ₫**
> - Nhận từ W002: **120.000 ₫**
> - **Tổng W001 = 1.100.000 + 120.000 = 1.220.000 ₫**
>
> ---
>
> ⚠️ **W001 KHÔNG nhận gì từ W004.** Thưởng chỉ chuyển lên **đúng một cấp**. Khoản 130.000 ₫ của W004 dừng lại ở W002.

**Vài điểm cần nhớ:**

- Nhóm sản phẩm được **ưu tiên** hơn khai báo trên sản phẩm. Chỉ khi sản phẩm không thuộc nhóm nào thì mới lấy mức thưởng ghi trên chính sản phẩm.
- Ô thưởng **để trống** được hiểu là **0 đồng**, không phải lỗi.
- Thưởng luôn tính trên **số thùng đã làm tròn**.
- Thưởng được tính **trên đúng những gì bạn đang thấy**: nếu bạn lọc CEO, tổng thưởng cũng đổi theo.

---

### 11.4 Vì sao một CEO không xuất hiện trên báo cáo

Kiểm tra theo thứ tự:

1. **Mã CEO có bắt đầu bằng `W` hoặc `E` không?** Nếu không, CEO đó không thuộc tab nào cả.
2. **Mã CEO có khớp với tab đang xem không?** Mã `E015` chỉ hiện ở tab Elvawell.
3. **Toàn bộ sản phẩm của CEO đó có phải "sản phẩm chính" không?** Nếu tất cả sản phẩm họ mua đều chưa bật công tắc *"Sản phẩm chính"* của thương hiệu đang xem, CEO đó sẽ hiện với 0 sản phẩm.
4. **Bộ lọc có đang bật không?** Đặc biệt là *Trạng thái nhập hàng*.

> **Lưu ý ngược lại:** một CEO đã khai trong danh mục nhưng **chưa hề mua gì** vẫn xuất hiện trên báo cáo, với số liệu bằng 0 và chữ *"Không có dữ liệu"*. Đây là chủ ý — để bạn thấy được ai chưa nhập hàng.

---

## 12. Bảng màu sắc & ký hiệu

| Dấu hiệu | Ở đâu | Nghĩa là | Bạn cần làm gì |
|---|---|---|---|
| 🔴 **Mã CEO màu đỏ** | Bảng Tổng hợp, danh sách CEO | Mã có trong file Excel nhưng **chưa khai trong danh mục CEO** | Khai CEO này, nếu không sẽ **không tính được thưởng chuyển lên cấp trên** |
| 🔴 **Tên cột màu đỏ** | Tiêu đề bảng Tổng hợp | Sản phẩm có trong file nhưng **chưa khai trong danh mục Sản phẩm** | Khai sản phẩm + quy cách |
| 🟠 **Hàng nền cam** | Bảng Chi tiết | Sản phẩm **thiếu quy cách** → không quy ra thùng được | Bổ sung quy cách |
| 🟠 **Nhãn cam `[W]` / `[E]`** | Tiêu đề cột, cạnh tên CEO | Giao dịch **mua chéo thương hiệu** | Không cần làm gì — chỉ để nhận biết |
| 🔴 **Khối "Chưa phân nhóm"** (nền đỏ nhạt) | Bảng Chi tiết | Các sản phẩm chưa được xếp vào nhóm nào | Cân nhắc tạo nhóm, hoặc khai thưởng trực tiếp trên sản phẩm |
| 🟠 **Nhãn 🔒 Đã chốt** | Danh sách phiên, thanh trên | Phiên đã bị khoá | Muốn sửa thì phải hủy chốt |
| 🟡 **Nền vàng** | Cây CEO khi tìm kiếm | Đây là kết quả khớp trực tiếp | — |
| **Ô ghi `—`** | Khắp nơi | Không có dữ liệu / bằng 0 | — |
| 🔵 **Ô nền xanh nhạt** | Bảng Tổng hợp | Có dữ liệu, **bấm được** để xem chi tiết | — |
| **Badge xanh ngọc / hồng** | Cây CEO | Nhân viên chăm sóc: Hằng / Hiền | — |

---

## 13. Câu hỏi thường gặp

<details open>
<summary><b>Nhập file xong báo "Không tìm thấy dữ liệu hợp lệ"</b></summary>

File không đúng cấu trúc phần mềm mong đợi. Kiểm tra:
- Dữ liệu có nằm ở **sheet đầu tiên** không? (Phần mềm chỉ đọc sheet đầu.)
- Các cột có đúng vị trí không? Xem bảng ở [mục 6.1](#file-excel-phải-có-cấu-trúc-như-thế-nào).
- Cột A (mã CEO), cột L (thương hiệu), cột J (mã sản phẩm) có dữ liệu không?
- Cột W (số lượng) có phải là số không?
</details>

<details>
<summary><b>Một cột trong bảng Tổng hợp biến mất</b></summary>

Phần mềm tự ẩn cột mà không CEO nào đạt tối thiểu **1 thùng** (sau khi làm tròn). Nếu tổng số lượng của cả nhóm chia cho quy cách vẫn chưa tới 1, cột sẽ không hiện.

Muốn kiểm chứng, sang chế độ **Chi tiết** — ở đó mọi sản phẩm đều hiện, kể cả khi số thùng chưa tới 1.
</details>

<details>
<summary><b>Thưởng của một CEO bằng 0 dù họ có mua hàng</b></summary>

Ba nguyên nhân phổ biến:
1. **Chưa khai mức thưởng** cho nhóm sản phẩm đó (hoặc cho sản phẩm, nếu nó không thuộc nhóm nào).
2. **Số thùng làm tròn về 0** — mua chưa đủ một thùng.
3. **Sản phẩm thiếu quy cách** → không quy ra thùng được → không có cơ sở tính thưởng. Nhận biết: hàng nền cam ở bảng Chi tiết.
</details>

<details>
<summary><b>"Thưởng từ cấp dưới" bằng 0 dù cấp dưới có bán hàng</b></summary>

Kiểm tra:
1. **Đã khai "CEO cấp trên"** cho người cấp dưới chưa? Vào màn hình CEO xem cây có đúng không.
2. **Mã CEO cấp dưới có được khai trong danh mục không?** Nếu mã hiện màu đỏ trong bảng, nghĩa là chưa khai → phần mềm không biết ai là cấp trên → khoản thưởng bị mất.
3. **Đã khai ô "Thưởng cấp trên"** trên nhóm sản phẩm chưa?
4. **CEO cấp trên có đang bị bộ lọc loại ra không?** Nếu bạn đang lọc chỉ xem một vài CEO, khoản thưởng từ cấp dưới sẽ không hiện lên. Hãy **xoá bộ lọc** rồi xem lại.
5. **Cấp trên có cùng thương hiệu với tab đang xem không?** Nếu cấp dưới là `W002` mà cấp trên là `E001`, khoản thưởng đó sẽ không hiện ở tab Weilaiya.
</details>

<details>
<summary><b>Tổng thùng ở thanh trên khác với tổng trong bảng</b></summary>

Đây là hành vi đã biết, không phải lỗi dữ liệu. Số trên thanh thống kê **chưa làm tròn**, số trong bảng **đã làm tròn xuống**. Xem [mục 11.2](#112-vì-sao-hai-chỗ-tổng-thùng-lệch-nhau).

**Số dùng để tính thưởng là số trong bảng.**
</details>

<details>
<summary><b>Không sửa được dòng, nút Thêm/Sửa/Xoá biến mất</b></summary>

Phiên đã bị **chốt**. Bấm **🔓 Hủy chốt** ở góc trên bên phải, sửa xong rồi chốt lại.

Lưu ý: hủy chốt sẽ làm số liệu cập nhật lại theo danh mục hiện tại, có thể khác bản đã chốt.
</details>

<details>
<summary><b>Tạo nhóm nhưng không thấy sản phẩm trong danh sách chọn</b></summary>

Danh sách chỉ hiện sản phẩm đã bật công tắc **"Sản phẩm chính"** của thương hiệu bạn chọn cho nhóm.

Sang màn hình *Sản phẩm* → mở sản phẩm → bật công tắc tương ứng → lưu → quay lại.
</details>

<details>
<summary><b>Báo lỗi "Sản phẩm sau đã thuộc nhóm khác"</b></summary>

Một sản phẩm chỉ được thuộc **một nhóm duy nhất**. Thông báo lỗi có ghi rõ nhóm nào đang giữ nó. Vào nhóm đó gỡ ra trước, rồi mới thêm vào nhóm mới.
</details>

<details>
<summary><b>Sản phẩm hiện trong danh sách chọn nhưng lưu thì báo "không thuộc thương hiệu"</b></summary>

Hai tiêu chí khác nhau: danh sách lọc theo **công tắc sản phẩm chính**, còn khi lưu thì kiểm tra **thương hiệu gốc** của sản phẩm.

Nhóm Elvawell chỉ nhận được sản phẩm có *Thương hiệu = Elvawell*. Nếu muốn tính một sản phẩm Weilaiya trong báo cáo Elvawell, hãy để nó **ngoài nhóm** và khai thưởng trực tiếp trên sản phẩm.
</details>

<details>
<summary><b>Sửa dữ liệu xong có cần bấm Lưu không?</b></summary>

Không. Mọi thay đổi được ghi tự động sau khoảng nửa giây. Đóng cửa sổ ngay cũng không mất — phần mềm chờ ghi xong rồi mới thoát.
</details>

<details>
<summary><b>Chuyển sang máy mới thì làm sao?</b></summary>

Ba cách:
1. **Sao lưu lên mây** ở máy cũ → cài phần mềm ở máy mới → nhập cùng khoá R2 → **Phục hồi từ mây**.
2. **Xuất ra file** JSON ở máy cũ → chép sang → **Phục hồi từ file**.
3. Chép trực tiếp file `%APPDATA%\com.hangwu.desktop\hang-wu.db` sang cùng vị trí ở máy mới (phần mềm phải đang đóng).
</details>

<details>
<summary><b>Lỡ xoá nhầm thì khôi phục thế nào?</b></summary>

**Không có nút hoàn tác.** Cách duy nhất là phục hồi từ bản sao lưu gần nhất — và bạn sẽ mất mọi thay đổi kể từ bản đó.

Đây là lý do nên sao lưu định kỳ, tối thiểu sau mỗi lần làm báo cáo tháng.
</details>

<details>
<summary><b>Có cần internet để dùng không?</b></summary>

Không. Toàn bộ nghiệp vụ chạy trên máy. Chỉ hai việc cần mạng, và đều do bạn chủ động bấm: **kiểm tra cập nhật** và **sao lưu / phục hồi qua mây**.
</details>

---

## 14. Những điều phần mềm KHÔNG làm

Nêu rõ để bạn không mất công tìm:

| Không có | Ghi chú |
|---|---|
| **Hoàn tác (Undo)** | Mọi thao tác xoá đều vĩnh viễn. Chỉ khôi phục được từ bản sao lưu |
| **Nhiều người dùng / phân quyền** | Một máy, một người, không đăng nhập |
| **Thêm thương hiệu thứ ba** | Chỉ Weilaiya và Elvawell |
| **Thưởng nhiều cấp** | Chỉ chuyển lên đúng một cấp trên trực tiếp |
| **Tự động kiểm tra cập nhật** | Phải bấm nút |
| **Tự động sao lưu** | Phải bấm nút |
| **Xuất PDF, biểu đồ** | Chỉ xuất Excel |
| **Đổi vị trí cột file Excel nguồn** | Cấu trúc file cố định trong phần mềm |
| **Đọc nhiều sheet** | Chỉ sheet đầu tiên |
| **Mã hoá dữ liệu** | File dữ liệu và file sao lưu đều không mã hoá |
| **Ngôn ngữ khác tiếng Việt** | |
| **Chạy trên Mac / Linux** | Chỉ đóng gói cho Windows 10/11 |

---

## 15. Bảng kiểm hàng tháng

In ra hoặc lưu lại để làm theo:

**Trước khi nhập file**

- [ ] Đã bổ sung các sản phẩm mới phát sinh, có đủ **quy cách**
- [ ] Đã bật đúng công tắc **"Sản phẩm chính"** cho các sản phẩm mới
- [ ] Đã xếp sản phẩm mới vào **nhóm** phù hợp (hoặc chủ ý để ngoài nhóm)
- [ ] Đã khai các **CEO mới**, đúng mã và đúng **cấp trên**
- [ ] Đã cập nhật **mức thưởng** nếu tháng này có thay đổi chính sách

**Nhập và kiểm tra**

- [ ] Nhập file Excel, đặt **tên phiên** rõ ràng (ví dụ *"Tháng 7/2026"*)
- [ ] Đối chiếu **số dòng hợp lệ** với số dòng trong file — chênh nhiều thì kiểm tra lại cấu trúc file
- [ ] Sang chế độ **Tổng hợp**: rà **mã CEO màu đỏ** và **tên cột màu đỏ** → bổ sung danh mục nếu có
- [ ] Sang chế độ **Chi tiết**: rà các **hàng nền cam** (thiếu quy cách) → bổ sung
- [ ] Nếu vừa bổ sung danh mục, quay lại xem báo cáo đã cập nhật đúng chưa
- [ ] Sang tab **Dữ liệu** sửa các dòng sai sót (nếu có)
- [ ] Sang chế độ **Thưởng CEO**: đối chiếu tổng thưởng với dự kiến

**Kết thúc**

- [ ] **Xuất Excel** bảng Tổng hợp
- [ ] **Xuất Excel** bảng Thưởng CEO
- [ ] **🔒 Chốt phiên**
- [ ] **Sao lưu** (lên mây hoặc ra file)

---

*Tài liệu mô tả phiên bản 0.1.5. Nếu giao diện bạn thấy khác tài liệu này, hãy kiểm tra số phiên bản ở góc dưới thanh bên trái.*
