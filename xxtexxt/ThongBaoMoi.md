
# 🔄 Thiết Kế Hệ Thống Redirect Type & Data

## 📋 Tổng Quan

Thay vì dùng `redirect_url` dạng string phức tạp, hệ thống mới sử dụng:
- `redirect_type`: Loại điều hướng (string)
- `redirect_data`: Dữ liệu chi tiết (object)

### Lợi Ích
✅ Dễ parse và xử lý ở frontend  
✅ Type-safe, rõ ràng hơn  
✅ Dễ mở rộng thêm loại mới  
✅ Không cần parse URL phức tạp  
✅ Validate dễ dàng hơn  

---

## 🎯 Cấu Trúc Mới

### Format Cũ (Hiện Tại)
```json
{
  "redirect_url": "app://post/123#comment-456"
}
```

### Format Mới (Đề Xuất)
```json
{
  "redirect_type": "post",
  "redirect_data": {
    "post_id": "123",
    "comment_id": "456"
  }
}

**Khi nào:** Khi có người like bài viết của bản thân (không phải tự like)

**Khi nào:** Khi có người comment bài viết của bản thân (không phải tự comment)

**Khi nào:** Khi có người phản hồi lại comment của bản thân (không phải tự comment)

**Khi nào:** Khi admin xử lý báo cáo vi phạm

**Khi nào:** Admin tạo thông báo thủ công qua API

**Khi nào:** User đạt được thành tích

**Khi nào:** User vi phạm

**Khi nào:** User được chấp nhận kiếu nại

**Khi nào:** User bị từ chối kiếu nại

**Khi nào:** User được xác nhận thanh toán và đăng kí gói thành công

**Khi nào:** User được xác nhận đồng ý yêu cầu hoàn tiền 

**Khi nào:** User bị từ chối yêu cầu hoàn tiền

**Khi nào:** User bị từ chối yêu cầu hoàn tiền

**Khi nào:** User gói của user hết hạn 

