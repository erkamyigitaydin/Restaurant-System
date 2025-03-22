const { connectDB, Table, MenuItem, Reservation, Order, Bill } = require('./db');

async function seedDatabase() {
  try {
    // Veritabanına bağlan
    const isConnected = await connectDB();
    if (!isConnected) {
      console.error('Veritabanına bağlanılamadı. Seed işlemi iptal edildi.');
      process.exit(1);
    }

    // Koleksiyonları temizle (Dikkat: Tüm verileri siler!)
    console.log('Mevcut verileri temizleme...');
    await Table.deleteMany({});
    await MenuItem.deleteMany({});
    await Reservation.deleteMany({});
    await Order.deleteMany({});
    await Bill.deleteMany({});

    // Örnek masaları ekle
    console.log('Masaları ekleme...');
    const tables = await Table.insertMany([
      { name: 'Masa 1', capacity: 2, status: 'available' },
      { name: 'Masa 2', capacity: 4, status: 'occupied' },
      { name: 'Masa 3', capacity: 4, status: 'reserved' },
      { name: 'Masa 4', capacity: 6, status: 'available' },
      { name: 'Masa 5', capacity: 2, status: 'occupied' },
      { name: 'Masa 6', capacity: 8, status: 'available' },
      { name: 'Masa 7', capacity: 2, status: 'reserved' },
      { name: 'Masa 8', capacity: 4, status: 'available' },
      { name: 'Masa 9', capacity: 6, status: 'occupied' },
      { name: 'Masa 10', capacity: 2, status: 'available' },
      { name: 'Masa 11', capacity: 4, status: 'available' },
      { name: 'Masa 12', capacity: 8, status: 'reserved' }
    ]);

    // Örnek menü öğelerini ekle
    console.log('Menü öğelerini ekleme...');
    const menuItems = await MenuItem.insertMany([
      { name: 'Çorba', category: 'appetizers', price: 45.00, stock: 20, active: true, description: 'Günün çorbası' },
      { name: 'Salata', category: 'appetizers', price: 55.00, stock: 15, active: true, description: 'Mevsim salata' },
      { name: 'Izgara Köfte', category: 'main-courses', price: 120.00, stock: 25, active: true, description: 'Özel köfte' },
      { name: 'Tavuk Şiş', category: 'main-courses', price: 95.00, stock: 18, active: true, description: 'Marine edilmiş tavuk şiş' },
      { name: 'Karışık Izgara', category: 'main-courses', price: 180.00, stock: 12, active: true, description: 'Et çeşitleri' },
      { name: 'Künefe', category: 'desserts', price: 60.00, stock: 10, active: true, description: 'Özel künefe' },
      { name: 'Sütlaç', category: 'desserts', price: 45.00, stock: 15, active: true, description: 'Fırında sütlaç' },
      { name: 'Kola', category: 'drinks', price: 15.00, stock: 50, active: true, description: 'Soğuk içecek' },
      { name: 'Ayran', category: 'drinks', price: 10.00, stock: 40, active: true, description: 'Ev yapımı ayran' },
      { name: 'Çay', category: 'drinks', price: 8.00, stock: 100, active: true, description: 'Sıcak çay' }
    ]);

    // Örnek rezervasyonlar
    console.log('Rezervasyonları ekleme...');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    await Reservation.insertMany([
      {
        customerName: 'Ahmet Yılmaz',
        customerPhone: '555-123-4567',
        tableId: tables[2]._id, // Masa 3
        date: today,
        time: '12:30',
        guestCount: 4,
        status: 'confirmed',
        notes: 'Pencere kenarı tercih ediyor'
      },
      {
        customerName: 'Mehmet Güneş',
        customerPhone: '555-234-5678',
        tableId: tables[6]._id, // Masa 7
        date: today,
        time: '13:45',
        guestCount: 2,
        status: 'confirmed',
        notes: ''
      },
      {
        customerName: 'Ayşe Demir',
        customerPhone: '555-345-6789',
        tableId: tables[11]._id, // Masa 12
        date: today,
        time: '19:30',
        guestCount: 6,
        status: 'pending',
        notes: 'Doğum günü kutlaması'
      }
    ]);

    // Örnek siparişler
    console.log('Siparişleri ekleme...');
    
    // Masa 2 için sipariş
    const order1 = new Order({
      tableId: tables[1]._id, // Masa 2
      items: [
        {
          menuItemId: menuItems[4]._id, // Karışık Izgara
          name: menuItems[4].name,
          quantity: 1,
          price: menuItems[4].price
        },
        {
          menuItemId: menuItems[5]._id, // Künefe
          name: menuItems[5].name,
          quantity: 1,
          price: menuItems[5].price
        },
        {
          menuItemId: menuItems[7]._id, // Kola
          name: menuItems[7].name,
          quantity: 2,
          price: menuItems[7].price
        },
        {
          menuItemId: menuItems[9]._id, // Çay
          name: menuItems[9].name,
          quantity: 1,
          price: menuItems[9].price
        }
      ],
      status: 'preparing',
      total: 180 + 60 + (15 * 2) + 8,
      notes: 'Acele ediyor'
    });
    await order1.save();

    // Masa 5 için sipariş
    const order2 = new Order({
      tableId: tables[4]._id, // Masa 5
      items: [
        {
          menuItemId: menuItems[1]._id, // Salata
          name: menuItems[1].name,
          quantity: 1,
          price: menuItems[1].price
        },
        {
          menuItemId: menuItems[2]._id, // Izgara Köfte
          name: menuItems[2].name,
          quantity: 2,
          price: menuItems[2].price
        },
        {
          menuItemId: menuItems[8]._id, // Ayran
          name: menuItems[8].name,
          quantity: 2,
          price: menuItems[8].price
        }
      ],
      status: 'completed',
      total: 55 + (120 * 2) + (10 * 2),
      notes: ''
    });
    await order2.save();

    // Örnek fatura
    console.log('Faturaları ekleme...');
    await Bill.create({
      orderId: order2._id,
      tableId: tables[4]._id, // Masa 5
      subtotal: order2.total,
      discount: 0,
      total: order2.total,
      paymentMethod: 'credit-card'
    });

    console.log('Veritabanı başarıyla dolduruldu!');
    
  } catch (error) {
    console.error('Seed hatası:', error);
  } finally {
    process.exit();
  }
}

seedDatabase(); 