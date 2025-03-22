const mongoose = require('mongoose');

// MongoDB bağlantı URL'si
const MONGODB_URI = 'mongodb+srv://admin:Come1hear@restaurantdb.dr657.mongodb.net/?retryWrites=true&w=majority&appName=restaurantDB';

// Bağlantı kurma fonksiyonu
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB bağlantısı başarılı');
    return true;
  } catch (error) {
    console.error('MongoDB bağlantı hatası:', error);
    return false;
  }
};

// Masalar için şema ve model
const tableSchema = new mongoose.Schema({
  name: { type: String, required: true },
  capacity: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['available', 'occupied', 'reserved'],
    default: 'available'
  },
  createdAt: { type: Date, default: Date.now }
});

// Menü öğeleri için şema ve model
const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['appetizers', 'main-courses', 'desserts', 'drinks'],
    required: true 
  },
  price: { type: Number, required: true },
  description: { type: String },
  stock: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Rezervasyonlar için şema ve model
const reservationSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  customerPhone: { type: String },
  tableId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Table',
    required: true 
  },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  guestCount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Sipariş öğeleri için şema
const orderItemSchema = new mongoose.Schema({
  menuItemId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MenuItem',
    required: true 
  },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  price: { type: Number, required: true }
});

// Siparişler için şema ve model
const orderSchema = new mongoose.Schema({
  tableId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Table',
    required: true 
  },
  items: [orderItemSchema],
  status: { 
    type: String, 
    enum: ['pending', 'preparing', 'ready', 'delivered', 'completed'],
    default: 'pending'
  },
  total: { type: Number, default: 0 },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Faturalar için şema ve model
const billSchema = new mongoose.Schema({
  orderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order',
    required: true 
  },
  tableId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Table',
    required: true 
  },
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paymentMethod: { 
    type: String, 
    enum: ['cash', 'credit-card', 'debit-card'],
    required: true 
  },
  createdAt: { type: Date, default: Date.now }
});

// Modelleri oluştur
const Table = mongoose.model('Table', tableSchema);
const MenuItem = mongoose.model('MenuItem', menuItemSchema);
const Reservation = mongoose.model('Reservation', reservationSchema);
const Order = mongoose.model('Order', orderSchema);
const Bill = mongoose.model('Bill', billSchema);

module.exports = {
  connectDB,
  Table,
  MenuItem,
  Reservation,
  Order,
  Bill
}; 