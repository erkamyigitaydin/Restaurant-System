# Restoran Yönetim Sistemi

Restoran yönetimi için masaüstü uygulaması. Electron ve MongoDB kullanılarak geliştirilmiştir.

## Özellikler

- Masa Yönetimi: Masaları ekleyin, düzenleyin ve durumlarını takip edin
- Menü Yönetimi: Menü öğeleri ekleyin, kategorize edin ve stok takibi yapın
- Sipariş Sistemi: Masalara sipariş oluşturun ve durumlarını güncelleyin
- Rezervasyon: Masa rezervasyonları oluşturun ve takip edin
- Fatura: Siparişler için fatura oluşturun ve yazdırın
- Dashboard: Günlük istatistikleri ve durumları görüntüleyin

## Kurulum

### Gereksinimler
- Node.js (>= 14.x)
- MongoDB
- npm veya yarn

### Adımlar
1. Repoyu klonlayın
```
git clone https://github.com/kullaniciadi/restoran-yonetim.git
cd restoran-yonetim
```

2. Bağımlılıkları yükleyin
```
npm install
```

3. MongoDB'yi başlatın (ayrı bir terminal penceresinde)
```
mongod
```

4. Uygulamayı çalıştırın
```
npm start
```

## Kullanım

Uygulama başladığında, sol taraftaki menü aracılığıyla farklı modüllere erişebilirsiniz:

- **Ana Sayfa**: Günlük özet ve istatistikler
- **Masalar**: Masaları görüntüleyin, ekleyin ve düzenleyin
- **Menü**: Menü öğelerini yönetin
- **Rezervasyonlar**: Rezervasyonları görüntüleyin ve yönetin
- **Siparişler**: Aktif siparişleri görüntüleyin ve durumlarını güncelleyin
- **Hesap**: Masaların hesaplarını çıkarın ve fatura oluşturun

## Katkıda Bulunma

1. Bu repoyu fork edin
2. Yeni bir Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Harika özellik eklendi'`)
4. Branch'inizi Push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Daha fazla bilgi için `LICENSE` dosyasına bakın. 