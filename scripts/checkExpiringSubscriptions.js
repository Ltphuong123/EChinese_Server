// file: scripts/checkExpiringSubscriptions.js
// Script để kiểm tra và xử lý các gói đăng ký hết hạn
// Có thể chạy bằng cron job: node scripts/checkExpiringSubscriptions.js

require('dotenv').config();
const userSubscriptionService = require('../services/userSubscriptionService');

async function main() {
  console.log('🔍 Starting subscription expiry check...');
  console.log('Time:', new Date().toISOString());
  
  try {
    const result = await userSubscriptionService.checkAndNotifyExpiringSubscriptions();
    
    console.log('\n📊 Results:');
    console.log(`   - Expired subscriptions processed: ${result.expiredCount}`);
    console.log(`   - Expiring soon notifications sent: ${result.expiringCount}`);
    console.log('\n✅ Check completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during subscription check:', error);
    process.exit(1);
  }
}

main();
