// Electron IPC iletişimini alın
const { ipcRenderer } = require('electron');

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
  try {
    // Veritabanı bağlantısını kontrol et ve verileri yükle
    checkDatabaseConnection();
    
    // Olay dinleyicilerini ekle
    addEventListeners();
    
    // Formları hazırla
    setupForms();
    
    // İlk veri yüklemeleri
    loadDefaultData();
    
    // Veri yenileme zamanlayıcısını kur
    setupDataRefresh();
    
    console.log('Uygulama başlatıldı');
  } catch (error) {
    console.error('Uygulama başlatma hatası:', error);
    alert('Uygulama başlatılırken bir hata oluştu: ' + error.message);
  }
});

// Verileri otomatik olarak belirli aralıklarla yenileme
function setupDataRefresh() {
  // Aktif sayfaya göre her 10 saniyede bir verileri güncelle
  setInterval(() => {
    const activePage = document.querySelector('.page-container:not(.d-none)');
    if (!activePage) return;
    
    const pageId = activePage.id.replace('-page', '');
    
    // Aktif sayfaya göre farklı yenileme fonksiyonlarını çağır
    if (pageId === 'tables') {
      createTableCards();
    } else if (pageId === 'menu') {
      loadMenuItems();
    } else if (pageId === 'orders') {
      loadOrders();
    } else if (pageId === 'billing') {
      loadBills();
    } else if (pageId === 'dashboard') {
      updateDashboardInfo();
    }
  }, 10000); // 10 saniye
}

// Veritabanı bağlantısını kontrol et
function checkDatabaseConnection() {
  ipcRenderer.send('check-database-connection');
  
  ipcRenderer.once('database-connection-status', (event, status) => {
    if (!status.connected) {
      alert('Veritabanı bağlantısı kurulamadı. Lütfen MongoDB bağlantınızı kontrol edin!');
      console.error('Veritabanı bağlantı hatası:', status.error);
    }
  });
}

// Varsayılan verileri yükle
function loadDefaultData() {
  // Ana sayfa bilgilerini yükle
  updateDashboardInfo();
  
  // İlk açılışta doğru sayfa içeriğini hazırla
  const currentPage = document.querySelector('.nav-link.active')?.dataset.page || 'dashboard';
  changePage(currentPage);
}

// Dashboard bilgilerini güncelle
function updateDashboardInfo() {
  ipcRenderer.send('get-dashboard-info');
  
  ipcRenderer.once('dashboard-info', (event, info) => {
    document.getElementById('active-tables-count').textContent = info.activeTables || 0;
    document.getElementById('pending-orders-count').textContent = info.pendingOrders || 0;
  });
}

// Olay dinleyicileri
function addEventListeners() {
  // Sayfa değiştirme olayını dinle
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const pageId = this.dataset.page;
      if (pageId) {
        changePage(pageId);
      }
    });
  });
  
  // Rezervasyon formu gönderimi
  const reservationForm = document.getElementById('reservation-form');
  if (reservationForm) {
    reservationForm.addEventListener('submit', function(e) {
      e.preventDefault();
      saveReservation();
    });
  }
  
  // Sipariş formu gönderimi
  const orderForm = document.getElementById('order-form');
  if (orderForm) {
    orderForm.addEventListener('submit', function(e) {
      e.preventDefault();
      saveOrder();
    });
  }
  
  // Menü öğesi formu gönderimi
  const menuItemForm = document.getElementById('menu-item-form');
  if (menuItemForm) {
    menuItemForm.addEventListener('submit', function(e) {
      e.preventDefault();
      saveMenuItem();
    });
  }
  
  // Masa formu gönderimi
  const tableForm = document.getElementById('table-form');
  if (tableForm) {
    tableForm.addEventListener('submit', function(e) {
      e.preventDefault();
      saveTable();
    });
  }
  
  // Fatura formu gönderimi
  const billForm = document.getElementById('bill-form');
  if (billForm) {
    billForm.addEventListener('submit', function(e) {
      e.preventDefault();
      processBill();
    });
    
    // Sayfa yüklendiğinde seçili masa için hesap özeti güncelle
    const tableSelect = billForm.querySelector('#bill-table');
    if (tableSelect) {
      tableSelect.addEventListener('change', updateBillDetails);
    }
  }
}

// Form kurulumları
function setupForms() {
  // Menü öğesi formu
  const menuItemForm = document.getElementById('menu-item-form');
  if (menuItemForm) {
    menuItemForm.addEventListener('submit', function(e) {
      e.preventDefault();
      saveMenuItem();
    });
  }
  
  // Rezervasyon formu
  const reservationForm = document.getElementById('reservation-form');
  if (reservationForm) {
    reservationForm.addEventListener('submit', function(e) {
      e.preventDefault();
      saveReservation();
    });
  }
  
  // Sipariş formu
  const orderForm = document.getElementById('order-form');
  if (orderForm) {
    orderForm.addEventListener('submit', function(e) {
      e.preventDefault();
      saveOrder();
    });
  }
  
  // Fatura formu
  const billForm = document.getElementById('bill-form');
  if (billForm) {
    billForm.addEventListener('submit', function(e) {
      e.preventDefault();
      processBill();
    });
  }
}

// Sayfalar arası geçiş
function changePage(pageId) {
  // Tüm sayfaları gizle
  document.querySelectorAll('.page-container').forEach(page => {
    page.classList.add('d-none');
  });
  
  // Aktif menü öğesini güncelle
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.dataset.page === pageId) {
      link.classList.add('active');
    }
  });
  
  // Seçilen sayfayı göster
  const selectedPage = document.getElementById(pageId + '-page');
  if (selectedPage) {
    selectedPage.classList.remove('d-none');
  }
  
  // Sayfa özel işlemleri
  switch (pageId) {
    case 'dashboard':
      updateDashboardInfo();
      break;
    case 'tables':
      createTableCards();
      break;
    case 'menu':
      loadMenuItems();
      break;
    case 'reservations':
      loadReservations();
      populateReservationTableSelect();
      break;
    case 'orders':
      loadOrders();
      populateOrderTableSelect();
      populateOrderMenuItems();
      break;
    case 'billing':
      loadBills();
      loadActiveTablesForBilling();
      break;
  }
}

