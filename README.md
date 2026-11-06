# Mantar Pano

Mantar pano üzerinde fikir, ders notu, plan ya da eğlence için bağımlılıksız web aracı.

## Çalıştırma
`index.html` dosyasını tarayıcıda açın. PDF/PNG çıktı için html2canvas ve jsPDF CDN'den yüklenir (internet gerekir).

## Özellikler
- Mantar pano, zoom, gezinme, büyüteç
- Fotoğraf, kupür, yapışkan not, kâğıt, zaman çizelgesi; mühürler (ÖNEMLİ, SINAV, DOĞRU...)
- Kalem / işaretleyici / silgi: gerçek alet imleci, renk ve kalınlık ayarı
- Kartları serbest açıyla döndürme: üstteki ↻ noktası (Shift = 15° adım) veya Açı kaydırıcısı
- Sınıflar: Önemli / Fikir / Soru / Örnek / Tarih / Diğer, filtre
- Otomatik kayıt, JSON kaydet/aç
- PNG (1x/2x/3x) ve A4 / A3 / Poster PDF
  - **Dolu alana sığdır**: boş kenarları keser, sayfayı doldurur
  - **4 sayfaya böl (2×2)** veya 9 sayfa: pano büyük çıkar, sayfaları yan yana yapıştırın
  - PNG'de bölme seçilirse her parça ayrı bir A4 oranlı PNG olarak iner (tarayıcı çoklu indirme izni isteyebilir)

## Mobil ve performans
- İki parmakla yakınlaştırma/kaydırma, alt sekmeli araç çubuğu, büyük dokunma tutamaçları (✕ ↻ ✥ ve boyut)
- Dokunmatikte ilk dokunuş kartı seçer, ikinci dokunuş yazıyı düzenler
- Fotoğraflar eklenirken küçültülür, çizim yalnızca değiştiğinde kaydedilir, ipler kare başına bir kez çizilir
- ? Yardım penceresi ve moda göre değişen ipucu satırı
