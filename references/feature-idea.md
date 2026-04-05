📄 TÀI LIỆU MÔ TẢ TÍNH NĂNG (MVP) - SCRIPT LINING WEB APP
1. TỔNG QUAN HỆ THỐNG

Mục tiêu: Web app cho phép đạo diễn/thư ký trường quay tải file kịch bản PDF, và các định dạng file kịch bản (ví dụ .fdx, .wdz,...) lên, vẽ các đường line-script line-straight và line-zigzag (để chia và định nghĩa shot) trực tiếp trên nền web, và tự động xuất ra bảng danh sách Shotlist theo nguyên tắc đường line-straight chứa nội dung của shot (sẽ được ghi hình) và line-zigzag chứa phần nội dung không được ghi hình.

>>> Tuy nhiên thông thường, trong 1 đường line luôn chứa cả line-straight và line-zigzag hoặc chỉ line-straight, chứ line-zigzac không nằm riêng lẻ 1 mình
>>> Nên, trong đường line chứa cả line-straight và line-zigzag, thì line-straight sẽ chứa nội dung của shot (sẽ được ghi hình) và line-zigzag chứa phần nội dung không được ghi hình >>> Đây là logic cốt lõi của line script.


Công nghệ lõi: Giao diện hiển thị PDF (PDF.js) nằm dưới, một lớp vẽ đồ họa trong suốt (Canvas/Fabric.js) nằm đè lên trên để hứng thao tác kéo thả.

2. TÍNH NĂNG A: LỚP PHỦ KẺ LINE THÔNG MINH (Kế thừa từ Scriptation)

Vấn đề giải quyết: Kẻ line trên giấy bằng tay rất cực, xóa đi vẽ lại làm bẩn kịch bản. Các app PDF thông thường vẽ nét bị run, không thẳng và không có logic tạo đường line-zigzag nằm bên trên cùng của đường line với line-straight.

Thao tác người dùng (UI/UX):

Người dùng, chọn màu sắc đường line, sau đó bấm nút "Bật chế độ Kẻ Line" (Draw Mode) trên thanh công cụ.

Người dùng đưa chuột (hoặc ngón tay, apple pen trên iPad) vào lề trái/phải hoặc giữa (bất kỳ đâu theo chiều ngang) của trang kịch bản, nhấn giữ và kéo xuống dưới.

Hệ thống tự động nắn thao tác này thành một đường thẳng đứng hoàn hảo (Snap to straight vertical line), có móc vuông ở 2 đầu để xác định điểm bắt đầu và kết thúc của cảnh quay.