// Masaları oluştur
async function createTableCards() {
  const tableContainer = document.querySelector('.table-container');
  if (!tableContainer) return;
  
  // MongoDB'den masaları al
  ipcRenderer.send('get-tables');
  
  ipcRenderer.once('tables-data', (event, tables) => {
  // Masaları göster
  tableContainer.innerHTML = '';
    
    // Yeni masa ekleme butonu
    const addTableCard = document.createElement('div');
    addTableCard.className = 'col-md-2 mb-4';
    addTableCard.innerHTML = `
      <div class="table-card table-add">
        <div class="add-icon">+</div>
        <h5>Yeni Masa Ekle</h5>
      </div>
    `;
    tableContainer.appendChild(addTableCard);
    
    // Mevcut masaları listele
  tables.forEach(table => {
    let statusClass = '';
    let statusText = '';
    
    switch(table.status) {
      case 'available':
        statusClass = 'table-available';
        statusText = 'Boş';
        break;
      case 'occupied':
        statusClass = 'table-occupied';
        statusText = 'Dolu';
        break;
      case 'reserved':
        statusClass = 'table-reserved';
        statusText = 'Rezerve';
        break;
    }
    
    const tableCard = document.createElement('div');
    tableCard.className = `col-md-2 mb-4`;
      
      // ID'yi güvenli formata dönüştür
      const safeTableId = safeObjectId(table._id);
      if (!safeTableId) {
        console.error("Masa için geçersiz ID formatı:", table._id);
        return; // Bu masayı atla
      }
      
      // Edit ve Delete butonları için ayrı event handler'lar oluştur
      const tableCardContent = document.createElement('div');
      tableCardContent.className = `table-card ${statusClass}`;
      tableCardContent.dataset.tableId = safeTableId;
      tableCardContent.innerHTML = `
        <h5>${table.name}</h5>
        <div>${table.capacity} Kişilik</div>
        <div class="mt-2"><small>${statusText}</small></div>
        <div class="table-actions mt-2">
          <button class="btn btn-sm btn-outline-primary edit-table-btn">Düzenle</button>
          <button class="btn btn-sm btn-outline-danger delete-table-btn">Sil</button>
      </div>
    `;
    
      // Butonlara olay dinleyicileri ekle
      const editBtn = tableCardContent.querySelector('.edit-table-btn');
      editBtn.addEventListener('click', () => showEditTableForm(safeTableId));
      
      const deleteBtn = tableCardContent.querySelector('.delete-table-btn');
      deleteBtn.addEventListener('click', () => deleteTable(safeTableId));
      
      tableCard.appendChild(tableCardContent);
    tableContainer.appendChild(tableCard);
  });
  
  // Sipariş için masa seçimi listesini doldur
  const orderTable = document.getElementById('order-table');
  if (orderTable) {
    orderTable.innerHTML = '';
      tables.forEach(table => {
        // ID'yi güvenli formata dönüştür
        const safeTableId = safeObjectId(table._id);
        if (!safeTableId) {
          console.error("Sipariş masası için geçersiz ID formatı:", table._id);
          return; // Bu masayı atla
        }
        
      const option = document.createElement('option');
        option.value = safeTableId;
      option.textContent = table.name;
      orderTable.appendChild(option);
    });
  }
  
  // Fatura için masa seçimi listesini doldur
  const billTable = document.getElementById('bill-table');
  if (billTable) {
    billTable.innerHTML = '';
      tables.forEach(table => {
        // ID'yi güvenli formata dönüştür
        const safeTableId = safeObjectId(table._id);
        if (!safeTableId) {
          console.error("Fatura masası için geçersiz ID formatı:", table._id);
          return; // Bu masayı atla
        }
        
      const option = document.createElement('option');
        option.value = safeTableId;
      option.textContent = table.name;
      billTable.appendChild(option);
    });
  }
  });
}

