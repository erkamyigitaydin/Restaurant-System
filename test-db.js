const { connectDB } = require('./db');

async function testConnection() {
  try {
    const connected = await connectDB();
    if (connected) {
      console.log('MongoDB bağlantısı başarılı!');
    } else {
      console.log('MongoDB bağlantısı başarısız!');
    }
  } catch (error) {
    console.error('Test hatası:', error);
  } finally {
    process.exit();
  }
}

testConnection(); 