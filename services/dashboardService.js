// file: services/dashboardService.js

const dashboardModel = require('../models/dashboardModel');

const dashboardService = {
  getDashboardStats: async () => {
    // Tính toán các khoảng thời gian
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Sử dụng Promise.all để thực thi tất cả các truy vấn song song
    const [
      revenueThisMonth,
      revenueThisYear,
      transactions,
      activeSubscriptions,
      pendingRefunds,
      chartDataDay,
      chartDataWeek,
      chartDataMonth
    ] = await Promise.all([
      dashboardModel.getRevenueBetweenDates(startOfMonth, tomorrow),
      dashboardModel.getRevenueBetweenDates(startOfYear, tomorrow),
      dashboardModel.getTransactionCounts(),
      dashboardModel.getActiveSubscriptionCount(),
      dashboardModel.getPendingRefundCount(),
      dashboardModel.getRevenueChartData('day', 30), // 30 ngày gần nhất
      dashboardModel.getRevenueChartData('week', 12), // 12 tuần gần nhất
      dashboardModel.getRevenueChartData('month', 12) // 12 tháng gần nhất
    ]);

    return {
      revenueThisMonth,
      revenueThisYear,
      transactions,
      activeSubscriptions,
      pendingRefunds,
      chartData: {
        day: chartDataDay,
        week: chartDataWeek,
        month: chartDataMonth,
      },
    };
  }
};

module.exports = dashboardService;