// Menü öğeleri listesi
async function loadMenuItems() {
  // MongoDB'den menüyü al
  ipcRenderer.send('get-menu');
  
  ipcRenderer.once('menu-data', (event, menuItems) => {
  // Menü tablosuna öğeleri ekle
  const menuTable = document.getElementById('menu-items-table');
  if (menuTable) {
    const tbody = menuTable.querySelector('tbody');
    tbody.innerHTML = '';
      
      // Yeni menü öğesi ekleme butonu - varsa silme, yoksa ekleme
      const tableWrapper = menuTable.parentElement;
      const existingButton = tableWrapper.querySelector('.btn.btn-primary.mb-3');
      
      if (!existingButton) {
        // Buton henüz eklenmemişse ekle
        const addMenuButton = document.createElement('button');
        addMenuButton.className = 'btn btn-primary mb-3';
        addMenuButton.textContent = 'Yeni Menü Öğesi Ekle';
        addMenuButton.onclick = showAddMenuItemForm;
        
        // Butonun konumlandırılması
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'text-end';
        buttonContainer.appendChild(addMenuButton);
        
        tableWrapper.insertBefore(buttonContainer, menuTable);
      }
    
    menuItems.forEach(item => {
      let categoryName = '';
      switch(item.category) {
        case 'appetizers': categoryName = 'Başlangıçlar'; break;
        case 'main-courses': categoryName = 'Ana Yemekler'; break;
        case 'desserts': categoryName = 'Tatlılar'; break;
        case 'drinks': categoryName = 'İçecekler'; break;
      }
        
        // ID'yi güvenli formata dönüştür
        const safeItemId = safeObjectId(item._id);
        if (!safeItemId) {
          console.error("Menü öğesi için geçersiz ID formatı:", item._id);
          return; // Bu öğeyi atla
        }
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.name}</td>
        <td>${categoryName}</td>
        <td>₺${item.price.toFixed(2)}</td>
        <td>${item.stock}</td>
        <td>${item.active ? '<span class="badge bg-success">Aktif</span>' : '<span class="badge bg-secondary">Pasif</span>'}</td>
        <td>
            <button class="btn btn-sm btn-outline-primary me-1 edit-item-btn">Düzenle</button>
            <button class="btn btn-sm btn-outline-danger delete-item-btn">Sil</button>
        </td>
      `;
        
        // Butonlara olay dinleyicileri ekle
        const editBtn = row.querySelector('.edit-item-btn');
        editBtn.addEventListener('click', () => editMenuItem(safeItemId));
        
        const deleteBtn = row.querySelector('.delete-item-btn');
        deleteBtn.addEventListener('click', () => deleteMenuItem(safeItemId));
        
      tbody.appendChild(row);
    });
  }
  
  // Sipariş için menü öğelerini doldur
    const menuItemSelect = document.getElementById('menu-item-select');
    if (menuItemSelect) {
      menuItemSelect.innerHTML = '';
    menuItems.filter(item => item.active && item.stock > 0).forEach(item => {
        // ID'yi güvenli formata dönüştür
        const safeItemId = safeObjectId(item._id);
        if (!safeItemId) {
          console.error("Sipariş için menü öğesi ID formatı geçersiz:", item._id);
          return; // Bu öğeyi atla
        }
        
      const option = document.createElement('option');
        option.value = safeItemId;
        option.textContent = `${item.name} (₺${item.price.toFixed(2)})`;
        option.dataset.price = item.price;
        menuItemSelect.appendChild(option);
      });
    }
  });
}

// Rezervasyonları getir
async function loadReservations() {
  // MongoDB'den rezervasyonları al
  ipcRenderer.send('get-reservations');
  
  ipcRenderer.once('reservations-data', (event, reservations) => {
    const reservationsList = document.getElementById('reservations-list');
    if (!reservationsList) return;
    
    reservationsList.innerHTML = '';
    
    if (!reservations || reservations.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = '<td colspan="8" class="text-center">Rezervasyon bulunamadı</td>';
      reservationsList.appendChild(emptyRow);
      return;
    }
    
    reservations.forEach(reservation => {
      const row = document.createElement('tr');
      
      // Tarih formatını ayarla
      const reservationDate = new Date(reservation.date);
      const formattedDate = reservationDate.toLocaleDateString('tr-TR');
      
      // ID'yi güvenli formata dönüştür
      const safeReservationId = safeObjectId(reservation._id);
      if (!safeReservationId) {
        console.error("Rezervasyon için geçersiz ID formatı:", reservation._id);
        return; // Bu rezervasyonu atla
      }
      
      row.innerHTML = `
        <td>${reservation.customerName}</td>
        <td>${reservation.customerPhone || '-'}</td>
        <td>${reservation.tableId.name}</td>
        <td>${formattedDate}</td>
        <td>${reservation.time}</td>
        <td>${reservation.guestCount}</td>
        <td>${getReservationStatusText(reservation.status)}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary view-reservation-btn">Görüntüle</button>
        </td>
      `;
      
      // Rezervasyon görüntüleme butonu
      const viewBtn = row.querySelector('.view-reservation-btn');
      viewBtn.addEventListener('click', () => viewReservation(safeReservationId));
      
      reservationsList.appendChild(row);
    });
  });
  
  // Rezervasyon formu için tabloları doldur
  populateReservationTableSelect();
}

// Rezervasyon durumu metnini al
function getReservationStatusText(status) {
  switch(status) {
    case 'pending': return 'Bekliyor';
    case 'confirmed': return 'Onaylandı';
    case 'cancelled': return 'İptal Edildi';
    default: return status;
  }
}

// Rezervasyon formu için masaları doldur
function populateReservationTableSelect() {
  const tableSelect = document.getElementById('reservation-table');
  if (!tableSelect) return;
  
  // Masaları temizle
  tableSelect.innerHTML = '<option value="">Masa Seçin</option>';
  
  // MongoDB'den masaları al
  ipcRenderer.send('get-tables');
  
  ipcRenderer.once('tables-data', (event, tables) => {
    tables.forEach(table => {
      const option = document.createElement('option');
      option.value = table._id;
      option.textContent = `${table.name} (${table.capacity} Kişilik)`;
      tableSelect.appendChild(option);
    });
  });
  
  // Bugünün tarihini ayarla
  const dateInput = document.getElementById('reservation-date');
  if (dateInput) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}`;
    dateInput.min = `${year}-${month}-${day}`;
  }
}

// Yeni rezervasyon kaydet
function saveReservation() {
  try {
    const form = document.getElementById('reservation-form');
    if (!form) return;
    
    // Form için gönderim düğmesini devre dışı bırak (duplicate önleme)
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Kaydediliyor...';
    }
    
    const customerName = document.getElementById('customer-name').value;
    const customerPhone = document.getElementById('customer-phone').value;
    const tableId = document.getElementById('reservation-table').value;
    const date = document.getElementById('reservation-date').value;
    const time = document.getElementById('reservation-time').value;
    const guestCount = parseInt(document.getElementById('guest-count').value);
    const notes = document.getElementById('reservation-notes').value;
    
    // Verileri kontrol et
    if (!customerName || !tableId || !date || !time || !guestCount) {
      alert('Lütfen tüm gerekli alanları doldurun');
      resetFormButton(submitButton, 'Rezervasyon Ekle');
      return;
    }
    
    // ID'yi kontrol et
    if (!isValidId(tableId)) {
      alert('Geçersiz masa ID formatı');
      resetFormButton(submitButton, 'Rezervasyon Ekle');
      return;
    }
    
    // MongoDB'ye rezervasyon verilerini gönder
    const reservationData = {
      customerName,
      customerPhone,
      tableId,
      date,
      time,
      guestCount,
      status: 'confirmed',
      notes
    };
    
    ipcRenderer.send('save-reservation', reservationData);
    
    ipcRenderer.once('save-reservation-result', (event, result) => {
      // Düğmeyi normal haline getir
      resetFormButton(submitButton, 'Rezervasyon Ekle');
      
      if (result.success) {
        // Formu temizle
        form.reset();
        
        // Bugünün tarihini varsayılan olarak ayarla
        const dateInput = document.getElementById('reservation-date');
        if (dateInput) {
          const today = new Date();
          const year = today.getFullYear();
          const month = String(today.getMonth() + 1).padStart(2, '0');
          const day = String(today.getDate()).padStart(2, '0');
          dateInput.value = `${year}-${month}-${day}`;
          dateInput.min = `${year}-${month}-${day}`;
        }
        
        // Rezervasyonları yenile
        loadReservations();
        
        // Masaları yenile (durumları değişmiş olabilir)
        createTableCards();
        
        // Başarı mesajı göster
        alert(result.message || 'Rezervasyon başarıyla kaydedildi.');
      } else {
        // Hata mesajı göster
        alert(result.message || 'Rezervasyon kaydedilirken bir hata oluştu: ' + (result.error || 'Bilinmeyen hata'));
      }
    });
  } catch (error) {
    console.error('Rezervasyon kaydetme hatası:', error);
    
    // Düğmeyi normal haline getir
    const submitButton = document.getElementById('reservation-form')?.querySelector('button[type="submit"]');
    resetFormButton(submitButton, 'Rezervasyon Ekle');
    
    alert('Rezervasyon kaydedilirken bir hata oluştu: ' + error.message);
  }
}

// Rezervasyon görüntüle
function viewReservation(reservationId) {
  try {
    // ID'yi güvenli formata dönüştür
    const safeReservationId = safeObjectId(reservationId);
    console.log("Görüntülenecek güvenli rezervasyon ID:", safeReservationId);
    
    if (!safeReservationId) {
      alert('Geçersiz rezervasyon ID formatı');
      return;
    }
    
    // MongoDB'den rezervasyon detaylarını al
    ipcRenderer.send('get-reservation-details', String(safeReservationId));
    
    ipcRenderer.once('reservation-details', (event, reservation) => {
      if (reservation) {
        // Rezervasyon detaylarını modal'da göster
        const modal = new bootstrap.Modal(document.getElementById('reservation-modal'));
        const modalContent = document.getElementById('reservation-details');
        
        // Tarih formatını ayarla
        const reservationDate = new Date(reservation.date);
        const formattedDate = reservationDate.toLocaleDateString('tr-TR');
        
        modalContent.innerHTML = `
          <div class="mb-3">
            <strong>Müşteri:</strong> ${reservation.customerName}
          </div>
          <div class="mb-3">
            <strong>Telefon:</strong> ${reservation.customerPhone || '-'}
          </div>
          <div class="mb-3">
            <strong>Masa:</strong> ${reservation.tableId.name}
          </div>
          <div class="mb-3">
            <strong>Tarih:</strong> ${formattedDate}
          </div>
          <div class="mb-3">
            <strong>Saat:</strong> ${reservation.time}
          </div>
          <div class="mb-3">
            <strong>Kişi Sayısı:</strong> ${reservation.guestCount}
          </div>
          <div class="mb-3">
            <strong>Durum:</strong> ${getReservationStatusText(reservation.status)}
          </div>
          ${reservation.notes ? `<div class="mb-3"><strong>Notlar:</strong> ${reservation.notes}</div>` : ''}
        `;
        
        // Rezervasyon silme butonunu yapılandır
        const deleteBtn = document.getElementById('delete-reservation-btn');
        deleteBtn.dataset.reservationId = safeReservationId;
        deleteBtn.onclick = function() {
          const id = this.dataset.reservationId;
          if (confirm('Bu rezervasyonu iptal etmek istediğinizden emin misiniz?')) {
            deleteReservation(id);
            modal.hide();
          }
        };
        
        modal.show();
      } else {
        alert('Rezervasyon detayları alınamadı.');
      }
    });
  } catch (error) {
    console.error('Rezervasyon görüntüleme hatası:', error);
    alert('Rezervasyon görüntülenirken bir hata oluştu: ' + error.message);
  }
}

// Rezervasyon sil
function deleteReservation(reservationId) {
  try {
    console.log("Silinecek ham rezervasyon ID:", reservationId, "Tip:", typeof reservationId);
    
    // ID'yi güvenli formata dönüştür
    const safeReservationId = safeObjectId(reservationId);
    console.log("Güvenli rezervasyon ID:", safeReservationId);
    
    // ID'nin geçerli olup olmadığını kontrol et
    if (!safeReservationId) {
      console.error("Geçersiz ID formatı:", reservationId);
      alert('Geçersiz rezervasyon ID formatı');
      return;
    }
    
    // Ekstra güvenlik için ID'yi sadece string olarak gönder
    ipcRenderer.send('delete-reservation', String(safeReservationId));
    
    ipcRenderer.once('delete-reservation-result', (event, result) => {
      console.log("Silme sonucu:", result);
      if (result.success) {
        // Rezervasyonları yeniden yükle
        loadReservations();
        
        // Masaları yeniden yükle (durumları değişmiş olabilir)
        createTableCards();
        
        // Başarı mesajı göster
        alert('Rezervasyon başarıyla iptal edildi.');
      } else {
        // Hata mesajı göster
        alert('Rezervasyon iptal edilirken bir hata oluştu: ' + result.error);
      }
    });
  } catch (error) {
    console.error('Rezervasyon iptal hatası:', error);
    alert('Rezervasyon iptal işlemi sırasında bir hata oluştu: ' + error.message);
  }
}

// Siparişleri getir
async function loadOrders() {
  // MongoDB'den siparişleri al
  ipcRenderer.send('get-orders');
  
  ipcRenderer.once('orders-data', (event, orders) => {
    const ordersList = document.getElementById('orders-list');
    if (!ordersList) return;
    
    ordersList.innerHTML = '';
    orders.forEach(order => {
      const row = document.createElement('tr');
      const orderDate = new Date(order.createdAt);
      
      // ID'yi güvenli formata dönüştür
      const safeOrderId = safeObjectId(order._id);
      if (!safeOrderId) {
        console.error("Sipariş için geçersiz ID formatı:", order._id);
        return; // Bu siparişi atla
      }
      
      // Toplam tutarı hesapla
      const total = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      row.innerHTML = `
        <td>${order.tableId.name}</td>
        <td>${orderDate.toLocaleString('tr-TR')}</td>
        <td>
          <ul class="list-unstyled mb-0">
            ${order.items.map(item => `
              <li>${item.name} x ${item.quantity} = ₺${(item.price * item.quantity).toFixed(2)}</li>
            `).join('')}
          </ul>
        </td>
        <td>₺${total.toFixed(2)}</td>
        <td>${order.status}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1 edit-order-btn">Düzenle</button>
          <button class="btn btn-sm btn-outline-success me-1 complete-order-btn" ${order.status === 'completed' ? 'disabled' : ''}>Tamamla</button>
          <button class="btn btn-sm btn-outline-danger cancel-order-btn" ${order.status === 'cancelled' ? 'disabled' : ''}>İptal</button>
        </td>
      `;
      
      // Butonlara olay dinleyicileri ekle
      const editBtn = row.querySelector('.edit-order-btn');
      editBtn.addEventListener('click', () => editOrder(safeOrderId));
      
      const completeBtn = row.querySelector('.complete-order-btn');
      completeBtn.addEventListener('click', () => completeOrder(safeOrderId));
      
      const cancelBtn = row.querySelector('.cancel-order-btn');
      cancelBtn.addEventListener('click', () => cancelOrder(safeOrderId));
      
      ordersList.appendChild(row);
    });
  });
}

// Sipariş güncelle
function editOrder(orderId) {
  if (!isValidId(orderId)) {
    alert('Geçersiz sipariş ID formatı');
    return;
  }
  
  // Sipariş detaylarını getir
  alert(`Sipariş #${orderId} düzenleme işlemi başlatıldı`);
  // Burada sipariş düzenleme modalı açılabilir
}

// Siparişi tamamla
function completeOrder(orderId) {
  try {
    console.log("Tamamlanacak ham sipariş ID:", orderId, "Tip:", typeof orderId);
    
    // ID'yi güvenli formata dönüştür
    const safeOrderId = safeObjectId(orderId);
    console.log("Güvenli sipariş ID:", safeOrderId);
    
    // ID'nin geçerli olup olmadığını kontrol et
    if (!safeOrderId) {
      console.error("Geçersiz ID formatı:", orderId);
      alert('Geçersiz sipariş ID formatı');
      return;
    }
    
    if (confirm('Bu siparişi tamamlamak istediğinizden emin misiniz?')) {
      // MongoDB'ye siparişi tamamlama isteği gönder
      ipcRenderer.send('update-order-status', { orderId: safeOrderId, status: 'completed' });
      
      ipcRenderer.once('update-order-status-result', (event, result) => {
        console.log("Tamamlama sonucu:", result);
        if (result.success) {
          // Siparişleri yeniden yükle
          loadOrders();
          
          // Masaları yeniden yükle (durumları güncellenmiş olabilir)
          createTableCards();
          
          // Başarı mesajı göster
          alert('Sipariş başarıyla tamamlandı.');
        } else {
          // Hata mesajı göster
          alert('Sipariş tamamlanırken bir hata oluştu: ' + result.error);
        }
      });
    }
  } catch (error) {
    console.error('Sipariş tamamlama hatası:', error);
    alert('Sipariş tamamlama işlemi sırasında bir hata oluştu: ' + error.message);
  }
}

// Siparişi iptal et
function cancelOrder(orderId) {
  try {
    console.log("İptal edilecek ham sipariş ID:", orderId, "Tip:", typeof orderId);
    
    // ID'yi güvenli formata dönüştür
    const safeOrderId = safeObjectId(orderId);
    console.log("Güvenli sipariş ID:", safeOrderId);
    
    // ID'nin geçerli olup olmadığını kontrol et
    if (!safeOrderId) {
      console.error("Geçersiz ID formatı:", orderId);
      alert('Geçersiz sipariş ID formatı');
      return;
    }
    
    if (confirm('Bu siparişi iptal etmek istediğinizden emin misiniz?')) {
      // MongoDB'ye siparişi iptal etme isteği gönder
      ipcRenderer.send('update-order-status', { orderId: safeOrderId, status: 'cancelled' });
      
      ipcRenderer.once('update-order-status-result', (event, result) => {
        console.log("İptal sonucu:", result);
        if (result.success) {
          // Siparişleri yeniden yükle
          loadOrders();
          
          // Masaları yeniden yükle (durumları güncellenmiş olabilir)
          createTableCards();
          
          // Başarı mesajı göster
          alert('Sipariş başarıyla iptal edildi.');
        } else {
          // Hata mesajı göster
          alert('Sipariş iptal edilirken bir hata oluştu: ' + result.error);
        }
      });
    }
  } catch (error) {
    console.error('Sipariş iptal hatası:', error);
    alert('Sipariş iptal işlemi sırasında bir hata oluştu: ' + error.message);
  }
}

// Faturaları getir
async function loadBills() {
  // MongoDB'den faturaları al
  ipcRenderer.send('get-bills');
  
  ipcRenderer.once('bills-data', (event, bills) => {
    const billsList = document.getElementById('bills-list');
    if (!billsList) return;
    
    billsList.innerHTML = '';
    bills.forEach(bill => {
      // ID'yi güvenli formata dönüştür
      const safeBillId = safeObjectId(bill._id);
      if (!safeBillId) {
        console.error("Fatura için geçersiz ID formatı:", bill._id);
        return; // Bu faturayı atla
      }
      
      const row = document.createElement('tr');
      const billDate = new Date(bill.createdAt);
      
      row.innerHTML = `
        <td>${bill.tableId.name}</td>
        <td>${billDate.toLocaleString('tr-TR')}</td>
        <td>
          <ul class="list-unstyled mb-0">
            ${bill.items.map(item => `
              <li>${item.name} x ${item.quantity} = ₺${(item.price * item.quantity).toFixed(2)}</li>
            `).join('')}
          </ul>
        </td>
        <td>₺${bill.subtotal.toFixed(2)}</td>
        <td>₺${bill.tax.toFixed(2)}</td>
        <td>₺${bill.total.toFixed(2)}</td>
        <td>${bill.paymentMethod}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1 view-bill-btn">Görüntüle</button>
          <button class="btn btn-sm btn-outline-secondary print-bill-btn">Yazdır</button>
        </td>
      `;
      
      // Butonlara olay dinleyicileri ekle
      const viewBtn = row.querySelector('.view-bill-btn');
      viewBtn.addEventListener('click', () => viewBill(safeBillId));
      
      const printBtn = row.querySelector('.print-bill-btn');
      printBtn.addEventListener('click', () => printBill(safeBillId));
      
      billsList.appendChild(row);
    });
  });
}

// Masa detaylarını göster
function showTableDetails(table) {
  alert(`Masa ${table._id} detayları:\nDurum: ${table.status}\nKapasite: ${table.capacity} kişilik`);
  // Burada bir modal açılabilir veya başka bir işlem yapılabilir
}

// Sipariş öğesi ekle
function addOrderItem() {
  const orderItems = document.getElementById('order-items');
  const orderQuantity = document.getElementById('order-quantity');
  const orderItemsList = document.getElementById('order-items-list');
  const orderTotal = document.getElementById('order-total');
  
  if (!orderItems || !orderQuantity || !orderItemsList || !orderTotal) return;
  
  // Seçilen öğeyi al
  const selectedOption = orderItems.options[orderItems.selectedIndex];
  if (!selectedOption) return;
  
  const itemId = selectedOption.value;
  const itemText = selectedOption.text;
  const quantity = parseInt(orderQuantity.value);
  
  // Öğeyi listeye ekle
  const li = document.createElement('li');
  li.className = 'list-group-item d-flex justify-content-between align-items-center';
  li.innerHTML = `
    <div>
      <span>${itemText}</span>
      <span class="badge bg-secondary ms-2">${quantity}x</span>
    </div>
    <button type="button" class="btn btn-sm btn-outline-danger remove-item" data-item-id="${itemId}">Kaldır</button>
  `;
  
  li.querySelector('.remove-item').addEventListener('click', function() {
    li.remove();
    updateOrderTotal();
  });
  
  orderItemsList.appendChild(li);
  
  // Toplamı güncelle
  updateOrderTotal();
}

// Sipariş toplamını güncelle
function updateOrderTotal() {
  const orderItemsList = document.getElementById('order-items-list');
  const orderTotal = document.getElementById('order-total');
  
  if (!orderItemsList || !orderTotal) return;
  
  // Demo olarak basit bir toplam
  let total = 0;
  
  orderItemsList.querySelectorAll('li').forEach(li => {
    const priceText = li.querySelector('span').textContent;
    const price = parseFloat(priceText.split('₺')[1]);
    const quantity = parseInt(li.querySelector('.badge').textContent);
    total += price * quantity;
  });
  
  orderTotal.textContent = `₺${total.toFixed(2)}`;
}

// Menü öğesi kaydet
async function saveMenuItem() {
  const form = document.getElementById('menu-item-form');
  if (!form) return;
  
  const mode = form.dataset.mode;
  
  const menuItemData = {
    name: document.getElementById('item-name').value,
    category: document.getElementById('item-category').value,
    price: parseFloat(document.getElementById('item-price').value),
    stock: parseInt(document.getElementById('item-stock').value),
    description: document.getElementById('item-description').value,
    active: document.getElementById('item-active').checked
  };
  
  // Düzenleme modunda ise ID'yi ekle
  if (mode === 'edit') {
    menuItemData._id = form.dataset.menuItemId;
  }
  
  // MongoDB'ye menü öğesini kaydet
  ipcRenderer.send('save-menu-item', menuItemData);
  
  ipcRenderer.once('save-menu-item-result', (event, result) => {
    if (result.success) {
      // Modal'ı kapat
      const modal = bootstrap.Modal.getInstance(document.getElementById('menu-item-modal'));
      modal.hide();
      
      // Formu temizle
      form.reset();
      
      // Menü öğelerini yeniden yükle
      loadMenuItems();
      
      // Başarı mesajı göster
      alert(mode === 'add' ? 'Menü öğesi başarıyla eklendi.' : 'Menü öğesi başarıyla güncellendi.');
    } else {
      // Hata mesajı göster
      alert('Menü öğesi kaydedilirken bir hata oluştu: ' + result.error);
    }
  });
}

// Sipariş kaydet
async function saveOrder() {
  const form = document.getElementById('order-form');
  if (!form) return;
  
  try {
    // Form için gönderim düğmesini devre dışı bırak (duplicate önleme)
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sipariş Kaydediliyor...';
    }
    
    // Seçili masa ve menü öğelerini al
    const tableId = form.querySelector('#order-table').value;
    const menuItemSelect = form.querySelector('#menu-item-select');
    const quantity = parseInt(form.querySelector('#item-quantity').value);
    
    console.log("Sipariş için ham masa ID:", tableId);
    console.log("Sipariş için ham menü öğesi ID:", menuItemSelect.value);
    
    // ID'leri güvenli formata dönüştür
    const safeTableId = safeObjectId(tableId);
    const safeMenuItemId = safeObjectId(menuItemSelect.value);
    
    console.log("Güvenli masa ID:", safeTableId);
    console.log("Güvenli menü öğesi ID:", safeMenuItemId);
    
    // ID'lerin geçerli olup olmadığını kontrol et
    if (!safeTableId || !safeMenuItemId) {
      alert('Masa veya menü öğesi ID formatı geçersiz');
      resetFormButton(submitButton);
      return;
    }
    
    // Seçili menü öğesinin detaylarını al
    const selectedOption = menuItemSelect.options[menuItemSelect.selectedIndex];
    const menuItemName = selectedOption.textContent.split(' (')[0];
    const menuItemPrice = parseFloat(selectedOption.dataset.price);
    
    const orderData = {
      tableId: safeTableId,
      items: [{
        menuItemId: safeMenuItemId,
        name: menuItemName,
        quantity: quantity,
        price: menuItemPrice
      }],
      status: 'pending',
      notes: form.querySelector('#order-notes').value
    };
    
    console.log("Gönderilen sipariş verisi:", orderData);
    
    // MongoDB'ye siparişi kaydet
    ipcRenderer.send('save-order', orderData);
    
    ipcRenderer.once('save-order-result', (event, result) => {
      console.log("Sipariş kaydetme sonucu:", result);
      
      // Düğmeyi normal haline getir
      resetFormButton(submitButton);
      
      if (result.success) {
        // Formu temizle
        form.reset();
        
        // Siparişleri yeniden yükle
        loadOrders();
        
        // Masaları yeniden yükle (durumları güncellenmiş olabilir)
        createTableCards();
        
        // Sipariş listesini ve toplam alanını temizle
        const orderItemsList = document.getElementById('order-items-list');
        if (orderItemsList) {
          orderItemsList.innerHTML = '';
        }
        
        updateOrderTotal();
        
        // Başarı mesajı göster
        alert(result.message || 'Sipariş başarıyla kaydedildi.');
      } else {
        // Hata mesajı göster
        alert(result.message || 'Sipariş kaydedilirken bir hata oluştu: ' + (result.error || 'Bilinmeyen hata'));
      }
    });
  } catch (error) {
    console.error('Sipariş kaydetme hatası:', error);
    
    // Düğmeyi normal haline getir
    const submitButton = form.querySelector('button[type="submit"]');
    resetFormButton(submitButton);
    
    alert('Sipariş kaydedilirken bir hata oluştu: ' + error.message);
  }
}

// Form düğmesini sıfırla
function resetFormButton(button, defaultText) {
  if (button) {
    button.disabled = false;
    button.textContent = defaultText || 'Kaydet';
  }
}

// Sipariş menüsü öğelerini doldur
function populateOrderMenuItems() {
  const menuItemSelect = document.getElementById('menu-item-select');
  if (!menuItemSelect) return;
  
  // Menü öğelerini temizle
  menuItemSelect.innerHTML = '<option value="">Ürün Seçin</option>';
  
  // Menü öğelerini al
  ipcRenderer.send('get-menu');
  
  ipcRenderer.once('menu-data', (event, menuItems) => {
    if (!menuItems || menuItems.length === 0) {
      const option = document.createElement('option');
      option.disabled = true;
      option.textContent = 'Menü öğesi bulunmuyor';
      menuItemSelect.appendChild(option);
      return;
    }
    
    // Sadece aktif menü öğelerini göster
    const activeItems = menuItems.filter(item => item.active);
    
    // Kategorilere göre sırala
    const categories = {
      'appetizers': 'Başlangıçlar',
      'main-courses': 'Ana Yemekler',
      'desserts': 'Tatlılar',
      'drinks': 'İçecekler'
    };
    
    // Her kategori için grup oluştur
    Object.keys(categories).forEach(categoryKey => {
      const categoryItems = activeItems.filter(item => item.category === categoryKey);
      
      if (categoryItems.length > 0) {
        const groupElement = document.createElement('optgroup');
        groupElement.label = categories[categoryKey];
        
        categoryItems.forEach(item => {
          const option = document.createElement('option');
          option.value = item._id;
          option.dataset.price = item.price;
          option.textContent = `${item.name} (₺${item.price.toFixed(2)})`;
          groupElement.appendChild(option);
        });
        
        menuItemSelect.appendChild(groupElement);
      }
    });
  });
}

// Fatura işle
async function processBill() {
  const form = document.getElementById('bill-form');
  if (!form) return;
  
  try {
    // Seçili masa için sipariş bilgilerini al
    const tableSelect = form.querySelector('#bill-table');
    if (!tableSelect.value) {
      alert('Lütfen bir masa seçin');
      return;
    }
    
    const tableId = tableSelect.value;
    const selectedOption = tableSelect.options[tableSelect.selectedIndex];
    const orderId = selectedOption.dataset.orderId;
    const paymentMethod = form.querySelector('#payment-method').value;
    const notes = form.querySelector('#bill-notes').value;
    
    // Fiyat bilgilerini doğrudan seçilen opsiyondan al
    const subtotal = parseFloat(selectedOption.dataset.subtotal || 0);
    const tax = parseFloat(selectedOption.dataset.tax || 0);
    const total = parseFloat(selectedOption.dataset.total || 0);
    
    console.log("Fatura için ham masa ID:", tableId);
    console.log("Fatura için sipariş ID:", orderId);
    console.log("Fatura tutarları:", { subtotal, tax, total });
    
    // ID'yi güvenli formata dönüştür
    const safeTableId = safeObjectId(tableId);
    
    console.log("Güvenli masa ID:", safeTableId);
    
    // Masa ID'sinin geçerli olup olmadığını kontrol et
    if (!safeTableId) {
      alert('Geçersiz masa ID formatı');
      return;
    }
    
    // Sipariş var mı?
    if (orderId) {
      // Sipariş ID'sini güvenli formata dönüştür
      const safeOrderId = safeObjectId(orderId);
      console.log("Güvenli sipariş ID:", safeOrderId);
      
      if (!safeOrderId) {
        alert('Geçersiz sipariş ID formatı');
        return;
      }
      
      // Sipariş detaylarını getir
      ipcRenderer.send('get-table-orders', safeTableId);
      
      ipcRenderer.once('table-orders', (event, orders) => {
        // Sipariş ID'sine göre doğru siparişi bul
        const order = orders.find(o => o._id === orderId);
        
        if (order) {
          console.log("Fatura için sipariş:", order);
          
          // Fatura verisi oluştur
          const billData = {
            tableId: safeTableId,
            orderId: safeOrderId,
            items: order.items,
            subtotal: subtotal,
            tax: tax,
            total: total,
            paymentMethod: paymentMethod,
            notes: notes
          };
          
          saveBillAndUpdateUI(billData);
        } else {
          alert('Bu masa için seçilen sipariş bulunamadı.');
        }
      });
    } else {
      // Siparişi olmayan dolu masalar için
      const billData = {
        tableId: safeTableId,
        orderId: null, // Sipariş yok
        items: [], // Boş öğe listesi
        subtotal: 0,
        tax: 0,
        total: 0,
        paymentMethod: paymentMethod,
        notes: notes
      };
      
      saveBillAndUpdateUI(billData);
    }
  } catch (error) {
    console.error('Fatura işleme hatası:', error);
    alert('Fatura işleme sırasında bir hata oluştu: ' + error.message);
  }
}

// Faturayı kaydet ve UI'yı güncelle
function saveBillAndUpdateUI(billData) {
  console.log("Gönderilen fatura verisi:", billData);
  
  // MongoDB'ye faturayı kaydet
  ipcRenderer.send('save-bill', billData);
  
  ipcRenderer.once('save-bill-result', (event, result) => {
    console.log("Fatura kaydetme sonucu:", result);
    if (result.success) {
      // Formu temizle
      const form = document.getElementById('bill-form');
      if (form) {
        form.reset();
      }
      
      // Hesap özetini temizle
      const summaryContainer = document.getElementById('bill-summary');
      if (summaryContainer) {
        summaryContainer.innerHTML = '';
      }
      
      // Faturaları yeniden yükle
      loadBills();
      
      // Masaları yeniden yükle (durumları güncellenmiş olabilir)
      createTableCards();
      
      // Siparişleri yeniden yükle (tamamlanan siparişler güncellenmiş olabilir)
      loadOrders();
      
      // Aktif masaları yeniden yükle
      loadActiveTablesForBilling();
      
      // Başarı mesajı göster
      alert('Fatura başarıyla kaydedildi.');
    } else {
      // Hata mesajı göster
      alert('Fatura kaydedilirken bir hata oluştu: ' + result.error);
    }
  });
}

// ID'nin geçerli olup olmadığını kontrol eden yardımcı fonksiyon
function isValidId(id) {
  console.log("ID kontrolü:", id, "Tip:", typeof id);
  
  if (!id) {
    console.log("ID boş veya tanımsız");
    return false;
  }
  
  // String olarak kontrolü
  if (typeof id === 'string') {
    // MongoDB ObjectId'nin standart formatı: 24 karakter hexadecimal
    const isValid = /^[0-9a-fA-F]{24}$/.test(id);
    console.log("String ID kontrolü:", isValid, "ID:", id);
    return isValid;
  }
  
  // Obje kontrolü
  if (typeof id === 'object' && id !== null) {
    // _id alanı varsa
    if (id._id) {
      return isValidId(id._id);
    }
    
    // toString methodu varsa
    if (id.toString && typeof id.toString === 'function') {
      const idStr = id.toString();
      // [object Object] kontrolü
      if (idStr !== '[object Object]') {
        const isValid = /^[0-9a-fA-F]{24}$/.test(idStr);
        console.log("Obje ID kontrolü:", isValid, "ID String:", idStr);
        return isValid;
      }
    }
  }
  
  console.log("Geçersiz ID formatı");
  return false;
}

// ID'yi MongoDB ObjectId için güvenli string formatına dönüştürme
function safeObjectId(id) {
  if (!id) return null;
  
  try {
    // String kontrolü
    if (typeof id === 'string') {
      // Eğer zaten uygun formatta ise aynısını döndür
      if (/^[0-9a-fA-F]{24}$/.test(id)) {
        return id;
      }
    }
    
    // Obje kontrolü
    if (typeof id === 'object' && id !== null) {
      // _id alanını kontrol et
      if (id._id) {
        return safeObjectId(id._id);
      }
      
      // toString kontrolü
      if (id.toString && typeof id.toString === 'function') {
        const idStr = id.toString();
        // [object Object] kontrolü
        if (idStr !== '[object Object]' && /^[0-9a-fA-F]{24}$/.test(idStr)) {
          return idStr;
        }
      }
    }
    
    console.error("Geçersiz ID formatı, dönüştürülemedi:", id);
    return null;
  } catch (error) {
    console.error("ID dönüştürme hatası:", error);
    return null;
  }
}

// Fatura görüntüle
function viewBill(billId) {
  try {
    // ID'yi güvenli formata dönüştür
    const safeBillId = safeObjectId(billId);
    console.log("Görüntülenecek güvenli fatura ID:", safeBillId);
    
    if (!safeBillId) {
      alert('Geçersiz fatura ID formatı');
      return;
    }
    
    // MongoDB'den fatura detaylarını al
    ipcRenderer.send('get-bill-details', String(safeBillId));
    
    ipcRenderer.once('bill-details', (event, bill) => {
      if (bill) {
        // Fatura detaylarını modal'da göster
        const modal = new bootstrap.Modal(document.getElementById('bill-details-modal'));
        const modalContent = document.querySelector('#bill-details-modal .modal-body');
        
        modalContent.innerHTML = `
          <div class="mb-3">
            <strong>Masa:</strong> ${bill.tableId.name}
          </div>
          <div class="mb-3">
            <strong>Tarih:</strong> ${new Date(bill.createdAt).toLocaleString('tr-TR')}
          </div>
          <div class="mb-3">
            <strong>Ürünler:</strong>
            <ul class="list-unstyled">
              ${bill.items.map(item => `
                <li>${item.name} x ${item.quantity} = ₺${(item.price * item.quantity).toFixed(2)}</li>
              `).join('')}
            </ul>
          </div>
          <div class="mb-3">
            <strong>Ara Toplam:</strong> ₺${bill.subtotal.toFixed(2)}
          </div>
          <div class="mb-3">
            <strong>KDV:</strong> ₺${bill.tax.toFixed(2)}
          </div>
          <div class="mb-3">
            <strong>Toplam:</strong> ₺${bill.total.toFixed(2)}
          </div>
          <div class="mb-3">
            <strong>Ödeme Yöntemi:</strong> ${bill.paymentMethod}
          </div>
        `;
        
        modal.show();
      } else {
        alert('Fatura detayları alınamadı.');
      }
    });
  } catch (error) {
    console.error('Fatura görüntüleme hatası:', error);
    alert('Fatura görüntülenirken bir hata oluştu: ' + error.message);
  }
}

// Fatura yazdır
function printBill(billId) {
  try {
    console.log("Yazdırılacak ham fatura ID:", billId, "Tip:", typeof billId);
    
    // ID'yi güvenli formata dönüştür
    const safeBillId = safeObjectId(billId);
    console.log("Güvenli fatura ID:", safeBillId);
    
    if (!safeBillId) {
      console.error("Geçersiz ID formatı:", billId);
      alert('Geçersiz fatura ID formatı');
      return;
    }
    
    // MongoDB'den fatura detaylarını al ve yazdırma penceresini aç
    ipcRenderer.send('print-bill', String(safeBillId));
  } catch (error) {
    console.error('Fatura yazdırma hatası:', error);
    alert('Fatura yazdırma işlemi sırasında bir hata oluştu: ' + error.message);
  }
}

// Masa ekleme formunu göster
function showAddTableForm() {
  const modal = new bootstrap.Modal(document.getElementById('table-modal'));
  const form = document.getElementById('table-form');
  
  // Formu temizle
  form.reset();
  form.dataset.mode = 'add';
  document.getElementById('table-modal-title').textContent = 'Yeni Masa Ekle';
  
  modal.show();
}

// Masa düzenleme formunu göster
function showEditTableForm(tableId) {
  try {
    // ID'yi güvenli formata dönüştür
    const safeTableId = safeObjectId(tableId);
    console.log("Düzenlenecek güvenli masa ID:", safeTableId);
    
    if (!safeTableId) {
      alert('Geçersiz masa ID formatı');
      return;
    }
    
    const modal = new bootstrap.Modal(document.getElementById('table-modal'));
    const form = document.getElementById('table-form');
    
    // Masa bilgilerini getir
    ipcRenderer.send('get-table-details', String(safeTableId));
    
    ipcRenderer.once('table-details', (event, table) => {
      if (table) {
        form.dataset.mode = 'edit';
        form.dataset.tableId = table._id;
        document.getElementById('table-modal-title').textContent = 'Masa Düzenle';
        
        // Form alanlarını doldur
        document.getElementById('table-name').value = table.name;
        document.getElementById('table-capacity').value = table.capacity;
        document.getElementById('table-location').value = table.location || '';
        
        modal.show();
      } else {
        alert('Masa bilgileri alınamadı.');
      }
    });
  } catch (error) {
    console.error('Masa düzenleme formu hatası:', error);
    alert('Masa düzenleme formu açılırken bir hata oluştu: ' + error.message);
  }
}

// Masa kaydet/güncelle
async function saveTable() {
  const form = document.getElementById('table-form');
  const mode = form.dataset.mode;
  
  const tableData = {
    name: document.getElementById('table-name').value,
    capacity: parseInt(document.getElementById('table-capacity').value),
    status: 'available', // Varsayılan olarak boş durumda
    location: document.getElementById('table-location').value
  };
  
  // Düzenleme modunda ise ID'yi ekle
  if (mode === 'edit') {
    tableData._id = form.dataset.tableId;
  }
  
  // MongoDB'ye masa bilgilerini kaydet
  ipcRenderer.send('save-table', tableData);
  
  ipcRenderer.once('save-table-result', (event, result) => {
    if (result.success) {
      // Modal'ı kapat
      const modal = bootstrap.Modal.getInstance(document.getElementById('table-modal'));
      modal.hide();
      
      // Formu temizle
      form.reset();
      
      // Masaları yeniden yükle
      createTableCards();
      
      // Rezervasyon sayfasındaki masa seçimini güncelle
      populateReservationTableSelect();
      
      // Sipariş sayfasındaki masa seçimini güncelle
      populateOrderTableSelect();
      
      // Başarı mesajı göster
      alert(mode === 'add' ? 'Masa başarıyla eklendi.' : 'Masa başarıyla güncellendi.');
    } else {
      // Hata mesajı göster
      alert('Masa kaydedilirken bir hata oluştu: ' + result.error);
    }
  });
}

// Sipariş sayfasındaki masa seçimini güncelle
function populateOrderTableSelect() {
  const tableSelect = document.getElementById('order-table');
  if (!tableSelect) return;
  
  // Masaları temizle
  tableSelect.innerHTML = '<option value="">Masa Seçin</option>';
  
  // Masaları al
  ipcRenderer.send('get-tables');
  
  ipcRenderer.once('tables-data', (event, tables) => {
    if (!tables || tables.length === 0) {
      const option = document.createElement('option');
      option.disabled = true;
      option.textContent = 'Masa bulunmuyor';
      tableSelect.appendChild(option);
      return;
    }
    
    // Sadece uygun durumda olan (boş veya rezerve edilmiş) masaları listele
    const availableTables = tables.filter(table => 
      table.status === 'available' || table.status === 'reserved'
    );
    
    availableTables.forEach(table => {
      const option = document.createElement('option');
      option.value = table._id;
      option.textContent = `${table.name} (${table.capacity} kişilik)`;
      tableSelect.appendChild(option);
    });
  });
}

// Masa sil
function deleteTable(tableId) {
  try {
    console.log("Silinecek ham masa ID:", tableId, "Tip:", typeof tableId);
    
    // ID'yi güvenli formata dönüştür
    const safeTableId = safeObjectId(tableId);
    console.log("Güvenli masa ID:", safeTableId);
    
    // ID'nin geçerli olup olmadığını kontrol et
    if (!safeTableId) {
      console.error("Geçersiz ID formatı:", tableId);
      alert('Geçersiz masa ID formatı');
      return;
    }
    
    if (confirm('Bu masayı silmek istediğinizden emin misiniz?')) {
      // Ekstra güvenlik için ID'yi sadece string olarak gönder
      ipcRenderer.send('delete-table', String(safeTableId));
      
      ipcRenderer.once('delete-table-result', (event, result) => {
        console.log("Silme sonucu:", result);
        if (result.success) {
          // Masaları yeniden yükle
          createTableCards();
          
          // Başarı mesajı göster
          alert('Masa başarıyla silindi.');
        } else {
          // Hata mesajı göster
          alert('Masa silinirken bir hata oluştu: ' + result.error);
        }
      });
    }
  } catch (error) {
    console.error('Masa silme hatası:', error);
    alert('Masa silme işlemi sırasında bir hata oluştu: ' + error.message);
  }
}

// Menü öğesi ekleme formunu göster
function showAddMenuItemForm() {
  const modal = new bootstrap.Modal(document.getElementById('menu-item-modal'));
  const form = document.getElementById('menu-item-form');
  
  // Formu temizle
  form.reset();
  form.dataset.mode = 'add';
  document.getElementById('menu-item-modal-title').textContent = 'Yeni Menü Öğesi Ekle';
  
  modal.show();
}

// Menü öğesi düzenleme formunu göster
function editMenuItem(menuItemId) {
  try {
    console.log("Düzenlenecek ham menü öğesi ID:", menuItemId, "Tip:", typeof menuItemId);
    
    // ID'yi güvenli formata dönüştür
    const safeMenuItemId = safeObjectId(menuItemId);
    console.log("Güvenli menü öğesi ID:", safeMenuItemId);
    
    // ID'nin geçerli olup olmadığını kontrol et
    if (!safeMenuItemId) {
      console.error("Geçersiz ID formatı:", menuItemId);
      alert('Geçersiz menü öğesi ID formatı');
      return;
    }
    
    const modal = new bootstrap.Modal(document.getElementById('menu-item-modal'));
    const form = document.getElementById('menu-item-form');
    
    // Menü öğesi bilgilerini getir
    ipcRenderer.send('get-menu-item-details', String(safeMenuItemId));
    
    ipcRenderer.once('menu-item-details', (event, menuItem) => {
      if (menuItem) {
        form.dataset.mode = 'edit';
        form.dataset.menuItemId = menuItem._id;
        document.getElementById('menu-item-modal-title').textContent = 'Menü Öğesi Düzenle';
        
        // Form alanlarını doldur
        document.getElementById('item-name').value = menuItem.name;
        document.getElementById('item-category').value = menuItem.category;
        document.getElementById('item-price').value = menuItem.price;
        document.getElementById('item-stock').value = menuItem.stock;
        document.getElementById('item-description').value = menuItem.description || '';
        document.getElementById('item-active').checked = menuItem.active;
        
        modal.show();
      } else {
        alert('Menü öğesi bilgileri alınamadı.');
      }
    });
  } catch (error) {
    console.error('Menü öğesi düzenleme formu hatası:', error);
    alert('Menü öğesi düzenleme formu açılırken bir hata oluştu: ' + error.message);
  }
}

// Menü öğesi sil
function deleteMenuItem(menuItemId) {
  try {
    console.log("Silinecek ham menü öğesi ID:", menuItemId, "Tip:", typeof menuItemId);
    
    // ID'yi güvenli formata dönüştür
    const safeMenuItemId = safeObjectId(menuItemId);
    console.log("Güvenli menü öğesi ID:", safeMenuItemId);
    
    // ID'nin geçerli olup olmadığını kontrol et
    if (!safeMenuItemId) {
      console.error("Geçersiz ID formatı:", menuItemId);
      alert('Geçersiz menü öğesi ID formatı');
      return;
    }
    
    if (confirm('Bu menü öğesini silmek istediğinizden emin misiniz?')) {
      // Ekstra güvenlik için ID'yi sadece string olarak gönder
      ipcRenderer.send('delete-menu-item', String(safeMenuItemId));
      
      ipcRenderer.once('delete-menu-item-result', (event, result) => {
        console.log("Silme sonucu:", result);
        if (result.success) {
          // Menü öğelerini yeniden yükle
          loadMenuItems();
          
          // Başarı mesajı göster
          alert('Menü öğesi başarıyla silindi.');
        } else {
          // Hata mesajı göster
          alert('Menü öğesi silinirken bir hata oluştu: ' + result.error);
        }
      });
    }
  } catch (error) {
    console.error('Menü öğesi silme hatası:', error);
    alert('Menü öğesi silme işlemi sırasında bir hata oluştu: ' + error.message);
  }
}

// Açık modaldaki içeriği yazdır
function printActiveModal() {
  const modalBody = document.querySelector('#bill-details-modal .modal-body');
  const printWindow = window.open('', '_blank');
  
  printWindow.document.write(`
    <html>
      <head>
        <title>Fatura</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; }
          .header { text-align: center; margin-bottom: 20px; }
          .content { margin-bottom: 30px; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Restoran Yönetim Sistemi</h2>
          <p>Fatura</p>
        </div>
        <div class="content">
          ${modalBody.innerHTML}
        </div>
        <div class="footer">
          <p>Teşekkür ederiz!</p>
          <p>${new Date().toLocaleString('tr-TR')}</p>
        </div>
      </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.print();
}

// Hesap sayfası için aktif masaları yükle
function loadActiveTablesForBilling() {
  const tableSelect = document.getElementById('bill-table');
  if (!tableSelect) return;
  
  // Masaları temizle
  tableSelect.innerHTML = '<option value="">Masa Seçin</option>';
  
  // Dolu masaları al
  ipcRenderer.send('get-occupied-tables');
  
  ipcRenderer.once('occupied-tables-data', (event, tables) => {
    if (!tables || tables.length === 0) {
      const option = document.createElement('option');
      option.disabled = true;
      option.textContent = 'Aktif masa bulunmuyor';
      tableSelect.appendChild(option);
      return;
    }
    
    tables.forEach(table => {
      const option = document.createElement('option');
      option.value = table._id;
      
      // Siparişleri ve toplam bilgileri al
      if (table.allOrders && table.allOrders.length > 0) {
        // Aktif sipariş varsa, ilk aktif siparişin ID'sini saklayalım
        if (table.orders && table.orders.length > 0) {
          option.dataset.orderId = table.orders[0]._id; // İlk aktif siparişin ID'sini sakla
        } else if (table.allOrders.length > 0) {
          // Aktif sipariş yoksa ama tamamlanmış sipariş varsa, ilk tamamlanmış siparişin ID'sini sakla
          option.dataset.orderId = table.allOrders[0]._id;
        }
        
        // Tüm siparişlerin toplam bilgilerini sakla
        option.dataset.subtotal = table.subtotal.toFixed(2);
        option.dataset.tax = table.tax.toFixed(2);
        option.dataset.total = table.total.toFixed(2);
        
        // Toplam sipariş sayısını göster
        const activeCount = table.orders ? table.orders.length : 0;
        const completedCount = table.allOrders.length - activeCount;
        
        let orderInfo = '';
        if (activeCount > 0) {
          orderInfo += `${activeCount} Aktif`;
        }
        if (completedCount > 0) {
          orderInfo += orderInfo ? `, ${completedCount} Tamamlanmış` : `${completedCount} Tamamlanmış`;
        }
        
        option.textContent = `${table.name} - ${orderInfo} - Toplam: ₺${table.total.toFixed(2)}`;
      } else {
        // Siparişi olmayan dolu masalar için
        option.dataset.subtotal = "0.00";
        option.dataset.tax = "0.00";
        option.dataset.total = "0.00";
        option.textContent = `${table.name} - Sipariş Yok`;
      }
      
      tableSelect.appendChild(option);
    });
    
    // Masa seçildiğinde fiyat bilgilerini güncelle
    tableSelect.addEventListener('change', updateBillDetails);
    
    // Sayfa ilk yüklendiğinde, seçili masa varsa hesap detaylarını göster
    if (tableSelect.selectedIndex > 0) {
      updateBillDetails();
    }
  });
}

// Fatura detaylarını güncelle
function updateBillDetails() {
  const tableSelect = document.getElementById('bill-table');
  const selectedOption = tableSelect.options[tableSelect.selectedIndex];
  
  if (!selectedOption || !selectedOption.value) return;
  
  // Seçilen masanın fiyat detaylarını al
  const subtotal = selectedOption.dataset.subtotal;
  const tax = selectedOption.dataset.tax;
  const total = selectedOption.dataset.total;
  
  // Fiyat özetini göster
  const summaryContainer = document.getElementById('bill-summary');
  if (summaryContainer) {
    summaryContainer.innerHTML = `
      <div class="card mt-3">
        <div class="card-body">
          <h5 class="card-title">Hesap Özeti</h5>
          <div class="row">
            <div class="col-6">Ara Toplam:</div>
            <div class="col-6 text-end">₺${subtotal || '0.00'}</div>
          </div>
          <div class="row">
            <div class="col-6">KDV (%18):</div>
            <div class="col-6 text-end">₺${tax || '0.00'}</div>
          </div>
          <div class="row fw-bold mt-2">
            <div class="col-6">Toplam:</div>
            <div class="col-6 text-end">₺${total || '0.00'}</div>
          </div>
        </div>
      </div>
    `;
  }
} 