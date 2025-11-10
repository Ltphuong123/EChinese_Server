// file: services/dashboardService.js

const dashboardModel = require('../models/dashboardModel');

const dashboardService = {
  getDashboardStats: async () => {
    // Sử dụng Promise.all để chạy tất cả các truy vấn tổng hợp song song
    const [
      revenueStats,
      transactionCounts,
      activeSubscriptions,
      pendingRefunds,
      chartDataDay,
      chartDataWeek,
      chartDataMonth,
    ] = await Promise.all([
      dashboardModel.getRevenueStats(),
      dashboardModel.getTransactionCounts(),
      dashboardModel.getActiveSubscriptionCount(), // Tách ra để rõ ràng
      dashboardModel.getPendingRefundCount(), // Tách ra để rõ ràng
      dashboardModel.getChartData('day'),
      dashboardModel.getChartData('week'),
      dashboardModel.getChartData('month'),
    ]);

    return {
      revenueThisMonth: revenueStats.revenueThisMonth || 0,
      revenueThisYear: revenueStats.revenueThisYear || 0,
      transactions: transactionCounts,
      activeSubscriptions: activeSubscriptions,
      pendingRefunds: pendingRefunds,
      chartData: {
        day: chartDataDay,
        week: chartDataWeek,
        month: chartDataMonth,
      },
    };
  },




  getAnalytics: async () => {
    return await dashboardModel.getAnalytics();
  },

  getChartData: async (days) => {
    return await dashboardModel.getChartData2(days);
  },

  getCommunityData: async () => {
    return await dashboardModel.getCommunityData();
  }




};

module.exports = dashboardService;