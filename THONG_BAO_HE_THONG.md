DANH SÁCH CHI TIẾT CÁC THÔNG BÁO TRONG HỆ THỐNG
📋 MỤC LỤC
Thông báo Cộng đồng (Community)
Thông báo Vi phạm (Violation)
Thông báo Hệ thống (System)
Thông báo Thành tích (Achievement)
1. THÔNG BÁO CỘNG ĐỒNG (Community)
1.1. 💬 Bình luận Bài viết
📍 Vị trí: controllers/commentController.js (dòng 50-73)

⏰ Khi nào: Khi có người bình luận vào bài viết của bạn (không phải tự bình luận)

🔧 Cấu trúc:

{
  recipient_id: post.user_id,
  audience: 'user',
  type: 'community',
  title: '💬 Có người bình luận bài viết của bạn',
  content: {
    html: `<p><strong>${commenter?.name}</strong> đã bình luận vào bài viết <strong>"${post.title}"</strong> của bạn.</p>
<p><em>Nội dung bình luận:</em> "${commentPreview}..."</p>
<hr>
<p><small><strong>📌 Thông tin chi tiết:</strong></small></p>
<ul style="font-size: 0.9em;">
  <li><strong>Bài viết:</strong> ${post.title}</li>
  <li><strong>Người bình luận:</strong> ${commenter?.name}</li>
  <li><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</li>
</ul>`
  },
  redirect_type: 'post_comment',
  data: { id: newComment.id, type: 'comment' }
}
✅ Tác dụng: Thông báo cho chủ bài viết khi có người bình luận

💡 Ví dụ: User A đăng bài "Học tiếng Trung như thế nào?", User B bình luận → User A nhận thông báo

1.2. ↩️ Trả lời Bình luận
📍 Vị trí: controllers/commentController.js (dòng 89-110)

⏰ Khi nào: Khi có người trả lời bình luận của bạn

🔧 Cấu trúc:

{
  recipient_id: parentComment.user_id,
  audience: 'user',
  type: 'community',
  title: '↩️ Có người trả lời bình luận của bạn',
  content: {
    html: `<p><strong>${commenter?.name}</strong> đã trả lời bình luận của bạn.</p>
<p><em>Nội dung trả lời:</em> "${commentPreview}..."</p>
<hr>
<p><small><strong>📌 Thông tin chi tiết:</strong></small></p>
<ul style="font-size: 0.9em;">
  <li><strong>Người trả lời:</strong> ${commenter?.name}</li>
  <li><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</li>
</ul>`
  },
  redirect_type: 'post_comment',
  data: { id: newComment.id, type: 'comment' }
}
✅ Tác dụng: Thông báo cho người được reply

💡 Ví dụ: User A bình luận, User B reply → User A nhận thông báo

1.3. ✅ Khôi phục Bình luận
📍 Vị trí: controllers/commentController.js (dòng 263-283)

⏰ Khi nào: Khi admin khôi phục bình luận đã bị gỡ

🔧 Cấu trúc:

{
  recipient_id: comment.user_id,
  audience: 'user',
  type: 'community',
  title: '✅ Bình luận của bạn đã được khôi phục',
  content: {
    html: `<p>Bình luận của bạn đã được quản trị viên khôi phục.</p>
<p><strong>Lý do khôi phục:</strong> ${restoreReason}</p>
${violationsCleared > 0 ? `<p>✅ Đã xóa <strong>${violationsCleared}</strong> vi phạm liên quan.</p>` : ''}
<p><em>Nội dung bình luận:</em> "${commentPreview}..."</p>`
  },
  redirect_type: 'post_comment',
  data: { id: commentId, type: 'comment' }
}
✅ Tác dụng: Thông báo khi bình luận được khôi phục

💡 Ví dụ: Bình luận của User A bị gỡ nhầm, admin khôi phục → User A nhận thông báo

1.4. ❤️ Like Bài viết
📍 Vị trí: controllers/postController.js (dòng 740-762)

⏰ Khi nào: Khi có người thích bài viết của bạn

🔧 Cấu trúc:

{
  recipient_id: post.user_id,
  audience: 'user',
  type: 'community',
  title: '❤️ Có người thích bài viết của bạn',
  content: {
    html: `<p><strong>${likerName}</strong> đã thích bài viết <strong>"${post.title}"</strong> của bạn.</p>
<p>❤️ Tổng số lượt thích: <strong>${result.likes}</strong></p>`
  },
  redirect_type: 'post',
  data: { id: postId, type: 'post' }
}
✅ Tác dụng: Thông báo cho chủ bài viết khi có người like

