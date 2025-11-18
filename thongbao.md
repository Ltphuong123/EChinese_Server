Các trường hợp bạn cần:

Giải pháp HOÀN CHỈNH (dựa trên DB hiện tại)

1.  Thêm bảng DeviceTokens (chỉ cần 1 lần)

dbml

Table DeviceTokens {

user_id uuid \[primary key\]

token text \[not null\]

platform varchar(20) \[not null, note: "ios \| android"\]

updated_at timestamptz \[default: `now()`\]

}

Lý do: Cần biết token FCM của từng user để gửi push.

2.  Tạo thông báo khi có sự kiện

Ví dụ: User A thích bài của User B

ts

await prisma.notifications.create({

data: {

    recipient_id: post.userId,        // gửi cho chủ bài

    audience: 'user',                 // gửi riêng

    type: 'community',

    title: 'Ai đó đã thích bài viết của bạn',

    content: { message: `${userA.name} đã thích bài "${post.title}"` },

    related_type: 'post',

    related_id: post.id,

    data: { liker_id: userA.id },

    redirect_url: `app://post/${post.id}`,

    is_push_sent: false,

    priority: 1

}

});

Ví dụ: User A bình luận bài của User B

ts

await prisma.notifications.create({

data: {

    recipient_id: post.userId,

    audience: 'user',

    type: 'community',

    title: 'Bình luận mới',

    content: { message: `${userA.name}: ${comment.content}` },

    related_type: 'comment',

    related_id: comment.id,

    redirect_url: `app://post/${post.id}#comment-${comment.id}`,

    priority: 1

}

});

"Xem" → không tạo thông báo → đúng yêu cầu.

3.  Admin gửi thông báo toàn bộ (Broadcast)

ts

await prisma.notifications.create({

data: {

    recipient_id: null,               // NULL = gửi tất cả

    audience: 'all',                  // broadcast

    type: 'system',

    title: 'Cập nhật từ Hán Tự',

    content: { message: 'HSK 3.0 đã có mặt!' },

    redirect_url: 'app://vocab/hsk3',

    from_system: true,

    priority: 2

}

});

4.  Tự động gửi PUSH + Realtime

Dùng Trigger PostgreSQL + FCM + WebSocket

Bước 1: Trigger tự động gửi FCM khi tạo thông báo

sql

CREATE OR REPLACE FUNCTION send_push_notification()

RETURNS TRIGGER AS \$\$

DECLARE

token_record RECORD;

payload JSON;

BEGIN

-- Chỉ gửi nếu chưa gửi push

IF NEW.is_push_sent = false THEN

    -- Lấy tất cả token (nếu broadcast) hoặc 1 user

    IF NEW.recipient_id IS NULL THEN

      FOR token_record IN SELECT token, platform FROM "DeviceTokens" LOOP

        PERFORM send_to_fcm(token_record.token, NEW.title, (NEW.content->>'message'), NEW.data);

      END LOOP;

    ELSE

      SELECT token INTO token_record FROM "DeviceTokens" WHERE user_id = NEW.recipient_id;

      IF FOUND THEN

        PERFORM send_to_fcm(token_record.token, NEW.title, (NEW.content->>'message'), NEW.data);

      END IF;

    END IF;



    -- Đánh dấu đã gửi

    UPDATE "Notifications" SET is_push_sent = true WHERE id = NEW.id;

END IF;

RETURN NEW;

END;

\$\$ LANGUAGE plpgsql;

-- Gắn trigger

CREATE TRIGGER trigger_send_push

AFTER INSERT ON "Notifications"

FOR EACH ROW

EXECUTE FUNCTION send_push_notification();

Hàm send_to_fcm() bạn viết bằng Node.js (gọi từ PostgreSQL qua extension
plv8 hoặc background job).

Bước 2: Background Job (Node.js) -- Gửi FCM

ts

// jobs/sendFCM.ts

import admin from 'firebase-admin';

export async function sendToFCM(token: string, title: string, body:
string, data: any) {

const message = {

    token,

    notification: { title, body },

    data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : {},

    apns: { payload: { aps: { sound: 'default' } } },

    android: { priority: 'high' }

};

try {

    await admin.messaging().send(message);

} catch (error) {

    console.error('FCM error:', error);

    // Xóa token lỗi

    if (error.code === 'messaging/registration-token-not-registered') {

      await prisma.deviceTokens.deleteMany({ where: { token } });

    }

}

}

Bước 3: Realtime khi user đang online (WebSocket)

ts

// server.ts (Socket.IO)

io.on('connection', (socket) =\> {

const userId = socket.handshake.auth.userId;

if (userId) socket.join(userId);

// Khi có thông báo mới → push realtime

socket.on('join_notifications', () =\> {

    socket.join(`notif_${userId}`);

});

});

// Khi tạo thông báo → emit realtime

if (notification.recipient_id) {

io.to(notification.recipient_id).emit('new_notification', notification);

} else {

io.emit('new_notification', notification); // broadcast

}

Bước 4: App React Native -- Nhận Push + Realtime

ts

// App.tsx

import messaging from '@react-native-firebase/messaging';

import { io } from 'socket.io-client';

const socket = io(API_URL, { auth: { userId } });

messaging().onMessage(async (remoteMessage) =\> {

showLocalNotification(remoteMessage);

});

socket.on('new_notification', (notif) =\> {

store.dispatch(addNotification(notif));

showLocalNotification(notif);

});

Tóm tắt luồng dữ liệu

Kết luận: DB của bạn ĐỦ + MẠNH

Bạn chỉ cần thêm:

Bảng DeviceTokens

FCM Service Account Key

Trigger PostgreSQL (hoặc background job)

Socket.IO server

App lưu token khi login

Mình gửi bạn:

File DBML đầy đủ (có DeviceTokens)

Trigger SQL

FCM + Socket.IO code

React Native nhận push

Gửi ngay trong 2 phút -- bạn muốn không? Chỉ cần nói: "Gửi ZIP" → mình
gửi liền!
