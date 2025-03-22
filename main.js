const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { connectDB, Table, MenuItem, Reservation, Order, Bill } = require('./db');
const mongoose = require('mongoose');

// Yerel veri depolama oluştur (yedek olarak kalacak)
const Store = require('electron-store');
const store = new Store();

let mainWindow;

function createWindow() {
  // Ana pencereyi oluştur
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Ana HTML dosyasını yükle
  mainWindow.loadFile('index.html');

  // Geliştirici araçlarını aç (geliştirme modunda)
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Pencere kapatıldığında yapılacaklar
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Menü oluştur
  const template = [
    {
      label: 'Dosya',
      submenu: [
        {
          label: 'Çıkış',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Görünüm',
      submenu: [
        {
          label: 'Yenile',
          click: () => {
            mainWindow.reload();
          }
        },
        {
          label: 'Geliştirici Araçları',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Electron hazır olduğunda pencereyi oluştur ve veritabanına bağlan
app.whenReady().then(async () => {
  try {
    await connectDB();
    createWindow();
    console.log("Uygulama ve veritabanı başarıyla başlatıldı");
  } catch (error) {
    console.error("Başlatma hatası:", error);
  }
});

// Tüm pencereler kapatıldığında uygulamadan çık (Windows & Linux)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// MacOS'ta dock'a tıklandığında pencere yoksa yeniden oluştur
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// MongoDB IPC İletişimleri

// Veritabanı bağlantı kontrolü
ipcMain.on('check-database-connection', async (event) => {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    event.reply('database-connection-status', { 
      connected: isConnected,
      error: isConnected ? null : 'Veritabanına bağlantı kurulamadı' 
    });
  } catch (error) {
    console.error('Veritabanı bağlantı kontrolü hatası:', error);
    event.reply('database-connection-status', { 
      connected: false, 
      error: error.message 
    });
  }
});

// Dashboard bilgilerini getir
ipcMain.on('get-dashboard-info', async (event) => {
  try {
    // Aktif masa sayısı
    const activeTables = await Table.countDocuments({
      status: { $in: ['occupied', 'reserved'] }
    });
    
    // Bekleyen sipariş sayısı
    const pendingOrders = await Order.countDocuments({
      status: { $in: ['pending', 'preparing'] }
    });
    
    event.reply('dashboard-info', {
      activeTables,
      pendingOrders
    });
  } catch (error) {
    console.error('Dashboard bilgilerini alma hatası:', error);
    event.reply('dashboard-info', {
      activeTables: 0,
      pendingOrders: 0
    });
  }
});

// Masaları getir
ipcMain.on('get-tables', async (event) => {
  try {
    const tables = await Table.find({}).lean().sort({ name: 1 });
    
    // ID'leri string'e dönüştür
    const processedTables = tables.map(table => {
      if (table._id) {
        table._id = table._id.toString();
      }
      return table;
    });
    
    console.log("Masa sayısı:", processedTables.length);
    event.reply('tables-data', processedTables);
  } catch (error) {
    console.error('Masaları alma hatası:', error);
    event.reply('tables-data', []);
  }
});

// Masa kaydet/güncelle
ipcMain.on('save-table', async (event, tableData) => {
  try {
    let table;
    if (tableData._id) {
      // Varolan masayı güncelle
      table = await Table.findByIdAndUpdate(
        tableData._id,
        tableData,
        { new: true }
      );
    } else {
      // Yeni masa oluştur
      table = new Table(tableData);
      await table.save();
    }
    event.reply('save-table-result', { success: true, table });
  } catch (error) {
    console.error('Masa kaydetme hatası:', error);
    event.reply('save-table-result', { success: false, error: error.message });
  }
});

// Masa sil
ipcMain.on('delete-table', async (event, tableId) => {
  try {
    console.log("Main process - Silinecek masa ID:", tableId, "Tip:", typeof tableId);
    
    // ObjectId olduğunu kontrol et
    if (!mongoose.Types.ObjectId.isValid(tableId)) {
      throw new Error('Geçersiz masa ID formatı');
    }
    
    // String ID'yi ObjectId'ye dönüştür
    const objectId = new mongoose.Types.ObjectId(tableId);
    console.log("Dönüştürülen ObjectId:", objectId);
    
    const result = await Table.findByIdAndDelete(objectId);
    console.log("Silme sonucu:", result);
    
    if (!result) {
      throw new Error('Masa bulunamadı');
    }
    
    event.reply('delete-table-result', { success: true });
  } catch (error) {
    console.error('Masa silme hatası:', error);
    event.reply('delete-table-result', { success: false, error: error.message });
  }
});

// Menü öğelerini getir
ipcMain.on('get-menu', async (event) => {
  try {
    const menuItems = await MenuItem.find({}).lean().sort({ category: 1, name: 1 });
    
    // ID'leri string'e dönüştür
    const processedMenuItems = menuItems.map(item => {
      if (item._id) {
        item._id = item._id.toString();
      }
      return item;
    });
    
    console.log("Menü öğesi sayısı:", processedMenuItems.length);
    event.reply('menu-data', processedMenuItems);
  } catch (error) {
    console.error('Menü öğelerini alma hatası:', error);
    event.reply('menu-data', []);
  }
});

// Menü öğesi kaydet/güncelle
ipcMain.on('save-menu-item', async (event, menuItemData) => {
  try {
    let menuItem;
    if (menuItemData._id) {
      // Varolan öğeyi güncelle
      menuItem = await MenuItem.findByIdAndUpdate(
        menuItemData._id,
        menuItemData,
        { new: true }
      );
    } else {
      // Yeni öğe oluştur
      menuItem = new MenuItem(menuItemData);
      await menuItem.save();
    }
    event.reply('save-menu-item-result', { success: true, menuItem });
  } catch (error) {
    console.error('Menü öğesi kaydetme hatası:', error);
    event.reply('save-menu-item-result', { success: false, error: error.message });
  }
});

// Menü öğesi sil
ipcMain.on('delete-menu-item', async (event, menuItemId) => {
  try {
    console.log("Main process - Silinecek menü öğesi ID:", menuItemId, "Tip:", typeof menuItemId);
    
    // ObjectId olduğunu kontrol et
    if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
      throw new Error('Geçersiz menü öğesi ID formatı');
    }
    
    // String ID'yi ObjectId'ye dönüştür
    const objectId = new mongoose.Types.ObjectId(menuItemId);
    console.log("Dönüştürülen ObjectId:", objectId);
    
    const result = await MenuItem.findByIdAndDelete(objectId);
    console.log("Silme sonucu:", result);
    
    if (!result) {
      throw new Error('Menü öğesi bulunamadı');
    }
    
    event.reply('delete-menu-item-result', { success: true });
  } catch (error) {
    console.error('Menü öğesi silme hatası:', error);
    event.reply('delete-menu-item-result', { success: false, error: error.message });
  }
});

// Rezervasyonları getir
ipcMain.on('get-reservations', async (event) => {
  try {
    const reservations = await Reservation.find({})
      .populate('tableId')
      .lean()
      .sort({ date: 1, time: 1 });
      
    // ID'leri string'e dönüştür
    const processedReservations = reservations.map(reservation => {
      // Ana ID'yi string'e çevir
      if (reservation._id) {
        reservation._id = reservation._id.toString();
      }
      
      // İlişkili tabloları string'e çevir
      if (reservation.tableId && typeof reservation.tableId === 'object') {
        if (reservation.tableId._id) {
          reservation.tableId._id = reservation.tableId._id.toString();
        }
      }
      
      return reservation;
    });
    
    console.log("Rezervasyon sayısı:", processedReservations.length);
    event.reply('reservations-data', processedReservations);
  } catch (error) {
    console.error('Rezervasyonları alma hatası:', error);
    event.reply('reservations-data', []);
  }
});

// Rezervasyon kaydet/güncelle
ipcMain.on('save-reservation', async (event, reservationData) => {
  try {
    console.log("Alınan rezervasyon verisi:", reservationData);
    
    // Masa ID kontrolü
    if (!mongoose.Types.ObjectId.isValid(reservationData.tableId)) {
      throw new Error('Geçersiz masa ID formatı');
    }
    
    let reservation;
    if (reservationData._id) {
      // Varolan rezervasyonu güncelle
      reservation = await Reservation.findByIdAndUpdate(
        reservationData._id,
        reservationData,
        { new: true }
      );
    } else {
      // Yeni rezervasyon oluştur
      reservation = new Reservation(reservationData);
      await reservation.save();
      
      // Masanın durumunu güncelle
      await Table.findByIdAndUpdate(
        reservationData.tableId,
        { status: 'reserved' }
      );
    }
    
    // ID'yi string'e dönüştür
    const response = {
      success: true,
      reservation: {
        ...reservation.toObject(),
        _id: reservation._id.toString()
      },
      message: 'Rezervasyon başarıyla kaydedildi'
    };
    
    console.log("Rezervasyon başarıyla kaydedildi:", response);
    event.reply('save-reservation-result', response);
  } catch (error) {
    console.error('Rezervasyon kaydetme hatası:', error);
    event.reply('save-reservation-result', { 
      success: false, 
      error: error.message,
      message: 'Rezervasyon kaydedilirken bir hata oluştu' 
    });
  }
});

// Siparişleri getir
ipcMain.on('get-orders', async (event) => {
  try {
    // Tamamlanan (completed) ve iptal edilen (cancelled) siparişleri hariç tut
    const orders = await Order.find({
      status: { $nin: ['completed', 'cancelled'] }
    })
      .populate('tableId')
      .lean()
      .sort({ createdAt: -1 });
      
    // ID'leri string'e dönüştür
    const processedOrders = orders.map(order => {
      // Ana ID'yi string'e çevir
      if (order._id) {
        order._id = order._id.toString();
      }
      
      // İlişkili tabloları string'e çevir
      if (order.tableId && typeof order.tableId === 'object') {
        if (order.tableId._id) {
          order.tableId._id = order.tableId._id.toString();
        }
      }
      
      // Sipariş öğelerinin ID'lerini çevir
      if (order.items && Array.isArray(order.items)) {
        order.items = order.items.map(item => {
          if (item._id) {
            item._id = item._id.toString();
          }
          if (item.menuItemId && typeof item.menuItemId === 'object') {
            item.menuItemId = item.menuItemId.toString();
          }
          return item;
        });
      }
      
      return order;
    });
    
    console.log("Aktif sipariş sayısı:", processedOrders.length);
    event.reply('orders-data', processedOrders);
  } catch (error) {
    console.error('Siparişleri alma hatası:', error);
    event.reply('orders-data', []);
  }
});

// Sipariş kaydet/güncelle
ipcMain.on('save-order', async (event, orderData) => {
  try {
    console.log("Alınan sipariş verisi:", orderData);
    
    // Masa ID kontrolü
    if (!mongoose.Types.ObjectId.isValid(orderData.tableId)) {
      throw new Error(`Geçersiz masa ID formatı: ${orderData.tableId}`);
    }
    
    // Menü öğesi ID'lerini kontrol et
    for (const item of orderData.items) {
      if (!mongoose.Types.ObjectId.isValid(item.menuItemId)) {
        throw new Error(`Geçersiz menü öğesi ID formatı: ${item.menuItemId}`);
      }
    }
    
    let order;
    if (orderData._id) {
      // ID kontrolü
      if (!mongoose.Types.ObjectId.isValid(orderData._id)) {
        throw new Error(`Geçersiz sipariş ID formatı: ${orderData._id}`);
      }
      
      // Varolan siparişi güncelle
      order = await Order.findByIdAndUpdate(
        orderData._id,
        orderData,
        { new: true }
      );
      
      if (!order) {
        throw new Error(`Sipariş bulunamadı: ${orderData._id}`);
      }
    } else {
      // Yeni sipariş oluştur
      order = new Order(orderData);
      await order.save();
      
      // Masa durumunu güncelle
      await Table.findByIdAndUpdate(
        orderData.tableId,
        { status: 'occupied' }
      );
    }
    
    // Yanıtı hazırla
    const processedOrder = {
      ...order.toObject(),
      _id: order._id.toString(),
      tableId: typeof order.tableId === 'object' ? 
        order.tableId.toString() : order.tableId
    };
    
    // Öğeleri işle
    if (processedOrder.items && Array.isArray(processedOrder.items)) {
      processedOrder.items = processedOrder.items.map(item => {
        return {
          ...item,
          _id: item._id ? item._id.toString() : null,
          menuItemId: item.menuItemId ? 
            (typeof item.menuItemId === 'object' ? 
              item.menuItemId.toString() : item.menuItemId) : null
        };
      });
    }
    
    console.log("Sipariş başarıyla kaydedildi:", processedOrder);
    event.reply('save-order-result', { 
      success: true, 
      order: processedOrder,
      message: 'Sipariş başarıyla kaydedildi'
    });
  } catch (error) {
    console.error('Sipariş kaydetme hatası:', error);
    event.reply('save-order-result', { 
      success: false, 
      error: error.message,
      message: 'Sipariş kaydedilirken bir hata oluştu'
    });
  }
});

// Faturaları getir
ipcMain.on('get-bills', async (event) => {
  try {
    const bills = await Bill.find({})
      .populate('tableId')
      .populate('orderId')
      .lean()
      .sort({ createdAt: -1 });
      
    // ID'leri string'e dönüştür
    const processedBills = bills.map(bill => {
      // Ana ID'yi string'e çevir
      if (bill._id) {
        bill._id = bill._id.toString();
      }
      
      // İlişkili tabloları string'e çevir
      if (bill.tableId && typeof bill.tableId === 'object') {
        if (bill.tableId._id) {
          bill.tableId._id = bill.tableId._id.toString();
        }
      }
      
      if (bill.orderId && typeof bill.orderId === 'object') {
        if (bill.orderId._id) {
          bill.orderId._id = bill.orderId._id.toString();
        }
      }
      
      // Öğeleri işle
      if (bill.items && Array.isArray(bill.items)) {
        bill.items = bill.items.map(item => {
          if (item._id) {
            item._id = item._id.toString();
          }
          if (item.menuItemId && typeof item.menuItemId === 'object') {
            item.menuItemId = item.menuItemId.toString();
          }
          return item;
        });
      }
      
      return bill;
    });
    
    console.log("Fatura sayısı:", processedBills.length);
    event.reply('bills-data', processedBills);
  } catch (error) {
    console.error('Faturaları alma hatası:', error);
    event.reply('bills-data', []);
  }
});

// Fatura oluştur
ipcMain.on('save-bill', async (event, billData) => {
  try {
    console.log("Alınan fatura verisi:", billData);
    
    // TableId kontrolü
    if (!mongoose.Types.ObjectId.isValid(billData.tableId)) {
      throw new Error(`Geçersiz masa ID formatı: ${billData.tableId}`);
    }
    
    // OrderId kontrolü (eğer varsa)
    if (billData.orderId && billData.orderId !== null) {
      if (!mongoose.Types.ObjectId.isValid(billData.orderId)) {
        throw new Error(`Geçersiz sipariş ID formatı: ${billData.orderId}`);
      }
    }
    
    // Yeni fatura oluştur
    const bill = new Bill(billData);
    await bill.save();
    
    // Eğer belirtilmiş bir sipariş varsa, o siparişi tamamlandı olarak işaretle
    if (billData.orderId && billData.orderId !== null) {
      await Order.findByIdAndUpdate(
        billData.orderId,
        { status: 'completed' }
      );
    } else {
      // Belirli bir sipariş belirtilmemişse, masaya ait tüm aktif siparişleri tamamlandı olarak işaretle
      await Order.updateMany(
        {
          tableId: new mongoose.Types.ObjectId(billData.tableId),
          status: { $nin: ['completed', 'cancelled'] }
        },
        { status: 'completed' }
      );
    }
    
    // Masayı boşalt
    await Table.findByIdAndUpdate(
      billData.tableId,
      { status: 'available' }
    );
    
    // Yanıtı hazırla
    const processedBill = {
      ...bill.toObject(),
      _id: bill._id.toString(),
      tableId: typeof bill.tableId === 'object' ? bill.tableId.toString() : bill.tableId,
      orderId: bill.orderId ? 
        (typeof bill.orderId === 'object' ? bill.orderId.toString() : bill.orderId) : null
    };
    
    console.log("Fatura başarıyla kaydedildi:", processedBill);
    event.reply('save-bill-result', { 
      success: true, 
      bill: processedBill,
      message: 'Fatura başarıyla kaydedildi'
    });
  } catch (error) {
    console.error('Fatura kaydetme hatası:', error);
    event.reply('save-bill-result', { 
      success: false, 
      error: error.message,
      message: 'Fatura kaydedilirken bir hata oluştu'
    });
  }
});

// Raporlar için istatistikler
ipcMain.on('get-dashboard-stats', async (event) => {
  try {
    // Bugün için tarih aralığı
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Bugünkü rezervasyon sayısı
    const reservationCount = await Reservation.countDocuments({
      date: { $gte: today, $lt: tomorrow }
    });
    
    // Aktif masa sayısı
    const activeTableCount = await Table.countDocuments({
      status: { $in: ['occupied', 'reserved'] }
    });
    
    // Günlük sipariş sayısı
    const orderCount = await Order.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    // Günlük gelir
    const dailyIncome = await Bill.aggregate([
      { $match: { createdAt: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]);
    
    const stats = {
      reservationCount,
      activeTableCount,
      orderCount,
      dailyIncome: dailyIncome.length > 0 ? dailyIncome[0].total : 0
    };
    
    event.reply('dashboard-stats-data', stats);
  } catch (error) {
    console.error('İstatistikleri alma hatası:', error);
    event.reply('dashboard-stats-data', {
      reservationCount: 0,
      activeTableCount: 0,
      orderCount: 0,
      dailyIncome: 0
    });
  }
});

// Masa detaylarını getir
ipcMain.on('get-table-details', async (event, tableId) => {
  try {
    console.log("Main process - Talep edilen masa ID:", tableId, "Tip:", typeof tableId);
    
    // ObjectId olduğunu kontrol et
    if (!mongoose.Types.ObjectId.isValid(tableId)) {
      throw new Error('Geçersiz masa ID formatı');
    }
    
    const table = await Table.findById(tableId).lean();
    console.log("Bulunan masa:", table ? "Bulundu" : "Bulunamadı");
    
    if (!table) {
      throw new Error('Masa bulunamadı');
    }
    
    // ID'yi string'e dönüştür
    if (table._id) {
      table._id = table._id.toString();
    }
    
    event.reply('table-details', table);
  } catch (error) {
    console.error('Masa detaylarını alma hatası:', error);
    event.reply('table-details', null);
  }
});

// Menü öğesi detaylarını getir
ipcMain.on('get-menu-item-details', async (event, menuItemId) => {
  try {
    console.log("Main process - Talep edilen menü öğesi ID:", menuItemId, "Tip:", typeof menuItemId);
    
    // ObjectId olduğunu kontrol et
    if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
      throw new Error('Geçersiz menü öğesi ID formatı');
    }
    
    const menuItem = await MenuItem.findById(menuItemId).lean();
    console.log("Bulunan menü öğesi:", menuItem ? "Bulundu" : "Bulunamadı");
    
    if (!menuItem) {
      throw new Error('Menü öğesi bulunamadı');
    }
    
    // ID'yi string'e dönüştür
    if (menuItem._id) {
      menuItem._id = menuItem._id.toString();
    }
    
    event.reply('menu-item-details', menuItem);
  } catch (error) {
    console.error('Menü öğesi detaylarını alma hatası:', error);
    event.reply('menu-item-details', null);
  }
});

// Fatura detaylarını getir
ipcMain.on('get-bill-details', async (event, billId) => {
  try {
    console.log("Main process - Talep edilen fatura ID:", billId, "Tip:", typeof billId);
    
    // ObjectId olduğunu kontrol et
    if (!mongoose.Types.ObjectId.isValid(billId)) {
      throw new Error('Geçersiz fatura ID formatı');
    }
    
    const billData = await Bill.findById(billId)
      .populate('tableId')
      .populate('orderId')
      .lean();
    
    console.log("Bulunan fatura:", billData ? "Bulundu" : "Bulunamadı");
    
    if (!billData) {
      throw new Error('Fatura bulunamadı');
    }
    
    // ID'leri string'e dönüştür
    if (billData._id) {
      billData._id = billData._id.toString();
    }
    
    // İlişkili tablolar
    if (billData.tableId && typeof billData.tableId === 'object') {
      if (billData.tableId._id) {
        billData.tableId._id = billData.tableId._id.toString();
      }
    }
    
    // Sipariş verisi
    if (billData.orderId && typeof billData.orderId === 'object') {
      if (billData.orderId._id) {
        billData.orderId._id = billData.orderId._id.toString();
      }
      
      // Sipariş öğelerini işle
      if (billData.orderId.items && Array.isArray(billData.orderId.items)) {
        billData.orderId.items = billData.orderId.items.map(item => {
          if (item._id) {
            item._id = item._id.toString();
          }
          if (item.menuItemId && typeof item.menuItemId === 'object') {
            item.menuItemId = item.menuItemId.toString();
          }
          return item;
        });
      }
    }
    
    // Öğeler
    if (billData.items && Array.isArray(billData.items)) {
      billData.items = billData.items.map(item => {
        if (item._id) {
          item._id = item._id.toString();
        }
        if (item.menuItemId && typeof item.menuItemId === 'object') {
          item.menuItemId = item.menuItemId.toString();
        }
        return item;
      });
    }
    
    event.reply('bill-details', billData);
  } catch (error) {
    console.error('Fatura detaylarını alma hatası:', error);
    event.reply('bill-details', null);
  }
});

// Fatura yazdır
ipcMain.on('print-bill', async (event, billId) => {
  try {
    // ObjectId olduğunu kontrol et
    if (!mongoose.Types.ObjectId.isValid(billId)) {
      throw new Error('Geçersiz fatura ID formatı');
    }
    
    const bill = await Bill.findById(billId).populate('tableId').lean();
    // Burada yazdırma işlemi yapılabilir
    // Şu an için sadece kullanıcıya bir mesaj gönderelim
    event.reply('print-bill-result', { success: true, message: 'Fatura yazdırma talebi alındı' });
  } catch (error) {
    console.error('Fatura yazdırma hatası:', error);
    event.reply('print-bill-result', { success: false, error: error.message });
  }
});

// Masaya ait siparişleri getir
ipcMain.on('get-table-orders', async (event, tableId) => {
  try {
    console.log("Main process - Aranacak masa ID:", tableId, "Tip:", typeof tableId);
    
    // ObjectId olduğunu kontrol et
    if (!mongoose.Types.ObjectId.isValid(tableId)) {
      throw new Error(`Geçersiz masa ID formatı: ${tableId}`);
    }
    
    // String ID'yi ObjectId'ye dönüştür
    const objectId = new mongoose.Types.ObjectId(tableId);
    console.log("Dönüştürülen ObjectId:", objectId);
    
    // Tüm siparişleri bul (iptal edilenler hariç)
    const orders = await Order.find({
      tableId: objectId,
      status: { $nin: ['cancelled'] } // İptal edilenleri hariç tut, tamamlananları dahil et
    })
      .lean()
      .sort({ createdAt: -1 });
    
    // Sipariş bulunamadıysa boş dizi döndür
    if (!orders || orders.length === 0) {
      console.log(`Masa #${tableId} için sipariş bulunamadı`);
      event.reply('table-orders', []);
      return;
    }
      
    // ID'leri string'e dönüştür
    const processedOrders = orders.map(order => {
      if (order._id) {
        order._id = order._id.toString();
      }
      
      // İlişkili ID'leri de string'e çevir
      if (order.tableId) {
        if (typeof order.tableId === 'object') {
          order.tableId = order.tableId.toString();
        }
      }
      
      // Sipariş öğelerinin ID'lerini çevir
      if (order.items && Array.isArray(order.items)) {
        order.items = order.items.map(item => {
          if (item._id) {
            item._id = item._id.toString();
          }
          if (item.menuItemId && typeof item.menuItemId === 'object') {
            item.menuItemId = item.menuItemId.toString();
          }
          return item;
        });
      }
      
      return order;
    });
      
    console.log(`Masa #${tableId} için ${processedOrders.length} sipariş bulundu`);
    event.reply('table-orders', processedOrders);
  } catch (error) {
    console.error('Masa siparişlerini alma hatası:', error);
    event.reply('table-orders', []);
  }
});

// Sipariş durumunu güncelle
ipcMain.on('update-order-status', async (event, data) => {
  try {
    console.log("Main process - Güncellenecek sipariş ID:", data.orderId, "Tip:", typeof data.orderId);
    
    // ObjectId olduğunu kontrol et
    if (!mongoose.Types.ObjectId.isValid(data.orderId)) {
      throw new Error('Geçersiz sipariş ID formatı');
    }
    
    // String ID'yi ObjectId'ye dönüştür
    const objectId = new mongoose.Types.ObjectId(data.orderId);
    console.log("Dönüştürülen ObjectId:", objectId);
    
    // Siparişi güncelle
    const order = await Order.findByIdAndUpdate(
      objectId,
      { status: data.status },
      { new: true }
    );
    
    if (!order) {
      throw new Error('Sipariş bulunamadı');
    }
    
    // ID'yi string'e dönüştür
    if (order._id) {
      order._id = order._id.toString();
    }
    
    // Eğer sipariş tamamlandıysa ve bir masa atanmışsa, masanın durumunu güncelle
    if (data.status === 'completed' && order.tableId) {
      await Table.findByIdAndUpdate(
        order.tableId,
        { status: 'available' }
      );
    }
    
    event.reply('update-order-status-result', { success: true, order });
  } catch (error) {
    console.error('Sipariş durumu güncelleme hatası:', error);
    event.reply('update-order-status-result', { success: false, error: error.message });
  }
});

// Rezervasyon sil
ipcMain.on('delete-reservation', async (event, reservationId) => {
  try {
    console.log("Main process - Silinecek rezervasyon ID:", reservationId, "Tip:", typeof reservationId);
    
    // ObjectId olduğunu kontrol et
    if (!mongoose.Types.ObjectId.isValid(reservationId)) {
      throw new Error('Geçersiz rezervasyon ID formatı');
    }
    
    // String ID'yi ObjectId'ye dönüştür
    const objectId = new mongoose.Types.ObjectId(reservationId);
    console.log("Dönüştürülen ObjectId:", objectId);
    
    // Önce rezervasyon bilgilerini al (silmeden önce)
    const reservation = await Reservation.findById(objectId);
    
    if (!reservation) {
      throw new Error('Rezervasyon bulunamadı');
    }
    
    // Rezervasyonu sil
    await Reservation.findByIdAndDelete(objectId);
    
    // Eğer masa hala rezerve durumunda ise, durumunu değiştir
    // Eğer masa başka bir rezervasyon veya sipariş ile ilişkilendirilmemişse
    const tableId = reservation.tableId;
    const otherReservations = await Reservation.countDocuments({ 
      tableId: tableId,
      _id: { $ne: objectId }
    });
    
    const activeOrders = await Order.countDocuments({
      tableId: tableId,
      status: { $in: ['pending', 'preparing', 'ready', 'delivered'] }
    });
    
    // Eğer masaya ait başka rezervasyon veya aktif sipariş yoksa, masayı boşalt
    if (otherReservations === 0 && activeOrders === 0) {
      await Table.findByIdAndUpdate(
        tableId,
        { status: 'available' }
      );
    }
    
    event.reply('delete-reservation-result', { success: true });
  } catch (error) {
    console.error('Rezervasyon silme hatası:', error);
    event.reply('delete-reservation-result', { success: false, error: error.message });
  }
});

// Dolu masaları getir
ipcMain.on('get-occupied-tables', async (event) => {
  try {
    const tables = await Table.find({
      status: 'occupied'
    }).lean().sort({ name: 1 });
    
    // ID'leri string'e dönüştür
    const processedTables = tables.map(table => {
      if (table._id) {
        table._id = table._id.toString();
      }
      return table;
    });
    
    // Her masa için sipariş bilgilerini ekle (toplam tutar hesabı için)
    const tablesWithOrders = [];
    
    for (const table of processedTables) {
      // Masaya ait tüm siparişleri bul (iptal edilenler hariç)
      const orders = await Order.find({
        tableId: new mongoose.Types.ObjectId(table._id),
        status: { $nin: ['cancelled'] } // Sadece iptal edilenleri hariç tut
      }).lean();
      
      // Siparişlerin ID'lerini string'e dönüştür
      const processedOrders = orders.map(order => {
        if (order._id) {
          order._id = order._id.toString();
        }
        
        // Öğeleri işle
        if (order.items && Array.isArray(order.items)) {
          order.items = order.items.map(item => {
            if (item._id) {
              item._id = item._id.toString();
            }
            if (item.menuItemId && typeof item.menuItemId === 'object') {
              item.menuItemId = item.menuItemId.toString();
            }
            return item;
          });
        }
        
        return order;
      });
      
      // Toplam tutarı hesapla
      let total = 0;
      let activeOrders = []; // Aktif (tamamlanmamış) siparişleri takip et
      
      // Eğer siparişler varsa hesapla, yoksa varsayılan değerleri kullan
      if (processedOrders.length > 0) {
        for (const order of processedOrders) {
          // Her siparişin tutarını toplam fiyata ekle
          for (const item of order.items) {
            total += item.price * item.quantity;
          }
          
          // Sadece tamamlanmamış siparişleri aktif olarak tut
          if (order.status !== 'completed') {
            activeOrders.push(order);
          }
        }
      }
      
      // KDV oranı (%18)
      const taxRate = 0.18;
      const subtotal = total / (1 + taxRate); // KDV'siz tutar
      const tax = total - subtotal; // KDV tutarı
      
      table.orders = activeOrders; // UI'da gösterilecek olan siparişler (tamamlanmamış olanlar)
      table.allOrders = processedOrders; // Tüm siparişler (toplam hesap için)
      table.total = total;
      table.subtotal = subtotal;
      table.tax = tax;
      
      // Her masa mutlaka listeye eklensin
      tablesWithOrders.push(table);
    }
    
    console.log("Dolu masa sayısı:", tablesWithOrders.length);
    event.reply('occupied-tables-data', tablesWithOrders);
  } catch (error) {
    console.error('Dolu masaları alma hatası:', error);
    event.reply('occupied-tables-data', []);
  }
});

// Rezervasyon detaylarını getir
ipcMain.on('get-reservation-details', async (event, reservationId) => {
  try {
    console.log("Main process - Talep edilen rezervasyon ID:", reservationId, "Tip:", typeof reservationId);
    
    // ObjectId olduğunu kontrol et
    if (!mongoose.Types.ObjectId.isValid(reservationId)) {
      throw new Error('Geçersiz rezervasyon ID formatı');
    }
    
    const reservation = await Reservation.findById(reservationId)
      .populate('tableId')
      .lean();
    
    console.log("Bulunan rezervasyon:", reservation ? "Bulundu" : "Bulunamadı");
    
    if (!reservation) {
      throw new Error('Rezervasyon bulunamadı');
    }
    
    // ID'leri string'e dönüştür
    if (reservation._id) {
      reservation._id = reservation._id.toString();
    }
    
    // İlişkili tablolar
    if (reservation.tableId && typeof reservation.tableId === 'object') {
      if (reservation.tableId._id) {
        reservation.tableId._id = reservation.tableId._id.toString();
      }
    }
    
    event.reply('reservation-details', reservation);
  } catch (error) {
    console.error('Rezervasyon detaylarını alma hatası:', error);
    event.reply('reservation-details', null);
  }
}); 