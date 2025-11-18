// file: config/firebase.js

const admin = require('firebase-admin');
require('dotenv').config();

let firebaseApp = null;

/**
 * Khởi tạo Firebase Admin SDK
 * Có 2 cách:
 * 1. Dùng Service Account JSON file (khuyến nghị cho production)
 * 2. Dùng environment variables (dễ deploy hơn)
 */
function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Cách 1: Dùng Service Account JSON file
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const serviceAccount = require(`../${process.env.FIREBASE_SERVICE_ACCOUNT_PATH}`);
      
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
      
      console.log('✅ Firebase initialized with Service Account file');
    }
    // Cách 2: Dùng environment variables
    else if (process.env.FIREBASE_PROJECT_ID) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
      
      console.log('✅ Firebase initialized with environment variables');
    }
    // Không có config Firebase
    else {
      console.warn('⚠️  Firebase not configured. Push notifications will be disabled.');
      console.warn('   Add FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_PROJECT_ID to .env');
      return null;
    }

    return firebaseApp;
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    return null;
  }
}

// Khởi tạo Firebase khi import module
const app = initializeFirebase();

// Export messaging instance
const messaging = app ? admin.messaging() : null;

module.exports = {
  admin,
  messaging,
  isFirebaseEnabled: () => !!messaging,
};
