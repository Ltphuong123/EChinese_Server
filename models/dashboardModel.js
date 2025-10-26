// file: models/dashboardModel.js

const db = require('../config/db');

const dashboardModel = {
  /**
   * Lấy tổng doanh thu trong một khoảng thời gian
   */
  getRevenueBetweenDates: async (startDate, endDate) => {
    const queryText = `
      SELECT COALESCE(SUM(amount), 0) as total_revenue
      FROM "Payments"
      WHERE (status = 'successful' OR status = 'manual_confirmed')
        AND transaction_date >= $1 AND transaction_date < $2;
    `;
    const result = await db.query(queryText, [startDate, endDate]);
    return parseFloat(result.rows[0].total_revenue);
  },

  /**
   * Đếm số lượng giao dịch theo từng trạng thái
   */
  getTransactionCounts: async () => {
    const queryText = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'successful' OR status = 'manual_confirmed') as successful,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
      FROM "Payments";
    `;
    const result = await db.query(queryText);
    // Chuyển đổi từ string sang number
    return {
        successful: parseInt(result.rows[0].successful, 10),
        pending: parseInt(result.rows[0].pending, 10),
        failed: parseInt(result.rows[0].failed, 10)
    };
  },

  /**
   * Đếm tổng số gói đăng ký đang hoạt động
   */
  getActiveSubscriptionCount: async () => {
    const queryText = `SELECT COUNT(*) FROM "UserSubscriptions" WHERE is_active = true;`;
    const result = await db.query(queryText);
    return parseInt(result.rows[0].count, 10);
  },
  
  /**
   * Đếm tổng số yêu cầu hoàn tiền đang chờ xử lý
   */
  getPendingRefundCount: async () => {
    const queryText = `SELECT COUNT(*) FROM "Refunds" WHERE status = 'pending';`;
    const result = await db.query(queryText);
    return parseInt(result.rows[0].count, 10);
  },
  
  /**
   * Lấy dữ liệu doanh thu cho biểu đồ theo khoảng thời gian và đơn vị (ngày, tuần, tháng)
   */
  getRevenueChartData: async (unit, intervals) => {
      const queryText = `
        SELECT
            date_trunc($1, transaction_date)::date as "period",
            COALESCE(SUM(amount), 0) as "revenue"
        FROM "Payments"
        WHERE (status = 'successful' OR status = 'manual_confirmed')
          AND transaction_date >= (CURRENT_DATE - $2::interval)
        GROUP BY "period"
        ORDER BY "period" ASC;
      `;
      const intervalStr = `${intervals} ${unit}s`; // Ví dụ: '30 days', '12 weeks'
      const result = await db.query(queryText, [unit, intervalStr]);
      
      // Chuyển đổi định dạng
      return result.rows.map(row => ({
          label: new Date(row.period).toLocaleDateString('vi-VN'), // Định dạng ngày Việt Nam
          value: parseFloat(row.revenue)
      }));
  }
};

module.exports = dashboardModel;