💡 Ví dụ: User A đăng bài, User B like → User A nhận thông báo

1.5. ✅ Khôi phục Bài viết
📍 Vị trí: controllers/postController.js (dòng 627-649)

⏰ Khi nào: Khi admin khôi phục bài viết đã bị gỡ

🔧 Cấu trúc:

{
  recipient_id: existing.user_id,
  audience: 'user',
  type: 'community',
  title: '✅ Bài viết của bạn đã được khôi phục',
  content: {
    html: `<p>Bài viết <strong>"${existing.title}"</strong> của bạn đã được quản trị viên khôi phục.</p>
<p><strong>Lý do khôi phục:</strong> ${restoreReason}</p>
${violationsCleared > 0 ? `<p>✅ Đã xóa <strong>${violationsCleared}</strong> vi phạm liên quan.</p>` : ''}`
  },
  redirect_type: 'post',
  data: { id: postId, type: 'post' }
}
✅ Tác dụng: Thông báo khi bài viết được khôi phục

💡 Ví dụ: Bài viết của User A bị gỡ nhầm, admin khôi phục → User A nhận thông báo

2. THÔNG BÁO VI PHẠM (Violation)
2.1. ⚠️ Gỡ Bình luận do Vi phạm (Admin)
📍 Vị trí: controllers/commentController.js (dòng 348-377)

⏰ Khi nào: Khi admin gỡ bình luận do vi phạm quy tắc

🔧 Cấu trúc:

{
  recipient_id: removedComment.user_id,
  audience: 'user',
  type: 'violation',
  title: '⚠️ Bình luận của bạn đã bị gỡ do vi phạm',
  content: {
    html: `<p>Bình luận của bạn đã bị gỡ bởi quản trị viên.</p>
<p><strong>Lý do:</strong> ${reason}</p>
<p><strong>Độ nghiêm trọng:</strong> ${severity}</p>
<p><strong>Vi phạm:</strong> ${violatedRulesDetail.length} quy tắc cộng đồng</p>
${violatedRulesDetail.length > 0 ? `<p><strong>Các quy tắc bị vi phạm:</strong></p><ul>${rulesText}</ul>` : ''}`
  },
  redirect_type: 'post_comment',
  data: { id: commentId, type: 'comment_remove' }
}
✅ Tác dụng: Thông báo chi tiết vi phạm khi bình luận bị gỡ

💡 Ví dụ: User A bình luận nội dung không phù hợp, admin gỡ → User A nhận thông báo với lý do cụ thể

2.2. ⚠️ Gỡ Bài viết do Vi phạm (Admin)
📍 Vị trí: controllers/postController.js (dòng 569-590)

⏰ Khi nào: Khi admin gỡ bài viết do vi phạm

🔧 Cấu trúc:

{
  recipient_id: violationInput.userId,
  audience: 'user',
  type: 'violation',
  title: '⚠️ Bài viết của bạn đã bị gỡ do vi phạm',
  content: {
    html: `<p>Bài viết <strong>"${existing.title}"</strong> của bạn đã bị gỡ bởi quản trị viên.</p>
<p><strong>Lý do:</strong> ${violation.reason}</p>
<p><strong>Độ nghiêm trọng:</strong> ${violationInput.severity}</p>
<p><strong>Vi phạm:</strong> ${violatedRulesDetail.length} quy tắc cộng đồng</p>`
  },
  redirect_type: 'post',
  data: { id: postId, type: 'post_remove' }
}
✅ Tác dụng: Thông báo chi tiết khi bài viết bị gỡ

💡 Ví dụ: User A đăng bài vi phạm, admin gỡ → User A nhận thông báo với các quy tắc bị vi phạm

2.3. 🤖 Gỡ Bài viết Tự động (AI)
📍 Vị trí: services/autoModerationService.js (dòng 196-218)

⏰ Khi nào: Khi AI tự động phát hiện và gỡ bài viết vi phạm

🔧 Cấu trúc:

