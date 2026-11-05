# Kanıt Panosu

Polisiye dizilerdeki kanıt panosunu tarayıcıda kuran, bağımlılıksız web uygulaması..

## Çalıştırma
`index.html` dosyasını tarayıcıda açın. PDF/PNG dışa aktarma için html2canvas ve jsPDF CDN'den yüklenir (internet gerekir).

## GitHub Pages
Settings → Pages → Branch: `main` / `(root)` → Save. Adres: `https://KULLANICI.github.io/REPO/`

## Özellikler
- Mantar pano, tekerlekle zoom, sürükleyerek pan, büyüteç (2.5x)
- Polaroid (fotoğraf yükleme + el yazısı), gazete kupürü, yapışkan not, daktilo fontlu manila belge
- CONFIDENTIAL / SUSPECT mühürleri (karta veya panoya tıkla, çift tıkla sil)
- Renkli sarkan iplar; ipe tıklayınca bantlı not etiketi, Shift+tık ile silme
- Zaman çizelgesi: cetvel + düzenlenebilir etiketler, iplerle bağlanabilir
- İnce kalem, kalın işaretleyici, silgi
- Otomatik kayıt (localStorage) ve JSON proje dosyası
- PNG (1x/2x/3x) ve A4 / A3 / poster 70x100 PDF (300 DPI)

## Kısayollar
V seç · T ip · P kalem · M işaretleyici · E silgi · S mühür · Delete kartı sil

## Bilinen sınırlar / sıradaki işler
- Poster PDF çok bellek kullanır; olmazsa A3 deneyin
- Geri al (undo) yok
- Büyüteç, pano değişince kısa gecikmeyle yenilenir
