# Block Blast 10.9.2 — ARM64 mod

[Modlu APK'yı indir](https://github.com/StrongBomber/BlockBlast/releases/download/blockblast-mod-10.9.2-v4/BlockBlast-10.9.2-mod-arm64.apk) · [Sürüm ve doğrulama dosyası](https://github.com/StrongBomber/BlockBlast/releases/tag/blockblast-mod-10.9.2-v4)

Bu depo, Block Blast 10.9.2 için oyun penceresi içinde sürüklenebilir,
açılıp kapanabilir bir mod menüsü içerir. Klasik modda menüden **Kapalı (1x),
10x, 100x, 1000x, 10000x veya 100000x** seçilebilir. **Özel çarpan gir**
ile 1–2147483647 arasında bir tam sayı yazılabilir; skor 2147483647 üst
sınırında sabitlenir. **Kombo değeri gir** ile 0–1000000 arasında bir değer
oyunun klasik mod sayacına bir kez uygulanır; örneğin 90 ayarlanınca sonraki
başarılı temizlemede sayaç 91 olur. Kombo sabitlenmez, seri bozulursa oyunun
normal kurallarıyla sıfırlanabilir. İstek oyun hazır olana kadar bekler;
uygulama yeniden başlatıldığında tekrar otomatik uygulanmaz.

Menüde **By Raiwesy** yazısı bulunur. Ekrana üç parmakla aynı anda dokunarak menüyü gizleyebilir,
ayni hareketle tekrar gösterebilirsiniz. Gizleme seçili çarpanı değiştirmez.
Tercih cihazda saklanır; sistem overlay izni gerekmez. Çarpan, geçmiş skora değil, kazanılan pozitif puan bileşenlerine
uygulanır. Diğer oyun modlarında kapsamlı test yapılmamıştır.

## Kurulum ve önemli sınırlamalar

- APK yalnızca **ARM64 / arm64-v8a** içindir. Fiziksel cihazların tamamında
  test edilmiş değildir; doğrulama Android 13 ARM64 Redroid ortamındadır.
- Modlu APK, orijinal geliştiricinin değil, bu derlemeye özgü geçici bir test
  anahtarıyla imzalanmıştır. Orijinal uygulamanın üzerine güncelleme olarak
  kurulamaz. Orijinali kaldırmak kayıtlarınızı silebilir; önce uygun bir yedek
  almayı değerlendirin. Sonraki derlemeler farklı anahtarla imzalanacağından
  bu sürümün üzerine güncelleme olarak kurulamayabilir. Bu v4 sürümü de
  önceki modlu APK sürümleri ile farklı anahtara sahiptir ve onların üzerine kurulamaz.
- SHA-256: `0a09b7d5d297f44df5baf2093fbec092dea0c591a449d164bb7f5705b4c0933c`.
  Sürüm sayfasında ayrıca `SHA256SUMS.txt` bulunur.

## Doğrulama

[GitHub Actions 41024669481](https://github.com/StrongBomber/BlockBlast/actions/runs/41024669481)
testinde tek APK derlendi, imzası doğrulandı, ARM64 Android'e kuruldu ve gerçek
oyunda menü aracılığıyla hazır çarpanlar ve özel 37x denendi; 4 puanlık
artış 148 oldu. Kombo 90 olarak ayarlandı ve sonraki gerçek hamlede sayaç 90'dan
devam etti. Ayrı bir kontrollü testte oyunun gerçek temizleme hesaplama metodu
çalıştırılarak 90'dan 91'e ilerleme doğrulandı. Uygulama yeniden başlatıldığında
skorun 1063907 ve 100000x seçiminin korunduğu görüldü. Ayrıntılar
`analysis/menu-injection-probe.txt` ve `analysis/arm-game-probe.txt` dosyalarındadır.
Üç parmakla gizleme ve gösterme, Android girişine gönderilen çoklu dokunma
olaylarıyla gerçek oyunda test edildi; iki parmağın menüyü değiştirmediği ve
ayni hareket içindeki tekrar dokunuşun çift tetiklemediği doğrulandı. Menünün
sürüklenmesi ve arka plana dokunma geçişi ayrıca taklit uygulamada test edildi. Bu sonuçlar tüm cihaz ve oyun modları için garanti değildir.

## Kaynak ve derleme

Kaynak XAPK, kullanıcının onayıyla herkese açık
[GitHub Release](https://github.com/StrongBomber/BlockBlast/releases/tag/blockblast-source-10.9.2)
içindedir. Drive bağımlılığı yoktur. İndirme ve bütünlük doğrulaması:

```sh
bash tools/download_source.sh /tmp/blockblast-source.xapk
```

Kaynak arşiv SHA-256: `b4e19afccd7fea17a7c6e8cea8e91747f4f242cbd62b1539c8d196dab66be503`.
Bu arşiv orijinal pakettir, modlu APK değildir.

`menu-injection-probe.yml`, doğrulanmış kaynağı indirir, binary manifest'e
provider ve DEX ekler, APKEditor ile bölümleri birleştirir, geçici anahtarla
imzalar ve gerçek oyunu test eder. Test başarılıysa tek APK'yı Actions
artifaktı olarak yükler. Test cihazında kullanım koşulları yalnızca daha önce
verilen kullanıcı onayıyla kabul edilir; isteğe bağlı bildirim izni reddedilir.
`menu-check.yml` Java ve JavaScript bileşen testlerini, `menu-ui-test.yml` ise
ayrı arayüz testlerini çalıştırır.

## İnceleme yöntemi

REA 6.7.0, APK envanterinde ve JADX sınıf taramasında kullanıldı. ARM64
`libcocos2djs.so` kütüphanesi ve `HEK:` başlıklı şifreli JavaScript paketleri
statik incelemeyi sınırladı. Çalışma zamanında Cocos modül kayıtları üzerinden
`ClassScore_Proxy.increaseScoreByRound` skor artışı noktası bulundu. Hook,
menü tercihini JNI aracılığıyla okur; `ScoreHookBridge` kodu GL iş parçacığında
kurar. Ghidra/REA araştırma çıktıları `analysis/`, araçlar `tools/` altındadır.
