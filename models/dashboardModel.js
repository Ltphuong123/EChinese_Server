// file: models/dashboardModel.js

const db = require('../config/db');

const dashboardModel = {
  getRevenueStats: async () => {
    const queryText = `
      SELECT 
        (
          -- Subquery 1: Tính tổng doanh thu tháng này
          SELECT COALESCE(SUM(amount), 0) FROM "Payments"
          WHERE status IN ('successful', 'manual_confirmed') 
          AND date_trunc('month', transaction_date) = date_trunc('month', CURRENT_DATE)
        ) - (
          -- Subquery 2: Tính tổng hoàn tiền tháng này
          SELECT COALESCE(SUM(refund_amount), 0) FROM "Refunds"
          WHERE status = 'completed' 
          AND date_trunc('month', processed_at) = date_trunc('month', CURRENT_DATE)
        ) AS "revenueThisMonth",
        
        (
          -- Subquery 3: Tính tổng doanh thu năm này
          SELECT COALESCE(SUM(amount), 0) FROM "Payments"
          WHERE status IN ('successful', 'manual_confirmed') 
          AND date_trunc('year', transaction_date) = date_trunc('year', CURRENT_DATE)
        ) - (
          -- Subquery 4: Tính tổng hoàn tiền năm này
          SELECT COALESCE(SUM(refund_amount), 0) FROM "Refunds"
          WHERE status = 'completed' 
          AND date_trunc('year', processed_at) = date_trunc('year', CURRENT_DATE)
        ) AS "revenueThisYear";
    `;
    const result = await db.query(queryText);
    return result.rows[0];
  },


  /**
   * Đếm tổng số giao dịch theo từng trạng thái.
   */
  getTransactionCounts: async () => {
    const queryText = `
      SELECT
        COUNT(*) FILTER (WHERE status IN ('successful', 'manual_confirmed')) AS successful,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed
      FROM "Payments";
    `;
    const result = await db.query(queryText);
    // Chuyển đổi count từ string sang number
    const counts = result.rows[0];
    return {
      successful: parseInt(counts.successful, 10),
      pending: parseInt(counts.pending, 10),
      failed: parseInt(counts.failed, 10),
    };
  },
  
  /**
   * Đếm số lượng gói đăng ký đang hoạt động.
   */
  getActiveSubscriptionCount: async () => {
    const queryText = `SELECT COUNT(*) FROM "UserSubscriptions" WHERE is_active = true;`;
    const result = await db.query(queryText);
    return parseInt(result.rows[0].count, 10);
  },
  
  /**
   * Đếm số lượng yêu cầu hoàn tiền đang chờ.
   */
  getPendingRefundCount: async () => {
    const queryText = `SELECT COUNT(*) FROM "Refunds" WHERE status = 'pending';`;
    const result = await db.query(queryText);
    return parseInt(result.rows[0].count, 10);
  },

  /**
   * Lấy dữ liệu doanh thu ròng cho biểu đồ theo các khung thời gian.
   * @param {'day'|'week'|'month'} timeframe - Khung thời gian.
   */
  getChartData: async (timeframe) => {
    let interval, series_start, date_format, points;
    switch (timeframe) {
      case 'day': // 24 giờ qua
        interval = '1 hour';
        series_start = `NOW() - interval '23 hours'`;
        date_format = 'HH24'; // Giờ trong ngày
        points = 24;
        break;
      case 'week': // 7 ngày qua
        interval = '1 day';
        series_start = `NOW() - interval '6 days'`;
        date_format = 'DD/MM';
        points = 7;
        break;
      case 'month': // 30 ngày qua
        interval = '1 day';
        series_start = `NOW() - interval '29 days'`;
        date_format = 'DD/MM';
        points = 30;
        break;
      default:
        throw new Error('Invalid timeframe');
    }

    const queryText = `
      WITH time_series AS (
        SELECT generate_series(
          date_trunc('${timeframe === 'day' ? 'hour' : 'day'}', ${series_start}),
          NOW(),
          '${interval}'
        ) AS point
      ),
      payments_by_point AS (
        SELECT 
          date_trunc('${timeframe === 'day' ? 'hour' : 'day'}', transaction_date) as point,
          SUM(amount) as total_revenue
        FROM "Payments"
        WHERE status IN ('successful', 'manual_confirmed') AND transaction_date >= ${series_start}
        GROUP BY 1
      ),
      refunds_by_point AS (
        SELECT 
          date_trunc('${timeframe === 'day' ? 'hour' : 'day'}', processed_at) as point,
          SUM(refund_amount) as total_refund
        FROM "Refunds"
        WHERE status = 'completed' AND processed_at >= ${series_start}
        GROUP BY 1
      )
      SELECT 
        -- Định dạng nhãn (label)
        TO_CHAR(ts.point, '${date_format}' || (CASE WHEN '${timeframe}' = 'day' THEN 'h' ELSE '' END)) as label,
        -- Tính doanh thu ròng cho mỗi điểm
        COALESCE(p.total_revenue, 0) - COALESCE(r.total_refund, 0) as value
      FROM time_series ts
      LEFT JOIN payments_by_point p ON ts.point = p.point
      LEFT JOIN refunds_by_point r ON ts.point = r.point
      ORDER BY ts.point ASC;
    `;

    const result = await db.query(queryText);
    return result.rows;
  },






  getAnalytics: async () => {
    // Sử dụng Promise.all để chạy song song các truy vấn đếm
    const [
      revenueResult,
      activeUsersResult,
      reportsResult,
      postsResult,
      appealsResult,
      notificationsResult
    ] = await Promise.all([
      // Doanh thu tháng này (đã trừ hoàn tiền)
      db.query(`
        SELECT 
          (SELECT COALESCE(SUM(amount), 0) FROM "Payments" WHERE status IN ('successful', 'manual_confirmed') AND date_trunc('month', transaction_date) = date_trunc('month', CURRENT_DATE))
          -
          (SELECT COALESCE(SUM(refund_amount), 0) FROM "Refunds" WHERE status = 'completed' AND date_trunc('month', processed_at) = date_trunc('month', CURRENT_DATE))
        AS "monthlyRevenue";
      `),
      // Người dùng hoạt động (đăng nhập trong 7 ngày qua)
      db.query(`SELECT COUNT(DISTINCT user_id) FROM "UserSessions" WHERE login_at >= NOW() - interval '7 days';`),
      // Báo cáo chờ xử lý
      db.query(`SELECT COUNT(*) FROM "Reports" WHERE status = 'pending';`),
      // Bài viết mới hôm nay
      db.query(`SELECT COUNT(*) FROM "Posts" WHERE created_at >= CURRENT_DATE;`),
      // Khiếu nại chờ xử lý
      db.query(`SELECT COUNT(*) FROM "Appeals" WHERE status = 'pending';`),
      // Thông báo admin chưa đọc
      db.query(`SELECT COUNT(*) FROM "Notifications" WHERE audience = 'admin' AND read_at IS NULL;`)
    ]);

    return {
      monthlyRevenue: parseFloat(revenueResult.rows[0].monthlyRevenue) || 0,
      activeUsers: parseInt(activeUsersResult.rows[0].count, 10),
      pendingReports: parseInt(reportsResult.rows[0].count, 10),
      newPostsToday: parseInt(postsResult.rows[0].count, 10),
      pendingAppeals: parseInt(appealsResult.rows[0].count, 10),
      unreadAdminNotifications: parseInt(notificationsResult.rows[0].count, 10)
    };
  },

  // ============== Dành cho API Charts =================

  getChartData2: async (days) => {
    const query = `
      WITH time_series AS (
        SELECT generate_series(
          CURRENT_DATE - $1::int * interval '1 day',
          CURRENT_DATE,
          '1 day'
        )::date AS date
      )
      SELECT 
        ts.date::text,
        -- Doanh thu ròng theo ngày
        (
          SELECT COALESCE(SUM(p.amount), 0) FROM "Payments" p 
          WHERE p.status IN ('successful', 'manual_confirmed') AND p.transaction_date::date = ts.date
        ) - (
          SELECT COALESCE(SUM(r.refund_amount), 0) FROM "Refunds" r
          WHERE r.status = 'completed' AND r.processed_at::date = ts.date
        ) AS revenue,
        -- Báo cáo mới theo ngày
        (SELECT COUNT(*) FROM "Reports" WHERE created_at::date = ts.date) AS reports,
        -- Vi phạm mới theo ngày
        (SELECT COUNT(*) FROM "Violations" WHERE created_at::date = ts.date) AS violations,
        -- Người dùng mới theo ngày
        (SELECT COUNT(*) FROM "Users" WHERE created_at::date = ts.date) AS new_users
      FROM time_series ts
      ORDER BY ts.date ASC;
    `;
    const result = await db.query(query, [days - 1]);
    
    // Định dạng lại dữ liệu cho từng biểu đồ
    return {
      dailyRevenue: result.rows.map(r => ({ date: r.date, value: parseFloat(r.revenue) })),
      dailyReports: result.rows.map(r => ({ date: r.date, value: parseInt(r.reports, 10) })),
      dailyViolations: result.rows.map(r => ({ date: r.date, value: parseInt(r.violations, 10) })),
      dailyNewUsers: result.rows.map(r => ({ date: r.date, value: parseInt(r.new_users, 10) })),
    };
  },

  // ============== Dành cho API Community =================

  getCommunityData: async () => {
    const [
      topUsersResult,
      topTopicsResult,
      recentUsersResult,
      recentLogsResult
    ] = await Promise.all([
      // Top 5 users theo community_points
      db.query(`SELECT id, name, avatar_url, community_points FROM "Users" ORDER BY community_points DESC LIMIT 5;`),
      // Top 5 chủ đề theo số lượng bài viết
      db.query(`SELECT topic, COUNT(*) as post_count FROM "Posts" WHERE status = 'published' GROUP BY topic ORDER BY post_count DESC LIMIT 5;`),
      // 5 người dùng mới nhất
      db.query(`SELECT id, name, avatar_url, created_at FROM "Users" ORDER BY created_at DESC LIMIT 5;`),
      // 10 log admin gần nhất
      db.query(`
        SELECT al.id, al.action_type, al.description, al.created_at, u.name as admin_name
        FROM "AdminLogs" al
        LEFT JOIN "Users" u ON al.user_id = u.id
        ORDER BY al.created_at DESC LIMIT 10;
      `)
    ]);

    return {
      topUsers: topUsersResult.rows,
      topTopics: topTopicsResult.rows,
      recentUsers: recentUsersResult.rows,
      recentLogs: recentLogsResult.rows
    };
  },








};

module.exports = dashboardModel;