{
  recipient_id: postData.user_id,
  audience: 'user',
  type: 'violation',
  title: '🤖 Bài viết của bạn đã bị gỡ tự động',
  content: {
    html: `<p>Bài viết <strong>"${postData.title}"</strong> của bạn đã bị hệ thống AI tự động phát hiện và gỡ bỏ.</p>
<p><strong>Lý do:</strong> ${removalReason}</p>
<p><strong>Độ nghiêm trọng:</strong> ${severity}</p>
<p><strong>Phát hiện bởi:</strong> AI tự động</p>
<p><strong>Chi tiết phát hiện:</strong></p>
<ul>${violations.map(v => `<li>Loại: ${v.type}, Nhãn: ${v.label}, Độ tin cậy: ${(v.confidence * 100).toFixed(1)}%</li>`).join('')}</ul>`
  },
  redirect_type: 'post',
  data: { id: postId, type: 'post_remove' }
}
✅ Tác dụng: Thông báo tự động với chi tiết phát hiện của AI

💡 Ví dụ: User A đăng bài có nội dung nhạy cảm, AI tự động gỡ → User A nhận thông báo với độ tin cậy phát hiện

2.4. 🤖 Gỡ Bình luận Tự động (AI)
📍 Vị trí: services/autoModerationService.js (dòng 325-347)

⏰ Khi nào: Khi AI tự động phát hiện bình luận vi phạm

🔧 Cấu trúc:

{
  recipient_id: commentData.user_id,
  audience: 'user',
  type: 'violation',
  title: '🤖 Bình luận của bạn đã bị gỡ tự động',
  content: {
    html: `<p>Bình luận của bạn đã bị hệ thống AI tự động phát hiện và gỡ bỏ.</p>
<p><strong>Lý do:</strong> ${removalReason}</p>
<p><strong>Chi tiết phát hiện:</strong></p>
<ul>${violations.map(v => `<li>Loại: ${v.type}, Nhãn: ${v.label}, Độ tin cậy: ${(v.confidence * 100).toFixed(1)}%</li>`).join('')}</ul>`
  },
  redirect_type: 'post_comment',
  data: { id: commentId, type: 'comment_remove' }
}
✅ Tác dụng: Thông báo tự động khi AI phát hiện bình luận vi phạm

💡 Ví dụ: User A bình luận từ ngữ không phù hợp, AI tự động gỡ → User A nhận thông báo

2.5. 🗑️ Gỡ Nội dung do Báo cáo
📍 Vị trí: services/moderationService.js (dòng 129-151)

⏰ Khi nào: Khi admin xử lý báo cáo và gỡ nội dung

🔧 Cấu trúc:

{
  recipient_id: report.target_user_id,
  audience: 'user',
  type: 'violation',
  title: `🗑️ ${contentType} của bạn đã bị gỡ`,
  content: { 
    html: `<p>${contentType} của bạn đã bị quản trị viên gỡ bỏ do vi phạm quy định cộng đồng.</p>
<p><strong>Lý do:</strong> ${resolutionReason}</p>
<p><strong>Mã báo cáo:</strong> ${report.id}</p>`
  },
  redirect_type: 'community_rules',
  data: { id: report.target_id, type: removeType }
}
✅ Tác dụng: Thông báo khi nội dung bị gỡ do có người báo cáo

💡 Ví dụ: User B báo cáo bài viết của User A, admin xác nhận → User A nhận thông báo

3. THÔNG BÁO HỆ THỐNG (System)
3.1. 🛒 Đơn hàng Đã tạo
📍 Vị trí: services/paymentService.js (dòng 52-74)

⏰ Khi nào: Khi user tạo yêu cầu thanh toán

🔧 Cấu trúc:

{
  recipient_id: userId,
  audience: 'user',
  type: 'system',
  title: '🛒 Đơn hàng đã được tạo',
  content: {
    html: `<p>Đơn hàng của bạn đã được tạo thành công.</p>
<p><strong>Gói:</strong> ${subscription.name}</p>
<p><strong>Giá:</strong> ${subscription.price.toLocaleString('vi-VN')} VNĐ</p>
<p><strong>Thông tin chuyển khoản:</strong></p>
<ul>
  <li>Ngân hàng: ${bankInfo.bank_name}</li>
  <li>Số tài khoản: ${bankInfo.account_number}</li>
</ul>`
  },
  redirect_type: 'subscription',
  data: { id: newPayment.id, type: 'payment' }
}
✅ Tác dụng: Hướng dẫn thanh toán cho user

💡 Ví dụ: User A mua gói Premium → nhận thông tin chuyển khoản

3.2. ✅ Thanh toán Thành công
📍 Vị trí: services/paymentService.js (dòng 160-182)