Ngay khi người dùng thả tay ra, ở đường line chỉ do Draw Mode tạo ra, một Box label nhỏ nằm trên móc vuông của điểm bắt đầu của đường line sẽ chứa 2 thông tin sau: Tên Shot (VD: 1/1, 1A/1, 1B/2, 12C/3.1, 12C/3.2... >>> Tên shot được định nghĩa là: Scene#/Shot#, trong đó scene có thể chứa Text hoặc số, Shot có thể chứa số hoặc băm nhỏ số ra thành 1.1, 1.2,...), và Màu sắc đường line >>> nằm kế bên box label sẽ là 1 ô chứa text (không có bolder) gồm 2 thông tin: SHOT SIZE và MOVEMENT
    + Scene # được định nghĩa theo text trong cấu trúc đặt tên scene của kịch bản: ví dụ: Scene#. INT/EXT (NỘI/NGOẠI). LOCATION - DAY/NIGHT/BLUE HOUR,... (NGÀY/ĐÊM) >>> đặt tên cho 1 scene luôn luôn theo quy tắc đó, kể cả dấu . và - nên phải auto nhận diện được các thành phần trong tên scene này để sử dụng cho box label >>> trong trường hợp này ví dụ tên shot 1/1 thì scene # là 1, shot # là 1. >>> shot sẽ được tự động đánh số theo thứ tự tăng dần bắt đầu từ 1 >>> người dùng tạo ra bao nhiều line thì sẽ là bất nhiêu shot >>> nhưng shot # sẽ được đánh số theo thứ tự tăng dần bắt đầu từ 1 >>> trong trường hợp này ví dụ người dùng tạo ra 3 line thì sẽ là shot 1/1, 1/2, 1/3, theo nguyên tắc từ trái sang phải, line ở bên phải sẽ là +1 so với line bên trái nó >>> nhưng hoàn toàn không cố định mà chỉ mang tính chất gợi ý, người dùng vẫn có thể click vào box label và đổi được số thứ shot# theo ý muốn mà không phá hỏng logic của hệ thống
    + ví dụ: 12A. NGOẠI. QUỐC LỘ 1D - SÁNG SỚM >>> thì khi dùng draw mode để kẻ line-straight đầu tiên thì box label sẽ chỉ nhận diện được thông tin 12A/1 >>> 1 là vì shot đầu tiên của scene 12A >>> kẻ đường thứ 2 thì sẽ tự nhảy thành 12A/2 và cứ thế >>> Sau đó người dùng sẽ click vào box label để chọn Shot size
    + Shot size được định nghĩa là 1 list các shot đã có sẵn như sau: EWS, WS, FS, MFS, MS, MCU, CU, ECU, Random, [Custom] >>> khi click vào box label thì danh sách này được xổ ra và người dùng click vào >>> tương tự danh sách shot type: Observe, Single, Two, Three, Four, Group, OTS, POV, Insert, B-roll, [Custom]
    + Ô chứa [Custom] sẽ được lưu thành 1 field mới nằm bên trong nhưng được đánh dầu bằng màu sắc khác với màu của các field mặc định. >>> ví dụ: shot size [Custom] sẽ được đánh dấu bằng màu vàng, shot type [Custom] sẽ được đánh dấu bằng màu xanh.

Nếu trong 1 đường line bao hàm của nội dung không được ghi hình, thì có một công cụ nằm cùng cấp với Draw Mode là Split Mode, người dùng có thể dùng công cụ này để chia 1 đường line thành 2 đường line (1 line-straight và 1 line-zigzag) bằng thao tác click vào đường line đó > sẽ tạo một móc vuông mới > đường line cũ sẽ bị cắt thành 2 đoạn > đoạn trên sẽ là line-straight và đoạn dưới sẽ tự động biến thành line-zigzag >>> Nếu click thêm 1 lần nữa ở bên dưới móc nối vừa rồi > sẽ chia thành 3 đoạn > đoạn trên vẫn sẽ là line-straight, đoạn giữa sẽ là line-zigzag và đoạn dưới sẽ là line-straight. >>> Cứ thế tiếp tục chia cho đến khi hết nội dung không được ghi hình.

Nếu người dùng muốn xóa đi một móc vuông > thì tự động nhận diện việc chia đoạn để hiển thị lại đường line-straight hoặc line-zigzag cho phù hợp, dựa trên móc-vuông-kết-thúc. Ví dụ: 4 đoạn thì sẽ là 1straight-2zigzag-3straight-4zigzag (móc vuông cuối là của 4zigzag) >>> nếu xóa đi móc vuông ở giữa (ví dụ 4) thì sẽ thành 1straight-2zigzag-3straight >>> nếu xóa đi móc vuông ở giữa là 3 nữa thì sẽ thành 1straight-2zigzag-4zigzag (nhưng 2 đường zigzac giống nhau hoặc 2 đường line giống nhau liền kề thì tự động merge thành 1 đường và bỏ đi móc vuông ở giữa của 2 đoạn giống nhau) >>> kết quả thay vì 1straight-2zigzag-4zigzag thì sẽ thành 1straight-2+4zigzag, tương tự 1straight-3straight-4zigzag sẽ thành 1+3straight-4zigzag.

Để trực quan hơn về visual và dễ dàng thao tác trên ipad bằng ngón tay hoặc apple pen thì phải có logic active dành cho đường line-straight và line-zigzag. Logic (giống với script evolution) sẽ chỉ cần thao tác với móc vuông, không cần thao tác với đường line-straight và line-zigzag. Ví dụ:
    + 1straight-2zigzag-3straight, lúc này đang tồn tại 4 móc vuông > 1 và 2 chứa straight > 2 và 3 chứa zigzag > 3 và 4 chứa straight
    + Nếu click vào 1 thì có thể kéo lên xuống để kéo dài hoặc thu ngắn đường line theo chiều dọc, nhưng chỉ ảnh hướng đến độ dài của 1 và 2 (đường line-straight) >>> tương tự nếu click vào 2 thì có thể kéo lên xuống để kéo dài hoặc thu ngắn đường line theo chiều dọc, nhưng chỉ ảnh hướng đến độ dài của 2 và 3 (đường line-zigzag) >>> tương tự nếu click vào 3 thì có thể kéo lên xuống để kéo dài hoặc thu ngắn đường line theo chiều dọc, nhưng chỉ ảnh hướng đến độ dài của 3 và 4 (đường line-straight)
    + Nếu click vào 2 và xóa đi móc vuông 2 thì line straight nằm trong 1 và 2 sẽ bị xóa > còn 2 và 3 (zigzig), 3 và 3 (straight) >>> tương tự: nếu xóa đi móc vuông 3 thì zigzac nằm trong 2 và 3 se bị xóa đi > còn 1 và 2 (straight), 3 và 4 straight > cả 2 cùng straight nên merge lại thành duy nhất 1 đường chứa 2 móc vuông 1 và 4 trong đó chỉ có straight
    <<<Tức là luôn luôn dùng móc vuông ở dưới của đoạn line muốn tương tác để định nghĩa cho đoạn line đó, nếu là 1 và 2 thì chỉ cần click vào 2 sẽ tự động chọn line của 1 và 2, tương tự với những trường hợp khác>>>


Công cụ Break Scene:
    - Chỉ được active khi người dùng chọn chế độ Break Scene, lúc này các công cụ khác đều bị off (Blur và lock click) đi không thể click, trừ khi người dùng chọn sang chế độ Draw, thì Draw Mode, Split Mode, màu,... mới hiện lên >>> Mode này nằm kế trong tập hợp mode cha là: Scene và Draw (gồm Draw Mode, Split Mode, màu,...)
    - Được định nghĩa là 1 đường thẳng ngang kéo dài hết chiều rộng của trang giấy
    - Tác dụng: hỗ trợ người dùng nhận diện scene trong kịch bản dễ hơn, và hỗ trợ máy nhận diện được là scene này bắt đầu ở đâu và kết thúc ở đâu
    - Logic sẽ là, người dùng click vào 1 điểm bất kỳ trên trang giấy thì sẽ tạo ra 1 đường break scene, đường này sẽ kéo dài hết chiều rộng của trang giấy, thông thường sẽ nằm trên text có format: Scene#. INT/EXT (NỘI/NGOẠI). LOCATION - DAY/NIGHT/BLUE HOUR,... (NGÀY/ĐÊM) >>> nằm ở trên tức là xác định scene bắt đầu, còn khi người dùng tạo ra thêm 1 đường break scene nữa thì đường break scene trước đó sẽ được coi là kết thúc của scene trước đó
    - Đường break này có 1 box label chỉ có thông tin của Scene# (không chưa shot), và chỉ hiện Số, không có text (ví dụ như Scene 1 mà phải là 1 thôi)
    - Đường break này khi chọn, có thể kéo lên xuống theo chiều dọc của trang giấy
    - Đường break này khi chọn, có thể xóa đi để xóa đường break scene tương ứng (bằng biểu tượng thùng rác trên thành panel)
    - Khi click vào đường break scene thì sẽ xuất hiện 1 vòng tròn có nét liền bao quanh đường break scene đó, đường break scene tương ứng sẽ được tô đậm hoặc có màu sáng hơn (break scene chỉ có 1 màu mặc định)
    - Box label của break scene có thể được thay đổi thủ công, và khi thay đổi, nó ảnh hưởng cả scene# dù auto detect có nhận diện scene trên kịch bản có là gì đi nữa
        >>> Ví dụ: Auto detect nhận diện là scene 1 nhưng người dùng thay đổi box label thành 2 thì scene# tự động update là 2, nhưng sẽ thông báo lỗi là bị duplicate scene# (vì đã có scene 2 rồi và không cho phép thay đổi)
    - Box label này lấy nội dung từ việc detect scene, và khi detect scene thì sẽ tự động tạo ra 1 đường break scene tương ứng, nằm bên trên Scene#. INT/EXT (NỘI/NGOẠI). LOCATION - DAY/NIGHT/BLUE HOUR,... (NGÀY/ĐÊM) >>> một khoảng cách đủ rộng để không bị đè lên text Scene#. INT/EXT (NỘI/NGOẠI). LOCATION - DAY/NIGHT/BLUE HOUR,... (NGÀY/ĐÊM)
    - Bản chất box label chính là lấy nội dung của Scene# nhưng được hiển thị trên đường break scene
    - Đường break scene này có thể click dup (ipad/ipad/apple pen) vào để đổi tên, và có thể nhận được TEXT ví dụ: 1A, 1B,...
    - Nếu đổi tên Scene# trong tab shotlist - đang ứng với scene break và line script tương ứng thì không thể thay đổi được, block việc đổi Scene# >>> hiện thông báo cảnh báo người dùng là không thể thay đổi, nhưng đổi shot# trong shotlist thì lại được phép >>> nó sẽ ảnh hưởng đến box label trong line script tương ứng trong line script tab

    - Trên đường line script, ngay bên phải ô label box sẽ có 1 box text (không có bolder) hiển thị 2 thông tin sau: Shot size và Movement
            Ví dụ:  WS
                    Pan Right
        màu chữ theo màu của đường line-script tương ứng, và giữa trình bày Shot size và Movement phải theo nguyên tắc xuống dòng (WS > xuống dòng > Pan Right)
    - Shot size và Movement có thể được thay đổi thủ công, và khi thay đổi, nó ảnh hưởng cả shotlist tương ứng trong shotlist tab
    - Nếu lúc mới tạo line script, thì chỉ hiện 2 dấu ??, khi nào sửa thông tin bên shotlist panel (trong line script tab, hoặc shotlist tab) thì nó sẽ tự động update Shot size và Movement tương ứng trên line script
    - Phải tối ưu cho người dùng ipad nhất là các thao tác zoom, scroll trên trang giấy, ví dụ: 2 ngón tay zoom, 1 ngón tay kéo trang giấy, hoặc dùng apple pen để zoom, kéo trang giấy, hoặc dùng apple pen để chọn line script, hoặc dùng apple pen để tạo line script,...

    - Phải tối ưu độ trễ của các đường line này khi đang thao tác, ví dụ chọn body để di chuyển cả đường line thì các đường line phải di chuyển theo ngay lập tức, không có độ trễ
    - Tương tự khi thao tác với các đường móc vuông và móc vuông 45 độ cũng phải bám sát theo di chuyển kéo, nhấn giữ chuột hoặc apple pen ( thao tác như sau: click > active > nhấn giữ kéo chuột/apple pen đến vị trí mong muốn > thả chuột/apple pen)

Công cụ Ghi chú:
    - Thao tác tự do ở trên trang giấy, không bị giới hạn bởi đường line-script hay break scene
    - Nhiều dạng visual để chọn lựa:
        + Note chữ (không có box) có thể chọn màu chữ, chọn font chữ, chọn kích thước chữ, chọn độ đậm nhạt của chữ, nghiêng, in đậm,...
        + Note chữ bên trong box, box có thể tùy chỉnh kích thướng, crop, xoay, di chuyển, xóa, chọn màu nềnm chọn màu chữ, chọn font chữ, chọn kích thước chữ, chọn độ đậm nhạt của chữ, nghiêng, in đậm,...
        + Import hình ảnh, có thể chọn ảnh từ máy tính, hoặc chụp ảnh, có thể crop, xoay, di chuyển, xóa, chọn kích thước ảnh,...
        + Note mũi tên, có thể viết chữ lên trên, có thể chọn màu mũi tên, chọn độ đậm nhạt của mũi tên, nghiêng, in đậm,...
        + Note hình chữ nhật, có thể viết chữ lên trên, có thể tùy chỉnh kích thướng, crop, xoay, di chuyển, xóa, chọn màu nềnm chọn màu chữ, chọn font chữ, chọn kích thước chữ, chọn độ đậm nhạt của chữ, nghiêng, in đậm,...
        + Note hình tròn, có thể viết chữ lên trên, có thể tùy chỉnh kích thướng, crop, xoay, di chuyển, xóa, chọn màu nềnm chọn màu chữ, chọn font chữ, chọn kích thước chữ, chọn độ đậm nhạt của chữ, nghiêng, in đậm,...
        + Note hình vuông, có thể viết chữ lên trên, có thể tùy chỉnh kích thướng, crop, xoay, di chuyển, xóa, chọn màu nềnm chọn màu chữ, chọn font chữ, chọn kích thước chữ, chọn độ đậm nhạt của chữ, nghiêng, in đậm,...
        + Note hình tam giác, có thể viết chữ lên trên, có thể tùy chỉnh kích thướng, crop, xoay, di chuyển, xóa, chọn màu nềnm chọn màu chữ, chọn font chữ, chọn kích thước chữ, chọn độ đậm nhạt của chữ, nghiêng, in đậm,...
        + Highlighter, có thể chọn màu highlighter

    
Về visual của móc vuông:
    + Móc vuông là 1 đường line ngắn cắt ngang vuông góc với đường line-script dọc (kể cả straight và zigzag)
    + Móc vuông có thể được kéo lên xuống để kéo dài hoặc thu ngắn đường line theo chiều dọc
    + Móc vuông có thể được xóa đi để xóa đường line-script tương ứng
    + Móc được active khi chọn như sau: click hoặc bấm vào móc vuông thì sẽ xuất hiện 1 vòng tròn có nét đứt bao quanh móc vuông đó, ví dụ 1 và 2, click 2 thì 1 và 2 sẽ xuất hiện vòng tròn nét đứt bao quanh, đường line-script tương ứng với móc vuông đó sẽ được tô đậm hoặc có màu sáng hơn (tùy thuộc vào màu gốc của đường line-script) để người dùng dễ dàng nhận biết
    + Khi móc vuông được active thì thanh panel bên cạnh cũng sẽ xuất hiện nút thùng rác tức là xóa móc vuông đó (áp dụng cho ipad iphone, còn desktop vẫn có thể dùng được nút thùng rác này và cộng với nút delete trên bàn phím)
    
    + Một tính năng đặc biệt và quan trọng nữa: khi cần bao hàm một cách cụ thể những đoạn văn bản, các móc vuông có thể mở rộng ra bằng 1 đường line ngang nét đứt đi ra từ đầu móc vuông đó (theo chiều ngang của kịch bản) hoạt động như sau > click vào móc vuông, vòng tròn nét đứt xuất hiện (active móc vuông đó) > rê chuột theo chiều ngang đến vị trí muốn cần bao hàm chi tiết > nhấn giữ chuột (hoặc nhấn giữ ngón tay, apple pen) > 1 đường line xuất phát từ móc vuông gốc đến vị trí chuột sẽ được tạo ra và chuột/apple pen di chuyển đi đâu thì đường line nét đứt sẽ đi theo đến đó (kèm theo 1 móc vuông 45 độ cuối đường line ngang nét đứt) > khi thả chuột/apple pen ra thì đường line nét đứt sẽ được cố định tại vị trí đó, và đường line nét đứt này có thể kéo dài hoặc thu ngắn (theo chiều ngang của kịch bản), có thể xóa đi, color tương ứng với móc vuông đó (móc vuông 45 độ này vẫn có vòng tròn nét đứt bao quanh) > những đường line này chỉ sinh ra từ móc vuông gốc, không thể sinh ra từ đường line-script > những đường line này có thể di chuyển theo cả 2 hướng (nếu line script đang ở lề trái thì nó di chuyển từ trái sang phải, nếu line đang bên phải thì nó có thể di chuyển từ phải sang trái, nếu line script ở giữa thì nó có thể di chuyển theo cả 2 hướng) >>> móc vuông 45 độ này chính là vị trí để tương tác, nó giống như móc vuông nằm trong line script gốc > nhưng nếu đã active móc vuông 45 độ thì móc vuông gốc sẽ off đi active bằng vòng tròn nét đứt mà chuyển nhượng sang cho móc vuông 45 độ này >>> đường line nét đứt này vẫn có thể xóa được bằng cách click vào móc vuông 45 độ và xóa (tương tự logic hoạt động của line script chính) >>> đường line nét đứt này chỉ có thể kéo dài hoặc thu ngắn theo chiều ngang của kịch bản, nhưng nếu chuột/apple pen đang kéo thả nó theo chiều dọc thì nó vẫn di chuyển theo chiều dọc (móc vuông bên line script gốc cũng di chuyên theo chiều dọc theo)

Về visual của toàn bộ body đường line:
    + Đường line-script (cả straight và zigzag) có thể di chuyển theo cả 2 hướng (nếu line script đang ở lề trái thì nó di chuyển từ trái sang phải, nếu line đang bên phải thì nó có thể di chuyển từ phải sang trái, nếu line script ở giữa thì nó có thể di chuyển theo cả 2 hướng)
    + Logic active toàn bộ đường line sẽ là click vào đường line (không phải móc vuông) > active = toàn bộ đường line sáng lên (không cần xuất hiện vòng tròn nét đứt của móc vuông)
    + Khi đường line được active thì thanh panel bên cạnh cũng sẽ xuất hiện nút thùng rác tức là xóa đường line đó (áp dụng cho ipad iphone, còn desktop vẫn có thể dùng được nút thùng rác này và cộng với nút delete trên bàn phím)
    + Khi đường line được active thì thanh panel bên cạnh cũng sẽ xuất hiện thêm các nút để thay đổi shotName, shotSize, color tương ứng với đường line đó (áp dụng cho ipad iphone, còn desktop vẫn có thể dùng được các nút này và cộng với việc chỉnh sửa trực tiếp trên box label bằng nút đúp vào box label)
    + Đường line-script khi được active có thể dùng chuột kéo thả theo chiều ngang một cách tự do nhưng không thể kéo theo chiều dọc (chiều dọc chỉ có thể thay đổi bằng móc vuông) và không được chiếm chỗ của đường line-script khác (cả straight và zigzag) >>> nếu đường line-script A đang ở lề trái, đường line-script B đang ở giữa, đường line-script C đang ở lề phải, khi đường line-script A được active và kéo sang phải thì nó không được chiếm chỗ của đường line-script B và C, tương tự với đường line-script B và C >>> nếu kéo đến vị trí đường line B và khi thả ra nó tự động di chuyển sang phải để không làm chiếm chỗ của đường line B (tức là nó sẽ nằm bên phải đường line B) > nguyên tắc là không làm thay đổi vị trí của đường line đang không active
    + Nếu di chuyển bằng việc kéo thả 1 đường line chứa nhiều móc vuông thì tất cả các móc vuông đó cũng sẽ di chuyển theo (thời gian thực) (chỉ bao gồm móc vuông gốc)
        + Đối với móc vuông gốc: khi di chuyển đường line thì móc vuông gốc sẽ di chuyển theo (thời gian thực)
        + Đối với móc vuông 45 độ: khi di chuyển đường line thì móc vuông 45 độ không bị di chuyển theo mà luôn cố định tại vị trí đã được ấn định trước đó > móc vuông 45 độ chỉ có thể thay đổi khi active và kéo thả riêng một mình nó > thứ có thể thay đổi (theo thời gian thực) là đường line ngang nét đứt (thuộc móc vuông 45 độ) thì nó canh theo vị trí móc vuông 45 độ và móc vuông gốc để thay đổi độ dài tương ứng với việc line script đang bị kéo thả để di chuyển theo chiều ngang của trang giấy


Logic Dữ liệu (Backend logic):

Mỗi đường line không phải là một nét vẽ vô tri, mà được lưu thành một Object JSON bao gồm: { id, pageNumber, startY, endY, shotName, shotSize, color }.

TỔNG KẾT LINE SCRIPT:
- Giao diện line script giống như 1 app vẽ line trên file pdf, có thể zoom in, zoom out, di chuyển trang giấy, kẻ line, xóa line, thay đổi màu line, thay đổi shot name, shot size, color,... nhưng chuyên dành cho line script
- Giao diện phải trực quan, dễ sử dụng, dễ hiểu, dễ thao tác
- 

3. TÍNH NĂNG B: TỰ ĐỘNG TỔNG HỢP SHOTLIST (Kế thừa từ Script Evolution)

Vấn đề giải quyết: Sau khi kẻ line xong toàn bộ kịch bản 100 trang, người dùng phải mở Excel lên và gõ lại từng shot một để đưa cho quay phim. Việc này mất hàng giờ đồng hồ.

Shotlist sẽ có nội dung cột và hàng, và visual như sau:

# SHOTLIST TABLE — CẤU TRÚC & MÔ TẢ VISUAL

---

## 1. Mô tả Visual Toàn Bảng

Đây là một **Shotlist dạng Google Sheets**

### Bố cục tổng thể (từ trên xuống):

```
┌─────────────────────────────────────────────────────────────────┐
│  ROW 1 (metadata): [trống] | [trống] | ... | [cột G: "4"]      │ ← hàng thông tin phụ
├─────────────────────────────────────────────────────────────────┤
│  ROW 2 (tiêu đề phim): [trống]           |Tên phim (colspan=17) │ ← tên phim, merge toàn bộ row
├────┬────┬────────┬──────────┬────────┬─────────┬─────────┬──────┤
│    │  # │SCENE # │ LOCATION │ SHOT # │ INT/EXT │   D/N   │ ... │
│    │    │        │          │        │         │         │     │ ← ROW 3+4: header merge 2 hàng
├────┼────┼────────┼──────────┼────────┼─────────┼─────────┼──────┤
│    │  1 │   1    │QUỐC LỘ  │   1    │    E    │    D    │ ... │ ← data rows
│    │  2 │   2    │BỆNH VIỆN│   1    │    E    │    D    │ ... │
│   ...                                                           │
└─────────────────────────────────────────────────────────────────┘
```

### Đặc điểm visual:
- **Frozen rows**: 4 hàng đầu cố định (không scroll) — gồm hàng metadata, tên phim, và header 2 tầng
- **Frozen column**: Cột đầu tiên (số thứ tự hàng) cố định khi scroll ngang
- **Header 2 tầng**: Row 3 & 4 merge dọc (rowspan=2) để tạo header cao, nổi bật
- **Tiêu đề phim**: Merge ngang 17 cột, căn giữa, font lớn/đậm
- **Màu sắc**: Header tối màu (nền đậm, chữ trắng/sáng); data rows xen kẽ màu nhạt
- **Cell DESCRIPTION & DIALOGUE**: Cột rộng hơn các cột khác, chiều cao hàng lớn (~115px)
- **Cột đầu (bên trái tiêu đề)**: Cột phụ trống, dùng để phân nhóm hoặc màu scene

---

## 2. Cấu trúc Bảng (ký tự code)

### Header (Row 3–4, tất cả dùng rowspan=2):

```
+---+--------+----------+--------+---------+-----+-------------+-----------+----------+-------------+-----------+-----------+------+-------+----------+------+------+
| # | SCENE# | LOCATION | SHOT # | INT/EXT | D/N | STORYBOARD  | DESCRIPTION | DIALOGUE  | SUBJECTS | SCRIPT TIME | SHOT SIZE | SHOT TYPE | SIDE | ANGLE | MOVEMENT | LENS | NOTE |
+---+--------+----------+--------+---------+-----+-------------+-----------+----------+-------------+-----------+-----------+------+-------+----------+------+------+
|   |        |          |        |         |     |             |           |          |             |           |           |      |       |          |      |      |
+---+--------+----------+--------+---------+-----+-------------+-----------+----------+-------------+-----------+-----------+------+-------+----------+------+------+
```

### Data Row (mỗi shot):

```
+---+--------+----------+--------+---------+-----+-------------+-----------+----------+-------------+-----------+-----------+------+-------+----------+------+------+
| 1 |   1    | [loc]    |   1    |  E/I    | D/N | [mô tả]     | [lời TH]  | [nhân]   |  00:00      |  WS/MS/.. | [type]    | L/R  | [ang] | [move]   | [mm] | [nt] |
+---+--------+----------+--------+---------+-----+-------------+-----------+----------+-------------+-----------+-----------+------+-------+----------+------+------+
```

---

## 3. Định nghĩa các Field (Cột)

| Field       | Viết tắt | Kiểu dữ liệu | Mô tả                                                      |
|-------------|----------|--------------|------------------------------------------------------------|
| #           | —        | Integer      | Số thứ tự shot trong toàn bộ shotlist                      |
| SCENE #     | SC#      | Integer      | Số cảnh (scene) trong kịch bản                             |
| LOCATION    | LOC      | Text         | Tên địa điểm quay (có thể viết tắt hoặc tên set)          |
| SHOT #      | SH#      | Integer      | Số thứ tự shot trong cùng một scene                        |
| INT/EXT     | I/E      | Enum         | Nội cảnh (INT) hoặc ngoại cảnh (EXT)                       |
| D/N         | —        | Enum         | Ngày (Day) hoặc Đêm (Night)                                |
| Storyboard  | SB       | Image        | Hình ảnh storyboard của shot                               |
| DESCRIPTION | DESC     | Text (dài)   | Mô tả hành động, nội dung diễn ra trong shot              |
| AUTO DETECT | AUTO DETECT | Text (dài)   | Là nội dung được detect từ line script                 |
| DIALOGUE    | DIA      | Text (dài)   | Thoại xuất hiện trong shot (nếu có)                        |
| SUBJECTS    | SUBJ     | Text         | Nhân vật/đối tượng chính trong shot                        |
| SCRIPT TIME | TIME     | MM:SS        | Thời lượng ước tính của shot theo kịch bản                 |
| SHOT SIZE   | SIZE     | Enum         | Cỡ cảnh: WS / MS / MCU / CU / ECU / ...                   |
| SHOT TYPE   | TYPE     | Enum         | Loại shot: Single / Two-shot / OTS / Observe / ...         |
| SIDE        | —        | Enum         | Hướng nhân vật: Left (L) / Right (R) / —                  |
| ANGLE       | ANG      | Enum         | Góc máy: Eye Level / Low Angle / High Angle / Bird Eye / … |
| MOVEMENT    | MOV      | Enum         | Chuyển động máy: Static / Pan / Tilt / Dolly / Handheld /… |
| LENS        | —        | Number/Text  | Tiêu cự ống kính (vd: 35mm, 50mm, 85mm)                   |
| NOTE        | —        | Text         | Ghi chú bổ sung cho shot                                   |

---

## 4. Enum Values gợi ý theo field

```
INT/EXT   : INT | EXT
D/N       : D (Day) | N (Night) | D/N (Golden Hour)
SHOT SIZE : ECU | CU | MCU | MS | MWS | WS | EWS
SHOT TYPE : Single | Two-shot | OTS | Observe | POV | Insert | ...
SIDE      : L | R | — (không áp dụng)
ANGLE     : Eye Level | Low Angle | High Angle | Bird Eye | Dutch
MOVEMENT  : Static | Pan | Tilt | Dolly In | Dolly Out | Handheld | Steadicam | Crane | Zoom

```
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"><link type="text/css" rel="stylesheet" href="resources/sheet.css" >
<style type="text/css">.ritz .waffle a { color: inherit; }.ritz .waffle .s10{border-bottom:1px SOLID #000000;border-right:1px SOLID #000000;background-color:#b7b7b7;text-align:center;font-weight:bold;color:#ff0000;font-family:Arial;font-size:30pt;vertical-align:middle;white-space:normal;overflow:hidden;word-wrap:break-word;direction:ltr;padding:0px 3px 0px 3px;}.ritz .waffle .s8{border-bottom:1px SOLID #000000;border-right:1px SOLID #000000;background-color:#ffffff;text-align:left;color:#000000;font-family:Arial;font-size:15pt;vertical-align:middle;white-space:normal;overflow:hidden;word-wrap:break-word;direction:ltr;padding:0px 3px 0px 3px;}.ritz .waffle .s3{border-bottom:1px SOLID #000000;border-right:1px SOLID #000000;background-color:#ffffff;text-align:center;font-weight:bold;color:#000000;font-family:Arial;font-size:15pt;vertical-align:middle;white-space:normal;overflow:hidden;word-wrap:break-word;direction:ltr;padding:0px 3px 0px 3px;}.ritz .waffle .s2{border-bottom:1px SOLID #000000;border-right:1px SOLID #000000;background-color:#ebeff2;text-align:center;font-weight:bold;color:#000000;font-family:Arial;font-size:15pt;vertical-align:middle;white-space:normal;overflow:hidden;word-wrap:break-word;direction:ltr;padding:0px 3px 0px 3px;}.ritz .waffle .s6{border-bottom:1px SOLID #000000;border-right:1px SOLID #000000;background-color:#d9d9d9;text-align:center;font-weight:bold;color:#000000;font-family:Arial;font-size:30pt;vertical-align:middle;white-space:normal;overflow:hidden;word-wrap:break-word;direction:ltr;padding:0px 3px 0px 3px;}.ritz .waffle .s0{border-bottom:1px SOLID #000000;border-right:1px SOLID #000000;background-color:#b7b7b7;text-align:center;font-weight:bold;color:#000000;font-family:"Times New Roman";font-size:15pt;vertical-align:middle;white-space:normal;overflow:hidden;word-wrap:break-word;direction:ltr;padding:0;}.ritz .waffle .s1{border-bottom:1px SOLID #000000;border-right:1px SOLID #000000;background-color:#b7b7b7;text-align:center;font-weight:bold;color:#000000;font-family:Arial;font-size:15pt;vertical-align:middle;white-space:normal;overflow:hidden;word-wrap:break-word;direction:ltr;padding:0px 3px 0px 3px;}.ritz .waffle .s7{border-bottom:1px SOLID #000000;border-right:1px SOLID #000000;background-color:#b7b7b7;text-align:center;color:#000000;font-family:Arial;font-size:15pt;vertical-align:middle;white-space:normal;overflow:hidden;word-wrap:break-word;direction:ltr;padding:0px 3px 0px 3px;}.ritz .waffle .s5{border-bottom:1px SOLID #000000;border-right:1px SOLID #000000;background-color:#434343;text-align:center;font-weight:bold;color:#000000;font-family:Arial;font-size:15pt;vertical-align:middle;white-space:normal;overflow:hidden;word-wrap:break-word;direction:ltr;padding:0px 3px 0px 3px;}.ritz .waffle .s9{border-bottom:1px SOLID #000000;border-right:1px SOLID #000000;background-color:#ffffff;text-align:center;color:#000000;font-family:Arial;font-size:15pt;vertical-align:middle;white-space:normal;overflow:hidden;word-wrap:break-word;direction:ltr;padding:0px 3px 0px 3px;}.ritz .waffle .s4{border-bottom:1px SOLID #000000;border-right:1px SOLID #000000;background-color:#ebeff2;text-align:left;font-weight:bold;color:#000000;font-family:Arial;font-size:15pt;vertical-align:middle;white-space:normal;overflow:hidden;word-wrap:break-word;direction:ltr;padding:0px 3px 0px 3px;}</style><div class="ritz grid-container" dir="ltr"><table class="waffle no-grid" cellspacing="0" cellpadding="0"><thead><tr><th class="row-header freezebar-vertical-handle"></th><th id="1983069554C0" style="width:2px;" class="column-headers-background">A</th><th id="1983069554C1" style="width:56px;" class="column-headers-background">B</th><th id="1983069554C2" style="width:84px;" class="column-headers-background">C</th><th id="1983069554C3" style="width:148px;" class="column-headers-background">D</th><th id="1983069554C4" style="width:91px;" class="column-headers-background">E</th><th id="1983069554C5" style="width:88px;" class="column-headers-background">F</th><th id="1983069554C6" style="width:84px;" class="column-headers-background">G</th><th id="1983069554C8" style="width:402px;" class="column-headers-background">I</th><th id="1983069554C9" style="width:112px;" class="column-headers-background">J</th><th id="1983069554C10" style="width:132px;" class="column-headers-background">K</th><th id="1983069554C11" style="width:188px;" class="column-headers-background">L</th><th id="1983069554C12" style="width:105px;" class="column-headers-background">M</th><th id="1983069554C13" style="width:105px;" class="column-headers-background">N</th><th id="1983069554C14" style="width:80px;" class="column-headers-background">O</th><th id="1983069554C15" style="width:113px;" class="column-headers-background">P</th><th id="1983069554C16" style="width:132px;" class="column-headers-background">Q</th><th id="1983069554C17" style="width:93px;" class="column-headers-background">R</th><th id="1983069554C18" style="width:330px;" class="column-headers-background">S</th></tr></thead><tbody><tr style="height: 1px"><th id="1983069554R0" style="height: 1px;" class="row-headers-background"><div class="row-header-wrapper" style="line-height: 1px">1</div></th><td class="s0"><div style="width:2px;height:1px;"><img src="resources/cellImage_1983069554_0.jpg" style="width:inherit;height:inherit;object-fit:scale-down;object-position:center center;pointer-events:none;"/></div></td><td class="s1"></td><td class="s2"></td><td class="s2"></td><td class="s2"></td><td class="s2"></td><td class="s3" dir="ltr">4</td><td class="s4"></td><td class="s2"></td><td class="s2"></td><td class="s2"></td><td class="s2"></td><td class="s2"></td><td class="s2"></td><td class="s2"></td><td class="s2"></td><td class="s2"></td><td class="s2"></td></tr><tr style="height: 135px"><th id="1983069554R1" style="height: 135px;" class="row-headers-background"><div class="row-header-wrapper" style="line-height: 135px">2</div></th><td class="s5" dir="ltr"></td><td class="s6" dir="ltr" colspan="17">BA ƠI ĐỪNG NÓI DỐI</td></tr><tr style="height: 53px"><th id="1983069554R2" style="height: 53px;" class="row-headers-background"><div class="row-header-wrapper" style="line-height: 53px">3</div></th><td class="s1"></td><td class="s1" rowspan="2">#</td><td class="s2" rowspan="2">SCENE #</td><td class="s2" rowspan="2">LOCATION</td><td class="s2" dir="ltr" rowspan="2">SHOT #</td><td class="s2" dir="ltr" rowspan="2">INT/<br>EXT</td><td class="s2" rowspan="2">D/N</td><td class="s2" rowspan="2">DESCRIPTION</td><td class="s2" dir="ltr" rowspan="2">DIALOGUE</td><td class="s2" rowspan="2">SUBJECTS</td><td class="s2" dir="ltr" rowspan="2">SCRIPT TIME</td><td class="s2" rowspan="2">SHOT SIZE</td><td class="s2" dir="ltr" rowspan="2">SHOT TYPE</td><td class="s2" rowspan="2">SIDE</td><td class="s2" rowspan="2">ANGLE</td><td class="s2" rowspan="2">MOVEMENT</td><td class="s2" rowspan="2">LENS</td><td class="s2" dir="ltr" rowspan="2">NOTE</td></tr><tr style="height: 40px"><th id="1983069554R3" style="height: 40px;" class="row-headers-background"><div class="row-header-wrapper" style="line-height: 40px">4</div></th><td class="s1"></td></tr><tr><th style="height:3px;" class="freezebar-cell freezebar-horizontal-handle"></th><td class="freezebar-cell"></td><td class="freezebar-cell"></td><td class="freezebar-cell"></td><td class="freezebar-cell"></td><td class="freezebar-cell"></td><td class="freezebar-cell"></td><td class="freezebar-cell"></td><td class="freezebar-cell"></td><td class="freezebar-cell"></td><td class="freezebar-cell"></td><td class="freezebar-cell"></td><td class="freezebar-cell"></td><td class="freezebar-cell"></td><td class="freezebar-cell"></td><td class="freezebar-cell"></td><td class="freezebar-cell"></td><td class="freezebar-cell"></td><td class="freezebar-cell"></td></tr><tr style="height: 115px"><th id="1983069554R4" style="height: 115px;" class="row-headers-background"><div class="row-header-wrapper" style="line-height: 115px">5</div></th><td class="s7"></td><td class="s1" dir="ltr">1</td><td class="s3" dir="ltr">1</td><td class="s3" dir="ltr">QUỐC LỘ 1D</td><td class="s3" dir="ltr">1</td><td class="s3" dir="ltr">E</td><td class="s3" dir="ltr">D</td><td class="s8" dir="ltr">Dương đi xe máy trên đèo</td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr">Dương</td><td class="s9" dir="ltr">00:30</td><td class="s9" dir="ltr">WS</td><td class="s9" dir="ltr">Observe</td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr">Eye Level</td><td class="s9" dir="ltr">Pan</td><td class="s9" dir="ltr"></td><td class="s9"></td></tr><tr style="height: 115px"><th id="1983069554R5" style="height: 115px;" class="row-headers-background"><div class="row-header-wrapper" style="line-height: 115px">6</div></th><td class="s7"></td><td class="s1" dir="ltr">2</td><td class="s3" dir="ltr">2</td><td class="s3" dir="ltr">BỆNH VIỆN</td><td class="s3" dir="ltr">1</td><td class="s3" dir="ltr">E</td><td class="s3" dir="ltr">D</td><td class="s8" dir="ltr">Dương đi xe máy ngang bờ biển</td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr">Dương</td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr">WS</td><td class="s9" dir="ltr">Single</td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr">Eye Level</td><td class="s9" dir="ltr">Static</td><td class="s9" dir="ltr"></td><td class="s9"></td></tr><tr style="height: 115px"><th id="1983069554R6" style="height: 115px;" class="row-headers-background"><div class="row-header-wrapper" style="line-height: 115px">7</div></th><td class="s7"></td><td class="s1" dir="ltr">3</td><td class="s3" dir="ltr">2</td><td class="s3" dir="ltr">BỆNH VIỆN</td><td class="s3" dir="ltr">2</td><td class="s3" dir="ltr">E</td><td class="s3" dir="ltr">D</td><td class="s8" dir="ltr">Dương đi bộ vào khuôn viên bệnh viện (Có nhiều bệnh nhân extra)</td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr">Dương</td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr">WS</td><td class="s9" dir="ltr">Observe</td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr">Eye Level</td><td class="s9" dir="ltr">Pan</td><td class="s9" dir="ltr"></td><td class="s9"></td></tr><tr style="height: 115px"><th id="1983069554R7" style="height: 115px;" class="row-headers-background"><div class="row-header-wrapper" style="line-height: 115px">8</div></th><td class="s7"></td><td class="s1" dir="ltr">4</td><td class="s3" dir="ltr">2</td><td class="s3" dir="ltr">BỆNH VIỆN</td><td class="s3" dir="ltr">3</td><td class="s3" dir="ltr">E</td><td class="s3" dir="ltr">D</td><td class="s8" dir="ltr">Dương đi trên HÀNH LANG GIẾNG TRỜI</td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr">Dương</td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr">WS</td><td class="s9" dir="ltr">Single</td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr">Eye Level</td><td class="s9" dir="ltr">Static</td><td class="s9" dir="ltr"></td><td class="s9"></td></tr><tr style="height: 115px"><th id="1983069554R8" style="height: 115px;" class="row-headers-background"><div class="row-header-wrapper" style="line-height: 115px">9</div></th><td class="s7"></td><td class="s1" dir="ltr">5</td><td class="s3" dir="ltr">2</td><td class="s3" dir="ltr">BỆNH VIỆN</td><td class="s3" dir="ltr">4</td><td class="s3" dir="ltr">I</td><td class="s3" dir="ltr">D</td><td class="s8" dir="ltr">Các bệnh nhân trong phòng bệnh</td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr">Bệnh nhân (Extra)</td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr">Random</td><td class="s9" dir="ltr">Insert</td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr">Eye Level</td><td class="s9" dir="ltr">Static</td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr">Tạo không khi</td></tr><tr style="height: 115px"><th id="1983069554R9" style="height: 115px;" class="row-headers-background"><div class="row-header-wrapper" style="line-height: 115px">10</div></th><td class="s7"></td><td class="s1" dir="ltr">6</td><td class="s3" dir="ltr">2</td><td class="s3" dir="ltr">BỆNH VIỆN</td><td class="s3" dir="ltr">5</td><td class="s3" dir="ltr">E</td><td class="s3" dir="ltr">D</td><td class="s8" dir="ltr">Dương đi trên HÀNH LANG VÀO PHÒNG BỆNH CỦA AN</td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr">Dương</td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr"></td><td class="s9"></td></tr><tr style="height: 115px"><th id="1983069554R10" style="height: 115px;" class="row-headers-background"><div class="row-header-wrapper" style="line-height: 115px">11</div></th><td class="s7"></td><td class="s1" dir="ltr">7</td><td class="s3" dir="ltr">3</td><td class="s3" dir="ltr">NHÀ VĂN</td><td class="s3" dir="ltr">1</td><td class="s3" dir="ltr">I</td><td class="s3" dir="ltr">D</td><td class="s8" dir="ltr">Văn đứng trước gương chỉnh trang trước khi đi làm</td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr">Văn</td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr">MS</td><td class="s9" dir="ltr">Single</td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr">Eye Level</td><td class="s9" dir="ltr">Static</td><td class="s9" dir="ltr"></td><td class="s9"></td></tr><tr style="height: 115px"><th id="1983069554R11" style="height: 115px;" class="row-headers-background"><div class="row-header-wrapper" style="line-height: 115px">12</div></th><td class="s7"></td><td class="s1" dir="ltr">8</td><td class="s3" dir="ltr">4</td><td class="s3" dir="ltr">PHÒNG BỆNH CỦA AN</td><td class="s3" dir="ltr">1</td><td class="s3" dir="ltr">I</td><td class="s3" dir="ltr">D</td><td class="s8" dir="ltr">Tay An đang vẽ tranh</td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr"></td><td class="s9"></td></tr><tr style="height: 115px"><th id="1983069554R12" style="height: 115px;" class="row-headers-background"><div class="row-header-wrapper" style="line-height: 115px">13</div></th><td class="s7"></td><td class="s1" dir="ltr">9</td><td class="s3" dir="ltr">4</td><td class="s3" dir="ltr">PHÒNG BỆNH CỦA AN</td><td class="s3" dir="ltr">2</td><td class="s3" dir="ltr">I</td><td class="s3" dir="ltr">D</td><td class="s8" dir="ltr">Dương đút cháo cho An ăn &gt; An hỏi về ba</td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr"></td><td class="s9"></td></tr><tr style="height: 115px"><th id="1983069554R13" style="height: 115px;" class="row-headers-background"><div class="row-header-wrapper" style="line-height: 115px">14</div></th><td class="s7"></td><td class="s1" dir="ltr">10</td><td class="s3" dir="ltr">4A</td><td class="s3" dir="ltr">HÀNH LANG BỆNH VIỆN</td><td class="s3" dir="ltr">1</td><td class="s3" dir="ltr">E</td><td class="s3" dir="ltr">D</td><td class="s8" dir="ltr">Văn và một Y TÁ đến phòng An gặp 2 đồng nghiệp</td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr">Văn; Y TÁ; Đồng nghiệp #1; Đồng nghiệp #2</td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr">WS</td><td class="s9" dir="ltr">Three</td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr"></td><td class="s9" dir="ltr">Static</td><td class="s9" dir="ltr"></td><td class="s9"></td></tr><tr style="height: 119px"><th id="1983069554R14" style="height: 119px;" class="row-headers-background"><div class="row-header-wrapper" style="line-height: 119px">15</div></th><td class="s7"></td><td class="s10" dir="ltr" colspan="17"></td></tr></tbody></table></div>



-----------------------


- Các giá trị: Scene#, Shot#, INT/EXT, D/N, LOCATION - đến từ việc quét kịch bản theo mẫu:

    Scene#. INT/EXT (NỘI/NGOẠI). LOCATION - DAY/NIGHT/BLUE HOUR,... (NGÀY/ĐÊM)

    Trong đó Scene# trước đấu (.) đầu tiên, INT/EXT là chữ in hoa trước dấu chấm thứ 2, LOCATION là chữ in hoa sau dấu gạch (tước DAY/NIGHT/BLUE HOUR,...), DAY/NIGHT/BLUE HOUR,... là chữ in hoa sau dấu gạch ngang.
- Các giá trị khác sẽ được người dùng nhập thủ công
- Giá trị # (tức số thứ tự) sẽ được tự động điền và thay đổi theo quy luật thứ tự tăng dần, bắt đầu từ số 1
- Giá trị Shot# (tức số thứ tự shot trong cùng một scene) sẽ được tự động điền và thay đổi theo quy luật thứ tự tăng dần, bắt đầu từ số 1 > nhưng có thể thêm ký tự số sau dấu chấm cũng tăng dần, ví dụ: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, ... > nhưng có thể thêm ký tự chữ sau dấu chấm cũng tăng dần, ví dụ: 1.1a, 1.1b, 1.1c, 1.2a, 1.2b, 1.2c, ...
- Giá trị Scene# (tức số thứ tự scene trong toàn bộ shotlist) sẽ được nhận diện từ số Scene# trong kịch bản > Scene# được định nghĩa gồm số và cả ký tự chữ theo quy tắc, nếu trong cùng 1 scene cần chia ra những phần nhỏ trong 1 scene, sẽ được đánh chữ cái, theo quy tắc, bắt đầu phần đầu tiên luôn luôn bằng số ví dụ: 1

    sau đó chia scene đó ra nhỏ hơn sẽ là 1A, 1B,...
    Ví dụ:
        1. INT/EXT (NỘI/NGOẠI). LOCATION - DAY/NIGHT/BLUE HOUR,... (NGÀY/ĐÊM)
        1A. INT/EXT (NỘI/NGOẠI). LOCATION - DAY/NIGHT/BLUE HOUR,... (NGÀY/ĐÊM)
        1B. INT/EXT (NỘI/NGOẠI). LOCATION - DAY/NIGHT/BLUE HOUR,... (NGÀY/ĐÊM)
        2. INT/EXT (NỘI/NGOẠI). LOCATION - DAY/NIGHT/BLUE HOUR,... (NGÀY/ĐÊM)
        2A. INT/EXT (NỘI/NGOẠI). LOCATION - DAY/NIGHT/BLUE HOUR,... (NGÀY/ĐÊM)
        2B. INT/EXT (NỘI/NGOẠI). LOCATION - DAY/NIGHT/BLUE HOUR,... (NGÀY/ĐÊM)

    Trong một số trường hợp, nếu người dùng không biết rõ quy trình viết kịch bản và chia tên scene họ có thể chia như sau:
        1A. INT/EXT (NỘI/NGOẠI). LOCATION - DAY/NIGHT/BLUE HOUR,... (NGÀY/ĐÊM)
        1B. INT/EXT (NỘI/NGOẠI). LOCATION - DAY/NIGHT/BLUE HOUR,... (NGÀY/ĐÊM)
        2. INT/EXT (NỘI/NGOẠI). LOCATION - DAY/NIGHT/BLUE HOUR,... (NGÀY/ĐÊM)

        họ hiểu thành nếu scene 1 có 2 phần, họ sẽ đánh số nó là 1a, 1b chứ không phải là bắt đầu từ 1 rồi mới đến 1a

        >>> trường hợp này, hãy cứ follow theo cách đánh số của họ, không cần phải cứng nhắc theo quy tắc đánh số scene ở trên

- Giá trị INT/EXT, có thể được định nghĩa là: INT. hoặc EXT. hoặc INT/EXT. hoặc EXT/INT. tương tự với tiếng việt là NỘI. hoặc NGOẠI. hoặc NỘI/NGOẠI. hoặc NGOẠI/NỘI.
    các giá trị INT/EXT. hoặc EXT/INT. tức là scene đó được quay từ NỘI ra NGOẠI hoặc từ NGOẠI vào NỘI, theo thứ tự từ trái sáng phải, cái nào trước thì nơi đó được quay trước
    >>> khi auto detect, luôn luôn ưu tiên INT. hoặc EXT. trước, nếu không thể xác định được, hãy để INT/EXT. hoặc EXT/INT.

- Giá trị D/N, có thể được định nghĩa thành rất nhiều dạng, có thể là: D. hoặc N. hoặc D/N. hoặc N/D. tương tự với tiếng việt là NGÀY. hoặc ĐÊM. hoặc NGÀY/ĐÊM. hoặc ĐÊM/NGÀY. và cũng có thể là SÁNG SỚM, TỐI MUỘN, CHẠNG VẠNG, BLUR HOUR, GOLDER HOUR, MỘT LÚC SAU, SAU ĐÓ, NGAY SAU ĐÓ, ...

    >>> khi auto detect luôn luôn lấy giá trị của người dùng, dù là tiếng việt hay tiếng anh, cứ lấy giá trị của người dùng là được

- Giá trị LOCATION, có thể được định nghĩa thành rất nhiều dạng

    >>> khi auto detect luôn luôn lấy giá trị của người dùng, dù là tiếng việt hay tiếng anh, cứ lấy giá trị của người dùng là được

- Giá trị DESCRIPTION, là text để người dùng tự nhập
- Giá trị AUTO DETECT, là giá trị mà AI tự động detect từ line-scipt, theo nguyên tắc straight = lấy, zigzac = không lấy,

- Giá trị DIALOGUE, là auto detect từ line-script, theo cấu trúc như sau:
    NHÂN VẬT (KHÔNG MỞ NGOẶC nếu chỉ thoại bình thường, hoặc V.O./O.S./...)
    (mô tả về cảm xúc hoặc hành động trong lúc thoại)
    Nội dung thoại.

        Ví dụ:
                        VĂN
                (lịch sự)
                Có vẻ không phải là tin vui với chị
                thì phải?
                DƯƠNG
                Không phải thế.
                VĂN

                Vậy... chị đang lo lắng chuyện gì?

                DƯƠNG
                (xúc động)
                Cháu suốt ngày đòi gặp ba nó. Nhưng
                tôi không thể.

        >> Hãy detect nhân vật nào đang nói và sắp xếp nó theo thứ tự từ trên xuống dưới trong shotlist

    Sẽ có thêm 1 trường hợp là cả 2 người cùng nói 1 lúc, ví dụ:
            ĐỒNG NGHIỆP 1                 ĐỒNG NGHIỆP 2
           Chào anh Văn.                    Chào bác sĩ.

           trong văn bản, cả hai sẽ nằm trên cùng 1 hàng
        >>> hãy detect cái nào nằm bên trái thì cho nằm trên, cái nào nằm bên phải thì cho nằm dưới > cộng thêm 1 TEXT là (NÓI CÙNG LÚC) nằm dưới cùng của 2 người đó

- Giá SUBJECTS là những nhân vật, đồ vật, chứa trong phần ACTION của kịch bản được line script bao gồm trong đó. Thông thường cấu trúc của kịch bản sẽ hoạt động như sau: nếu có UPPERCASE và thêm (số) thì đó là lần đầu nhân vật đó xuất hiện.
    Ví dụ: Trên NỀN ĐEN ta nghe tiếng động cơ của nhiều loại xe đang chạy với tốc độ cao. Cảnh vật xung quanh dần hiện ra: đó là một quốc lộ lớn. Một chiếc container có tiếng máy nặng nề đang leo lên dốc của con đèo. Nhiều chiếc xe máy, ô tô lướt nhanh qua nhau. Từ xa có một người phụ nữ, DUƠNG (35), đi chiếc xe máy cũ dần lấy sự chú ý của chúng ta. Cô đang chạy xe đến gần, rồi rẽ vào một con đèo nhỏ cắt ngang trục đường Con đèo đưa cô đi xuống một nơi khác. Khi một thành phố nhỏ nằm gọn trong một lòng chảo được ôm trọn bởi hai dãy núi cao đang dần lộ diện. Cô đi xa dần xuống con đèo dốc dựng đứng dẫn vào thành phố.

    > Thì DƯƠNG (35) chính là nhân vật dương sẽ nằm trong SUBJECTS, được line script kẻ ngang qua

    Nhưng sau khi đã nhắc xong lần đầu, lần sau chỉ cần viết là Dương (viết hoa chữ cái đầu), thì "Dương" này cũng nằm trong subjects, được line script kẻ ngang qua, đôi khi kịch bản chỉ viết "Cô" hoặc "Anh" thì cũng được tính là SUBJECTS nhưng phải để tên của nhân vật là "Dương"

    Riêng đồ vật, không áp dụng viết hoa giống với SUBJECTS, lúc này hãy để người dùng tự điền

    >>> Logic detect của SUBJECTS sẽ luôn là nếu thấy tên nhân vật thì điền vào, và có thể có nhiều hơn 1 nhân vật nằm trong cùng 1 SUBJECTS, còn những field khác hãy cứ để trống để người dùng tự nhập

- Giá trị SCRIPT TIME, là thời lượng của shot, được tính bằng giây, ví dụ: 10s, 20s, 30s, ... để người dùng tự nhập: nhưng theo format sau: mm:ss

- Giá trị SHOT SIZE, SHOT TYPE, SIDE, ANGLE, MOVEMENT, LENS, ... là những giá trị để người dùng tự nhập, không có logic detect, nhưng theo LIST field được gợi ý bên trên, và tất cả các field này luôn có thể được thay đổi bởi người dùng bằng 1 field mới là [CUSTOM]

- Giá trị NOTE là text để người dùng tự nhập

>>> CUỐI CÙNG, phải có 1 hàng chứa các giá trị tổng kết:

    - Shot: Tổng số shot
    - Script Time: Tổng thời lượng của phim được tính nằng cách SUM (toàn bộ script time của toàn bộ shot)
    - D/N: Phần trăm quay ngày và đêm (nếu có những shot nào không có D/N thì lập một danh sách các text thường được dùng để detect xem nó là ngày hay đêm) > Người dùng cũng có thể tự động định nghĩa shot đó là ngày hay đêm (nhưng không làm thay đổi đi text detect từ kịch bản gốc - suy nghĩ thêm về panel mới này)
    - INT/EXT: Phần trăm quay nội và ngoại, nếu có scene hiện cả INT và EXT thì cứ xem nó là 2 giá trị và cộng dồn vào kết quả phần trăm
    

TỔNG KẾT về tính năng shotlist
- liên kết chặt chẽ với line script
- mỗi line script sẽ có 1 shot tương ứng, nếu line script bị xóa thì shot tương ứng cũng bị xóa, nếu line script được thêm vào thì shot tương ứng cũng được thêm vào
- ở tab line script cũng có 1 thanh panel nằm bên phải, chứa các thông tin sẽ liên kết với shotlist, nhưng không hiển thị toàn bộ: mà chỉ hiển thị:
    + Shot# (nhưng shot của shotlist nằm trong tab line script sẽ hiển thị shot ở dạng Scene#/Shot# - nhưng chỉ hiển thị nội dung là Shot#) còn ở shotlist mới liên kê rõ ra là Scene # một cột và Shot # một cột
    + Shot size
    + Shot type
    + Angle
    + Movement
    + Lens
    + Description
    + Note
        >>>> Mỗi shot nằm trong panel shotlist trong tab line script sẽ có 1 nút xổ xuống để hiển thị toàn bộ thông tin hoặc chỉ hiện thị Shot# thôi

- Ở tab shotlist tổng sẽ có nút click để chuyển sang tab line script tương ứng và ngược lại
- Ở mỗi shot trong tab shotlist sẽ có nút dẫn đến vị trí cụ thể của line script trên trang kịch bản nằm trong tab line script và đồng thời bật nút xổ xuống shot đó lên trong panel shotlist trong tab line script và ngược lại
- Tab shotlist có thể xuất ra file csv, excel, pdf, share link online được chia sẻ public và tạo ra 1 google sheet cụ thể liên kết với google drive - có thể sync 1 chiều (khi bấm nút sync, bên shotlist sẽ update lên google sheet, còn bên google sheet thay đổi thì shotlist sẽ không thay đổi)
- Khi xuất ra các định dạng file excel hoặc google drive, phải có format và visual tương tự như file Shotlist.html (Sẽ được cung cấp đính kèm theo)

Thao tác người dùng (UI/UX):

Tab Line script và Shotlist liên kết chặt chẽ với nhau. Ở Tab Line script cũng có 1 thanh panel nằm bên phải, chứa các thông tin sẽ liên kết với shotlist, nhưng không hiển thị toàn bộ

Người dùng bấm nút "Mở bảng Shotlist" (View Shotlist) ở góc màn hình.

Một thanh Sidebar bên phải trượt ra (hoặc một Modal hiện lên), hiển thị một bảng dữ liệu (Table) cực kỳ gọn gàng.

Trên bảng hiển thị danh sách tất cả các đường line đã vẽ, sắp xếp theo thứ tự số trang và tọa độ (từ trên xuống dưới của kịch bản).

Đồng bộ 2 chiều (Two-way binding): Nếu người dùng bấm đổi tên shot từ "1A" thành "1B" trực tiếp trên bảng Shotlist này, đường line chữ "1A" nằm trên trang PDF kia cũng lập tức đổi thành "1B" (và ngược lại).

Logic Dữ liệu:

Hàm quét qua toàn bộ mảng (Array) chứa các Object Line đã tạo ở Tính năng A, gom nhóm (Group) chúng lại theo số trang và render ra UI Component dạng bảng.


TÍNH NĂNG C: SCRIPT BREAKDOWN (Tự động nhận diện các thành phần trong kịch bản) - Giống app StudioBinder

- Định nghĩa mỗi thành phần trong scene bằng 1 màu sắc cụ thể (không thể thay đổi được màu sắc này, mà phải theo chuẩn quốc tế)
- Cốt lõi của tính năng này chính là highlight (nhưng là biến đổi màu của text, chứ không phải tạo ra 1 ô hightlight chứa text đó) theo các thành phần trong scene bằng màu sắc cụ thể, và khi người dùng di chuột vào highlight đó thì sẽ hiển thị thông tin của thành phần đó
- Có thể chọn phần được highlight để xóa
- Tính năng này sẽ được tạo thành tab hoàn toàn riêng, chỉ được dùng để hỗ trợ app detect những thành phần trong kịch bản, để biết cách auto detect trong tab line script và shotlist
- Tính năng này dùng những thông tin được highlight để tạo thành 1 bảng theo format cố định

LOGIC HIGHLIGHT:
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Script Breakdown Sheet</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --cast:      #FF0000;
    --stunts:    #FF8C00;
    --extras-atm:#228B22;
    --extras-sil:#FFD700;
    --sfx:       #0066CC;
    --props:     #8B00FF;
    --vehicle:   #FF69B4;
    --wardrobe:  #00BFFF;
    --makeup:    #FF6600;
    --sound:     #8B4513;
    --equip:     #C8950A;
    --notes-col: #555555;
    --border:    #999;
    --border-light: #ccc;
    --text:      #111;
    --text-muted:#666;
    --bg:        #fff;
    --bg-header: #f2f0eb;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'IBM Plex Sans', sans-serif;
    background: #e8e4dc;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 20px;
    color: var(--text);
  }

  .page-title {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #888;
    margin-bottom: 20px;
  }

  .sheet {
    width: 100%;
    max-width: 820px;
    background: var(--bg);
    border: 1px solid var(--border);
    box-shadow: 4px 4px 0 #bbb;
  }

  /* ---- TOP HEADER ---- */
  .top-bar {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    border-bottom: 1px solid var(--border);
    background: var(--bg-header);
  }
  .top-bar .cell {
    padding: 10px 14px;
    border-right: 1px solid var(--border);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    font-weight: 500;
  }
  .top-bar .cell:last-child { border-right: none; }

  /* ---- META ROWS ---- */
  .meta-row {
    display: grid;
    border-bottom: 0.5px solid var(--border-light);
  }
  .meta-row.two { grid-template-columns: 150px 1fr; }
  .meta-row.four { grid-template-columns: 70px 1fr 80px 80px; }
  .meta-row.page { grid-template-columns: 100px 1fr 130px 1fr; }

  .meta-cell {
    padding: 8px 14px;
    border-right: 0.5px solid var(--border-light);
    font-size: 12px;
  }
  .meta-cell:last-child { border-right: none; }
  .meta-cell.label {
    font-family: 'IBM Plex Mono', monospace;
    font-weight: 500;
    font-size: 11px;
    background: var(--bg-header);
    white-space: nowrap;
  }
  .meta-cell.fill {
    min-height: 28px;
  }

  /* ---- DESCRIPTION ---- */
  .desc-row {
    border-bottom: 0.5px solid var(--border-light);
    padding: 10px 14px;
    min-height: 70px;
  }
  .desc-row .label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    font-weight: 500;
    display: block;
    margin-bottom: 4px;
  }
  .desc-row textarea {
    width: 100%;
    border: none;
    outline: none;
    resize: none;
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 12px;
    color: var(--text);
    background: transparent;
    min-height: 44px;
  }

  /* ---- CATEGORY GRID ---- */
  .cat-section { border-bottom: 0.5px solid var(--border-light); }

  .cat-row {
    display: grid;
    border-bottom: 0.5px solid var(--border-light);
  }
  .cat-row:last-child { border-bottom: none; }
  .cat-row.three { grid-template-columns: 1fr 1fr 1fr; }
  .cat-row.two   { grid-template-columns: 1fr 1fr; }

  .cat-cell {
    padding: 10px 14px;
    border-right: 0.5px solid var(--border-light);
    min-height: 100px;
  }
  .cat-cell:last-child { border-right: none; }

  .cat-cell.split {
    display: flex;
    flex-direction: column;
    padding: 0;
  }
  .split-top, .split-bottom {
    flex: 1;
    padding: 10px 14px;
  }
  .split-top { border-bottom: 0.5px solid var(--border-light); }

  .cat-label {
    display: inline-block;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.05em;
    padding: 3px 8px;
    margin-bottom: 6px;
    border-radius: 2px;
  }

  .cat-hint {
    display: block;
    font-size: 10px;
    color: var(--text-muted);
    font-family: 'IBM Plex Mono', monospace;
    margin-bottom: 6px;
  }

  .cat-cell textarea {
    width: 100%;
    border: none;
    outline: none;
    resize: none;
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 12px;
    color: var(--text);
    background: transparent;
    min-height: 54px;
  }

  /* ---- CATEGORY COLOR LABELS ---- */
  .lbl-cast      { background: #FFE5E5; color: #8B0000; border: 1px solid #FF0000; }
  .lbl-stunts    { background: #FFEAD0; color: #7A3900; border: 1px solid #FF8C00; }
  .lbl-extras-atm{ background: #D6F0D6; color: #1A5C1A; border: 1px solid #228B22; }
  .lbl-extras-sil{ background: #FFFACC; color: #665900; border: 1px solid #D4B800; }
  .lbl-sfx       { background: #CCE5FF; color: #003D8F; border: 1px solid #0066CC; }
  .lbl-props     { background: #ECD6FF; color: #4B0080; border: 1px solid #8B00FF; }
  .lbl-vehicle   { background: #FFD6EC; color: #7A0040; border: 1px solid #FF69B4; }
  .lbl-wardrobe  { background: #D6F4FF; color: #003D5C; border: 1px solid #00BFFF; }
  .lbl-makeup    { background: #FFE8D6; color: #7A3000; border: 1px solid #FF6600; }
  .lbl-sound     { background: #EDD8C8; color: #4A1F00; border: 1px solid #8B4513; }
  .lbl-equip     { background: #F5ECC8; color: #5C4000; border: 1px solid #C8950A; }
  .lbl-notes     { background: #ECECEC; color: #333;    border: 1px solid #888; }

  /* ---- COLOR LEGEND ---- */
  .legend {
    margin-top: 24px;
    max-width: 820px;
    width: 100%;
  }
  .legend-title {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.15em;
    color: #888;
    margin-bottom: 10px;
    text-transform: uppercase;
  }
  .legend-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 6px;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-family: 'IBM Plex Mono', monospace;
  }
  .legend-dot {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    flex-shrink: 0;
  }
  .legend-hex { color: #999; }

  @media print {
    body { background: white; padding: 0; }
    .sheet { box-shadow: none; }
    .legend { display: none; }
    .page-title { display: none; }
    textarea { pointer-events: none; }
  }
</style>
</head>
<body>

<p class="page-title">Script Breakdown Sheet — StudioBinder Standard</p>

<div class="sheet">

  <!-- TOP BAR -->
  <div class="top-bar">
    <div class="cell">BREAKDOWN SHEET: #___</div>
    <div class="cell">Page Count:</div>
    <div class="cell">Date:</div>
  </div>

  <!-- PROD INFO -->
  <div class="meta-row two" style="border-bottom:0.5px solid var(--border-light)">
    <div class="meta-cell label">Prod. Company</div>
    <div class="meta-cell fill"></div>
  </div>
  <div class="meta-row two" style="border-bottom:1px solid var(--border)">
    <div class="meta-cell label">Project Title</div>
    <div class="meta-cell fill"></div>
  </div>

  <!-- SCENE INFO -->
  <div class="meta-row four" style="border-bottom:0.5px solid var(--border-light)">
    <div class="meta-cell label">Scene #</div>
    <div class="meta-cell label fill">Scene Name</div>
    <div class="meta-cell label">INT/EXT</div>
    <div class="meta-cell label">D / N</div>
  </div>
  <div class="meta-row page" style="border-bottom:1px solid var(--border)">
    <div class="meta-cell label">Script Page</div>
    <div class="meta-cell fill"></div>
    <div class="meta-cell label">Location Name</div>
    <div class="meta-cell fill"></div>
  </div>

  <!-- DESCRIPTION -->
  <div class="desc-row">
    <span class="label">Description</span>
    <textarea placeholder="Scene description..."></textarea>
  </div>

  <!-- CATEGORY GRID -->
  <div class="cat-section">

    <!-- Row 1: CAST | STUNTS+EXTRAS SILENT | EXTRAS ATM -->
    <div class="cat-row three">
      <div class="cat-cell">
        <span class="cat-label lbl-cast">CAST</span>
        <span class="cat-hint">#FF0000 · red</span>
        <textarea placeholder="Speaking &amp; non-speaking roles..."></textarea>
      </div>
      <div class="cat-cell split">
        <div class="split-top">
          <span class="cat-label lbl-stunts">STUNTS</span>
          <span class="cat-hint">#FF8C00 · orange</span>
          <textarea placeholder="Action requiring stunt expertise..."></textarea>
        </div>
        <div class="split-bottom">
          <span class="cat-label lbl-extras-sil">EXTRAS / SILENT</span>
          <span class="cat-hint">#FFD700 · yellow</span>
          <textarea placeholder="Silent background..."></textarea>
        </div>
      </div>
      <div class="cat-cell">
        <span class="cat-label lbl-extras-atm">EXTRAS / ATMOSPHERE</span>
        <span class="cat-hint">#228B22 · green</span>
        <textarea placeholder="BG talent &amp; atmosphere..."></textarea>
      </div>
    </div>

    <!-- Row 2: SFX | PROPS | VEHICLE/ANIMALS -->
    <div class="cat-row three">
      <div class="cat-cell">
        <span class="cat-label lbl-sfx">SPECIAL EFFECTS</span>
        <span class="cat-hint">#0066CC · blue</span>
        <textarea placeholder="Explosions, squibs, rain, wind..."></textarea>
      </div>
      <div class="cat-cell">
        <span class="cat-label lbl-props">PROPS</span>
        <span class="cat-hint">#8B00FF · purple</span>
        <textarea placeholder="Objects characters interact with..."></textarea>
      </div>
      <div class="cat-cell">
        <span class="cat-label lbl-vehicle">VEHICLE / ANIMALS</span>
        <span class="cat-hint">#FF69B4 · pink</span>
        <textarea placeholder="Cars, boats, livestock, wrangler..."></textarea>
      </div>
    </div>

    <!-- Row 3: WARDROBE | MAKEUP/HAIR | SOUND -->
    <div class="cat-row three">
      <div class="cat-cell">
        <span class="cat-label lbl-wardrobe">WARDROBE</span>
        <span class="cat-hint">#00BFFF · circle</span>
        <textarea placeholder="Character wardrobe items..."></textarea>
      </div>
      <div class="cat-cell">
        <span class="cat-label lbl-makeup">MAKEUP / HAIR</span>
        <span class="cat-hint">#FF6600 · asterisk (*)</span>
        <textarea placeholder="Blood, wounds, prosthetics..."></textarea>
      </div>
      <div class="cat-cell">
        <span class="cat-label lbl-sound">SOUND EFFECTS & MUSIC</span>
        <span class="cat-hint">#8B4513 · brown</span>
        <textarea placeholder="Source music, SFX notes..."></textarea>
      </div>
    </div>

    <!-- Row 4: SPECIAL EQUIPMENT | PRODUCTION NOTES -->
    <div class="cat-row two" style="border-bottom:none">
      <div class="cat-cell">
        <span class="cat-label lbl-equip">SPECIAL EQUIPMENT</span>
        <span class="cat-hint">#C8950A · box around</span>
        <textarea placeholder="Cranes, drones, rigs, lenses..."></textarea>
      </div>
      <div class="cat-cell">
        <span class="cat-label lbl-notes">PRODUCTION NOTES</span>
        <span class="cat-hint">#555555 · underline</span>
        <textarea placeholder="Scheduling, logistics, safety..."></textarea>
      </div>
    </div>

  </div><!-- /cat-section -->

</div><!-- /sheet -->

<!-- COLOR LEGEND -->
<div class="legend">
  <p class="legend-title">Color reference</p>
  <div class="legend-grid">
    <div class="legend-item"><div class="legend-dot" style="background:#FF0000"></div> CAST <span class="legend-hex">#FF0000</span></div>
    <div class="legend-item"><div class="legend-dot" style="background:#FF8C00"></div> STUNTS <span class="legend-hex">#FF8C00</span></div>
    <div class="legend-item"><div class="legend-dot" style="background:#228B22"></div> EXTRAS/ATM <span class="legend-hex">#228B22</span></div>
    <div class="legend-item"><div class="legend-dot" style="background:#FFD700"></div> EXTRAS/SILENT <span class="legend-hex">#FFD700</span></div>
    <div class="legend-item"><div class="legend-dot" style="background:#0066CC"></div> SPECIAL EFFECTS <span class="legend-hex">#0066CC</span></div>
    <div class="legend-item"><div class="legend-dot" style="background:#8B00FF"></div> PROPS <span class="legend-hex">#8B00FF</span></div>
    <div class="legend-item"><div class="legend-dot" style="background:#FF69B4"></div> VEHICLE/ANIMALS <span class="legend-hex">#FF69B4</span></div>
    <div class="legend-item"><div class="legend-dot" style="background:#00BFFF"></div> WARDROBE <span class="legend-hex">#00BFFF</span></div>
    <div class="legend-item"><div class="legend-dot" style="background:#FF6600"></div> MAKEUP/HAIR <span class="legend-hex">#FF6600</span></div>
    <div class="legend-item"><div class="legend-dot" style="background:#8B4513"></div> SOUND & MUSIC <span class="legend-hex">#8B4513</span></div>
    <div class="legend-item"><div class="legend-dot" style="background:#C8950A"></div> SPECIAL EQUIP <span class="legend-hex">#C8950A</span></div>
    <div class="legend-item"><div class="legend-dot" style="background:#555555"></div> PROD. NOTES <span class="legend-hex">#555555</span></div>
  </div>
</div>

</body>
</html>

----------------
Đây là thông tin từ studio binder:
You’ve got the green light. Your shoot is coming up. Your next task? Create a script breakdown. The script breakdown sheets are used to determine the shooting requirements of every scene and also inform the budget. But do you know how to break down a script like a seasoned pro?

In this post, we’ll review the complete process of marking (or “tagging”) scene elements to create a script breakdown. Follow these six steps and learn how to break down a script every possible way — including the best way. We’ll also give you a free script breakdown sheets PDF template that you can download and take offline.

Why you need a script breakdown
Creating a script breakdown is when you tag various “elements” in a scene to better understand its shooting requirements.

Script breakdowns are typically put together by the 1st AD or producer during the pre-production phase. A script breakdown informs and leads into the creation of the shooting schedule and the budget.

First, let's cover script breakdown basics before we dive into marking up a script step-by-step. 

SCRIPT BREAKDOWN DEFINITIOn
What Is a Script Breakdown?
A script breakdown is an important filmmaking process that allows you to identify all the script elements needed to prep, schedule, and budget a film production. A breakdown happens at a scene level. The person tasked with the job will create scene breakdown after scene breakdown until a full, start-to-finish script breakdown is completed. This will be used to determine technical and creative requirements for each department.

A script breakdown element is an object, person, or process that is identified when creating a scene breakdown, such as:

Cast / Characters
Extras
Props
Set Dressing
Costumes
Makeup
Vehicles
Stunts
Special Effects or VFX
Livestock
Sound
Music
Special Equipment

Okay, we all agree it’s important. Now let’s dive into how to break down a script. We’ll show you all the different methods, tell you which one is the best, and share script breakdown examples.


STARTING YOUR SCRIPT BREAKDOWN
1. Read the script as if you were a viewer
Before you mark anything on the script, read the script from an audience’s perspective. You only have one first impression of the story, so give yourself a chance to connect to it.

Beyond the emotional connection, the more familiar you are with the story, the more likely you will be to identify all the elements once you begin marking the script.


WHO MARKS THE SCRIPT?
The producer usually completes a simple script breakdown first in order to create a preliminary shooting schedule and budget.

The 1st AD then conducts a more comprehensive script breakdown to create the stripboard, scene breakdown, and production shooting schedule.

The DP marks the script to generate a shot list and equipment requirements. Other department keys (i.e. production design) will do their own analyses as well.

2. Scan for script formatting errors
After you have read the script all the way through, read it once more, this time scanning for any formatting errors that may cause hiccups when importing the script file into scheduling software such as Movie Magic Scheduling or StudioBinder.

THE MOST COMMON FORMATTING ERRORS TO LOOK OUT FOR:
Scene locations should be phrased consistently throughout the script.
Character names should be consistent as well.
Scene headers should be formatted only as INT or EXT (interior or exterior).
Scene headers should be formatted only as D or N (day or night).
Scene numbers have been generated.

These changes should be saved in your screenwriting software. 

Just go to your Documents page and you can double-check that the formatting is correct.

For example, your Characters should be formatted as Characters to avoid any potential issues.


3. Start breaking down your script into 8ths
Marking 1/8s of a page is exactly like it sounds. Divide every page into eight, 1 inch parts. This measurement is used to estimate the screen time and shooting time for a scene. Script 1/8ths allow you to get on same page as your team. All puns aside, it’s useful standard of measurement.

Page 1/8ths should be visible on the top of your scene breadown sheets, breakdown reports, DOOD reports, shot lists, and shooting schedule.

Traditionally, the 1st AD would measure by eyeballing the script or taking actual printed script pages, a pen, and a ruler to mark 8ths.

This is still a reliable “Old Hollywood” option, but most modern productions use script breakdown software. When you import your script, the software automatically tallies each scene by 8ths.

On a typical dialogue-heavy indie production, you can expect to shoot roughly five pages per day where one page equals one minute of screen time.

Pro Tip
Remember, some things that take longer to shoot:

Stunts, Crowds, Busy Locations, Car Chases, Entrances and Exits, Action Sequences, Gunshots, Practical Special effects, and Musical Performances.


SCHEDULING MUSICAL PERFORMANCES
Be especially conscious of the ratio of screentime : page count when it comes to musical performances. Otherwise you may not budget enough time to shoot what you need.

It’s common for screenwriters to summarize on-screen performances into brief one-liners like “Stuart performs a song.”  It may be only one action line in the script, but the performance could take 2-3 minutes of screen time.

The page count should reflect this and be rewritten as 2-3 pages as well. We suggest writing out all of the lyrics as dialogue, with plenty of beats and action descriptions.


Tagging Script Elements and generating breakdown sheets
4. Identify the script elements
This step is where we get into script breakdown nitty gritty. Tagging, tallying, and keeping track of elements: that’s what it’s all about.

A script breakdown is the pre production step that helps identify all the elements in a scene so they can be prepped prior to production and included in the shooting schedule, call sheets and various other script breakdown sheets reports. 

If you're doing this lo-fi on a physical script, it’s common to use multiple highlighters and pens to identify specific element types.

Marking a script is tedious and careful work.

You can find “typical” script breakdown colors below. If you’re using custom script breakdown colors, be sure to include a color legend with your script breakdown sheets.

In truth, the script breakdown process is fun, click-and-drag experience if you're using more modern script breakdown software.

First, you’ll import your script. The software automatically categorizes it scene by scene, so a lot of the heavy lifting is done for you.

From there, you’ll start with the first scene breakdown and keep moving ahead.

Highlight each element you want to tag and choose from a pull-down list of 22 categories (or create a custom category).

You’ll decide if you want to automatically tag the element every time it appears in the script, or only this time.

And if necessary, you’ll increase the quantity — for example, if you’re doing a baseball game scene breakdown, you might tag a baseball cap as a prop. But since there are nine players on the field for each team, you’ll actually need nine identical baseball caps (times two, if you want hats for each team). You can raise the number in the software to make it easy to track.

You might consider creating more tailored element categories and colors for your script breakdown format. Customize. Create new categories in your script breakdown software — as many as you need.

If you are shooting a horror film you may want to define all the elements related to prosthetics.

If you are shooting a western, you may need to add categories for horses and weapons.

To add a custom element, under "Elements," you’ll click "Add New Element." Enter your own field and assign a color, so it'll appear when you tag the script.

You’ll also add notes whenever necessary. Need to give clarification or special instructions about a particular scene? Want to find out if an element can be changed or eliminated? Add a note for you and your collaborators to see.

See? Making a script breakdown is fun, right? It also gets you questioning how important each element really is which opens up important creative decisions. 

Now keep going.

Done with the first scene breakdown? Break down the next scene, and the next scene. Break down the whole script. We still have to make reports.

5. Generate script breakdown reports
After marking up your script, you’re ready to turn them into reports. This is a script breakdown sheet, a summary list of all the elements in a scene. Essentially, a “breakdown of your breakdown.”

There are two ways to achieve this.

Bear in mind, if you're using a breakdown template, you'd need to print out the breakdown sheet for every scene. So for 120 scene script, be prepared to print at least 120 breakdown sheets to fill out by hand.

Then scan, copy, collate, and distribute. Since elements will likely change, be prepared to re-print or version your PDFs clearly.

Effective? Sure. Efficient? Not really.

So what’s the best way to create a script breakdown sheet?

2. Script Breakdown Software
The benefit of using an online, cloud-based script breakdown software is that tagging elements is a simple click-and-drag process which speeds up the workflow dramatically.

Additionally, since it's online, you can share your breakdown with other department heads (e.g. art director, prop master, VFX supervisor, etc) to help you identify the elements that pertain to their department.

This distributes your workload, while ensuring a higher level of detail, oversight and quality.

You don't need to create reports manually, script breakdown sheets, Day out of Day reports, and shooting schedules are generated for you once you tag your elements. You can view, print, generate a sharelink, or save a script breakdown sheet PDF.

However you choose to generate your reports, they’re the fruits of your script breakdown work. Script breakdown sheets and scene breakdown sheets give you a summarized menu of every element you’ve tagged and categorized.

They tell you, and your production team, exactly what is required for every scene.

And that’s how to break down a script for film production scheduling.

Now, on to scheduling.

-------
Tổng kết tính năng script breakdown:
- Sau khi người dùng làm thủ công (bằng cách highlight các text trong kịch bản), khi bôi đen 1 đoạn text trong kịch bản bằng cách kéo thả chuột hoặc apple pen thì hiện lên 1 pop up để người dùng chọn các loại breakdown (như hình dưới đây)
                --cast:      #FF0000;
            --stunts:    #FF8C00;
            --extras-atm:#228B22;
            --extras-sil:#FFD700;
            --sfx:       #0066CC;
            --props:     #8B00FF;
            --vehicle:   #FF69B4;
            --wardrobe:  #00BFFF;
            --makeup:    #FF6600;
            --sound:     #8B4513;
            --equip:     #C8950A;
            --notes-col: #555555;

        kèm theo màu sắc của từng loại breakdown
    
    sau khi click chọn, trả về kết quả đoạn text đó được đổi màu theo màu sắc tương ứng với loại breakdown đã chọn.
    
- Các fields khác như: Page Count (hãy đọc hưởng dẫn của studiobinder), date (thời điểm sau khi kết thúc chỉnh sửa bảng), breakdown sheet (tự điền), prod. company (tự điền), project title (auto detect theo tên project, lúc tạo prj mới người dùng sẽ nhập tên này), scene# (auto detect), Scene name (tự nhập), int/ext (tự nhập), day night (tự nhập), script page (auto detect), location name (auto detect = LOCATION ứng với kịch bản), description (tự nhập, và cái này khác với description của shotlist)

---------------------------------------

TỔNG QUAN TOÀN BỘ APP
- thứ tự các tab sẽ như sau: Script import (theo pdf hoặc fdx,...) > Breakdown > Line Script > Shotlist
- Giao diện người dùng sẽ có chức năng đăng nhập theo gmail, đăng nhập và đăng ký bằng email
- Có phân cấp như sau: Super Admin > Project Owner (Cũng là user nhưng sở hữu 1 project và thêm người khác vào dùng dự án bằng email) > User (chỉ có thể dùng dự án mà được Project Owner thêm vào)

- Có thể sync theo thời gian thực và co-worker. Mọi người có thể làm theo dõi phiên làm việc của nhau theo thời gian thực và trực tiếp. Ví dụ 1 người breakdown, 1 người kẻ line script, và 1 người chỉnh sửa shotlist
- Project Owner có thể cấp quyền chỉnh sửa hoặc chỉ xem cho từng user. Ví dụ: user A chỉ có thể xem breakdown và line script, user B có thể xem breakdown, line script và shotlist, user C có thể xem breakdown, line script, shotlist và chỉnh sửa shotlist, hoặc có thể chỉnh sửa shotlist nhưng không được chỉnh sửa breakdown và line script, hoặc tất cả các quyền. Tức là Project Owner có thể tuỳ chỉnh quyền cho từng user
- Để trở thành Project Owner thì chỉ cần sở hữu 1 project và mời người khác vào làm cùng thì sẽ trở thành Project Owner
- Super Admin có thể xem được toàn bộ nội dung project của người dùng bằng 1 tab riêng là Admin Dashboard, ở đó admin có thể chọn vào từng người dùng cụ thể và xem ở chế độ của họ nhưng họ không được biết admin đang xem. Kể cả trong trường hợp họ đang trong dự án ở chế độ co-worker họ cũng không được thấy hiển thị ai đang xem mình (nếu là super admin, còn nếu là project owner thì user sẽ thấy ai đang xem mình)
    + Dashboard đó có thể xem được ở chế độ xem của từng user, tức là admin có thể xem được ở chế độ breakdown, line script, shotlist, hoặc tất cả các chế độ. Chứ không phải toàn bộ project của user tập trung ở 1 nơi trong dashboard >>> giao diện clean và tập trung

TỔNG QUAN VỀ UX/UI của APP được tham khảo từ 3 app sau: Studiobinder, Scriptation, Script Evolution
    - https://www.studiobinder.com/
    - https://scriptation.com/
    - https://scriptevolution.app/en/

ĐỌC ui-reference.md để hiểu rõ hơn về tham khảo giao diện người dùng