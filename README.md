# BlockBlast — inceleme notları

Bu depo, Drive'daki Block Blast 10.9.2 XAPK dosyasının incelenmesi için
hazırlanmıştır; **henüz oyuna entegre edilmiş bir mod menü veya derlenmiş APK içermez**.

## İlk bulgular

- Dosya bir kaynak kod projesi değil, temel APK ve Android yapılandırma
  bölümlerinden oluşan bir XAPK arşividir. Envanter:
  [`analysis/archive-inventory.txt`](analysis/archive-inventory.txt).
- REA 6.7.0 ile APK üzerinde `inspect-artifact` çalıştırıldı. Temel APK'nın
  SHA-256 değeri `0d0ea68549d0498adeebd43a93afae76983e1da84dd201214e403dc5d5e58469`.
- ARM64 bölümü `libcocos2djs.so` içeriyor. Temel oyun JavaScript dosyaları
  düz UTF-8 değil; `HEK:` başlığıyla başlıyor. Bu nedenle skor güncelleme
  kodu henüz belirlenemedi. Küçük bulgu dosyaları `analysis/` altında.
- XAPK, yeniden imzalama gerektiğinden orijinal uygulamanın üzerine doğrudan
  kurulabilecek tek bir APK olarak değerlendirilemez; gerekli bölümler de
  dikkate alınmalıdır.

## Araçlar

`tools/inspect_archive.py`, `tools/inspect_scripts.py` ve
`tools/inspect_native.py` yerel bir XAPK üzerinde çalışır. Örneğin:

```sh
python3 tools/inspect_archive.py /path/to/source.xapk /tmp/blockblast-apks
python3 tools/inspect_scripts.py /path/to/source.xapk
python3 tools/inspect_native.py /path/to/source.xapk
```

Oyun dosyaları depoya eklenmedi. GitHub Actions aracılığıyla alınan geçici
kaynak arşivi analiz sonrasında silindi; Drive dosyası tekrar özel yapıldı.
Skor mantığının tespiti, menünün oyuna uygulanması ve modlu oyun paketinin
imzalanması ile oyun üzerinde doğrulama henüz **yapılmadı**.

## Mod menü bileşeni (henüz oyuna bağlı değil)

`menu/` altında etkinlik içine eklenebilen, sürüklenebilir bir Android menü
ve 1x/10x/100x/1000x skor çarpanı bileşeni bulunmaktadır. Menü uygulama
penceresi içinde çalışmak üzere tasarlanmıştır; sistem overlay izni istemez.
Tercih cihazda saklanır. Pozitif skor artışları için kullanılacak aritmetik,
negatif cezaları değiştirmez ve taşmada `int` üst sınırına sabitlenir.

Bu bileşen henüz oyun APK'sına enjekte edilmedi ve puan güncelleme noktasına
bağlanmadı. `menu-check.yml` bileşeni derler ve aritmetik testini çalıştırır;
`menu-ui-test.yml` ise geçici bir test uygulamasını emülatörde çalıştırarak
seçimleri, tercihin saklanmasını, sürüklemeyi ve arka plana dokunma geçişini
kontrol eder. Bu iş akışları modlu oyun APK'sı üretmez.

Ghidra incelemesinde ilgili şifre çözme hata metinleri `.note.gnu.proc` olarak
adlandırılan bölgede bulundu, fakat kod referansları tespit edilemedi.
REA'nın ELF yerleşimi incelemesi ise 32 MiB dosya sınırı nedeniyle bu 35 MB
kütüphaneyi kabul etmedi. Bu bulgular kendi başına puan bağlama noktasını
göstermemektedir.

## Oyun emülatörü araştırması

- Orijinal XAPK'nın tüm bölümleri x86_64/ARM çevirili Android 11 emülatöre
  kurulabildi, ancak ilk açılış yanlış mimarideki `libnesec-x86.so` yüzünden
  `UnsatisfiedLinkError` ile başarısız oldu.
- Yalnızca geçici test için ARM64 kütüphane ikamesi ve bütün bölümlerin aynı
  geçici anahtarla yeniden imzalanması denendi. Son denemede React başlatma
  sırasında `AssertionError` görüldü; oynanabilir açılış doğrulanmadı.
- REA/JADX temel APK'da 44.415 sınıf gördü; çalışma zamanındaki Cocos ve
  `DemokApplication` adlarını statik sınıf aramasında bulmadı. Çalışma zamanı
  yığınında bir uygulama sarmalayıcısı da görülüyor. Bu gözlemler tek başına
  skor kodunun yerini veya hatanın kesin nedenini belirlemiyor.
- Ham oyun dosyası depoya eklenmedi; test artifaktı saklanmadı.

### Yerel ARM Android incelemesi

GitHub'ın ARM64 koşucusunda izole Redroid Android 13 kullanılarak orijinal
bölünmüş paketler açıldı. Kullanıcının test için verdiği onayla kullanım
koşulları geçildi ve isteğe bağlı bildirim izni reddedildi. Eğitim hamleleri
sonrasında boş oyun tahtasına ulaşıldı. Frida, Cocos JavaScript köprüsüne
GL iş parçacığından erişebiliyor ve skor alanlarını okuyabiliyor.

Eğitim sonunda `ClassTopInfo._state.currentScore` 124 olarak okunmasına
rağmen ekranda yeni oyunun skoru 0 göründü; bu alanın gerçek oyunda skorun
tek kaynağı olduğu **henüz doğrulanmadı**. Test sarmalayıcıları da henüz
kullanılabilir bir skor güncelleme çağrısı yakalamadı. Dolayısıyla bu sonuç,
çarpanın uygulandığı veya modlu APK'nın oluşturulduğu anlamına gelmez.
`analysis/arm-game-probe.txt` son testin ayrıntılarını içerir.