⏰ Khi nào: Khi admin xác nhận thanh toán

🔧 Cấu trúc:

{
  recipient_id: updatedPayment.user_id,
  audience: 'user',
  type: 'system',
  title: '✅ Thanh toán thành công',
  content: {
    html: `<p>Thanh toán cho đơn hàng của bạn đã thành công!</p>
<p><strong>Gói:</strong> ${subscription?.name}</p>
<p><strong>Số tiền:</strong> ${updatedPayment.amount.toLocaleString('vi-VN')} VNĐ</p>
<p><strong>Thời hạn:</strong> ${subscription?.duration_days} ngày</p>`
  },
  redirect_type: 'subscription',
  data: { id: updatedPayment.id, type: 'payment' }
}
✅ Tác dụng: Xác nhận thanh toán thành công

💡 Ví dụ: User A chuyển khoản, admin xác nhận → User A nhận thông báo kích hoạt gói

3.3. ❌ Thanh toán Thất bại
📍 Vị trí: services/paymentService.js (dòng 180-202)

⏰ Khi nào: Khi thanh toán bị từ chối

🔧 Cấu trúc:

{
  recipient_id: updatedPayment.user_id,
  audience: 'user',
  type: 'system',
  title: '❌ Thanh toán thất bại',
  content: {
    html: `<p>Thanh toán cho đơn hàng của bạn đã thất bại.</p>
<p><strong>Lý do:</strong> Thanh toán bị từ chối</p>`
  },
  redirect_type: 'subscription',
  data: { id: updatedPayment.id, type: 'payment_failed' }
}
✅ Tác dụng: Thông báo thanh toán thất bại

💡 Ví dụ: Thanh toán của User A bị từ chối → User A nhận thông báo

3.4. 📝 Yêu cầu Hoàn tiền Đã gửi
📍 Vị trí: services/refundService.js (dòng 54-76)

⏰ Khi nào: Khi user gửi yêu cầu hoàn tiền

🔧 Cấu trúc:

{
  recipient_id: userId,
  audience: 'user',
  type: 'system',
  title: '📝 Yêu cầu hoàn tiền đã được gửi',
  content: {
    html: `<p>Yêu cầu hoàn tiền cho gói <strong>"${subscription?.name}"</strong> đã được gửi.</p>
<p><strong>Số tiền:</strong> ${payment.amount.toLocaleString('vi-VN')} VNĐ</p>
<p><strong>Trạng thái:</strong> Đang xử lý</p>
<p><strong>Thời gian xử lý:</strong> 3-5 ngày làm việc</p>`
  },
  redirect_type: 'subscription',
  data: { id: refundRequest.id, type: 'refund' }
}
✅ Tác dụng: Xác nhận đã nhận yêu cầu hoàn tiền

💡 Ví dụ: User A yêu cầu hoàn tiền → nhận thông báo xác nhận

3.5. ✅ Hoàn tiền Được chấp nhận
📍 Vị trí: services/refundService.js (dòng 180-202)

⏰ Khi nào: Khi admin chấp nhận hoàn tiền

🔧 Cấu trúc:

{
  recipient_id: refundRequest.user_id,
  audience: 'user',
  type: 'system',
  title: '✅ Yêu cầu hoàn tiền đã được chấp nhận',
  content: { 
    html: `<p>Yêu cầu hoàn tiền đã được chấp nhận.</p>
<p><strong>Số tiền:</strong> ${amount.toLocaleString('vi-VN')} VNĐ</p>
<p><strong>Phương thức:</strong> ${method}</p>
<p><strong>Hoàn tiền trong:</strong> 5-7 ngày làm việc</p>`
  },
  redirect_type: 'subscription',
  data: { id: refundId, type: 'refund' }
}
✅ Tác dụng: Thông báo hoàn tiền được chấp nhận

💡 Ví dụ: Admin chấp nhận hoàn tiền cho User A → User A nhận thông báo

3.6. ❌ Hoàn tiền Bị từ chối
📍 Vị trí: services/refundService.js (dòng 198-220)

⏰ Khi nào: Khi admin từ chối hoàn tiền

🔧 Cấu trúc:

{
  recipient_id: refundRequest.user_id,
  audience: 'user',
  type: 'system',
  title: '❌ Yêu cầu hoàn tiền bị từ chối',
  content: { 
    html: `<p>Yêu cầu hoàn tiền đã bị từ chối.</p>
<p><strong>Lý do:</strong> ${notes || 'Không đủ điều kiện hoàn tiền'}</p>`
  },
  redirect_type: 'subscription',
  data: { id: refundId, type: 'refund_rejected' }
}
✅ Tác dụng: Thông báo hoàn tiền bị từ chối với lý do

💡 Ví dụ: Admin từ chối hoàn tiền → User A nhận thông báo với lý do

3.7. ⚠️ Gói đăng ký Sắp hết hạn
📍 Vị trí: services/userSubscriptionService.js (dòng 582-604)

⏰ Khi nào: Gói còn 1-3 ngày hết hạn (cron job)

🔧 Cấu trúc:

{
  recipient_id: sub.user_id,
  audience: 'user',
  type: 'system',
  title: '⚠️ Gói đăng ký sắp hết hạn',
  content: {
    html: `<p>Gói đăng ký <strong>"${sub.subscription_name}"</strong> sắp hết hạn.</p>
<p><strong>Còn lại:</strong> ${daysUntilExpiry} ngày</p>
<p><strong>Tự động gia hạn:</strong> ${sub.auto_renew ? 'Có' : 'Không'}</p>`
  },
  redirect_type: 'subscription',
  data: { id: sub.subscription_id, type: 'subscription' }
}
✅ Tác dụng: Nhắc nhở user gia hạn gói

💡 Ví dụ: Gói Premium của User A còn 2 ngày → nhận thông báo nhắc gia hạn

3.8. ⏰ Gói đăng ký Đã hết hạn
📍 Vị trí: services/userSubscriptionService.js (dòng 555-577)

⏰ Khi nào: Khi gói hết hạn (cron job)

🔧 Cấu trúc:

{
  recipient_id: sub.user_id,
  audience: 'user',
  type: 'system',
  title: '⏰ Gói đăng ký đã hết hạn',
  content: {
    html: `<p>Gói đăng ký <strong>"${sub.subscription_name}"</strong> đã hết hạn.</p>
<p>Bạn đã được tự động chuyển về <strong>gói Miễn phí</strong>.</p>`
  },
  redirect_type: 'subscription',
  data: { id: sub.subscription_id, type: 'subscription_expired' }
}
✅ Tác dụng: Thông báo gói hết hạn và chuyển về Free

💡 Ví dụ: Gói Premium hết hạn → User A nhận thông báo và chuyển về Free

4. THÔNG BÁO THÀNH TÍCH (Achievement)
4.1. 🏆 Đạt Thành tích Mới
📍 Vị trí: services/achievementService.js (dòng 200-222)

⏰ Khi nào: Khi user đạt thành tích mới

🔧 Cấu trúc:

{
  recipient_id: userId,
  audience: 'user',
  type: 'achievement',
  title: '🏆 Chúc mừng! Bạn đã đạt thành tích mới',
  content: { 
    html: `<p>Chúc mừng! Bạn đã đạt thành tích <strong>"${achievement.name}"</strong>!</p>
<p><em>${achievement.description}</em></p>
<p><strong>Phần thưởng:</strong> +${achievement.points} điểm cộng đồng</p>
<p><strong>Tiến độ:</strong> ${currentValue}/${requiredValue}</p>`
  },
  redirect_type: 'achievement',
  data: { id: achievement.id, type: 'achievement' }
}
✅ Tác dụng: Thông báo khi đạt thành tích

💡 Ví dụ: User A đăng 10 bài viết → đạt thành tích "Người đóng góp" → nhận thông báo

4.2. 🎖️ Nhận Huy hiệu Mới
📍 Vị trí: models/userModel.js (dòng 479-500)

⏰ Khi nào: Khi đạt đủ điểm lên huy hiệu mới

🔧 Cấu trúc:

{
  recipient_id: userId,
  audience: 'user',
  type: 'system',
  title: '🎖️ Bạn đã nhận huy hiệu mới!',
  content: `Chúc mừng! Bạn đã đạt huy hiệu "${badge.name}" (Level ${badge.level}). Điểm cộng đồng: ${updatedUser.community_points}/${badge.min_points}.`,
  redirect_type: 'profile',
  data: { id: userId }
}
✅ Tác dụng: Thông báo khi lên huy hiệu mới

💡 Ví dụ: User A đạt 1000 điểm → lên huy hiệu "Chuyên gia" → nhận thông báo