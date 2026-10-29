# Block Blast 10.9.2 — ARM64 mod

[Modlu APK'yı indir](https://github.com/StrongBomber/BlockBlast/releases/download/blockblast-mod-10.9.2-v2/BlockBlast-10.9.2-mod-arm64.apk) · [Sürüm ve doğrulama dosyası](https://github.com/StrongBomber/BlockBlast/releases/tag/blockblast-mod-10.9.2-v2)

Bu depo, Block Blast 10.9.2 için oyun penceresi içinde sürüklenebilir,
açılıp kapanabilir bir mod menüsü içerir. Klasik modda menüden **Kapalı (1x),
10x, 100x, 1000x, 10000x veya 100000x** seçilebilir. Tercih cihazda saklanır; sistem overlay
izni gerekmez. Çarpan, geçmiş skora değil, kazanılan pozitif puan bileşenlerine
uygulanır. Diğer oyun modlarında kapsamlı test yapılmamıştır.

## Kurulum ve önemli sınırlamalar

- APK yalnızca **ARM64 / arm64-v8a** içindir. Fiziksel cihazların tamamında
  test edilmiş değildir; doğrulama Android 13 ARM64 Redroid ortamındadır.
- Modlu APK, orijinal geliştiricinin değil, bu derlemeye özgü geçici bir test
  anahtarıyla imzalanmıştır. Orijinal uygulamanın üzerine güncelleme olarak
  kurulamaz. Orijinali kaldırmak kayıtlarınızı silebilir; önce uygun bir yedek
  almayı değerlendirin. Sonraki derlemeler farklı anahtarla imzalanacağından
  bu sürümün üzerine güncelleme olarak kurulamayabilir. Bu v2 sürümü de
  önceki v1 modlu APK ile farklı anahtara sahiptir ve v1 üzerine kurulamaz.
- SHA-256: `d316f9fee1388f51542d31416e7e8b106fa5eaa9a331d346269b0eed990b572b`.
  Sürüm sayfasında ayrıca `SHA256SUMS.txt` bulunur.

## Doğrulama

[GitHub Actions 40951603156](https://github.com/StrongBomber/BlockBlast/actions/runs/40951603156)
testinde tek APK derlendi, imzası doğrulandı, ARM64 Android'e kuruldu ve gerçek
oyunda menü aracılığıyla altı seçenek ayrı hamlelerle denendi. Örnek olarak
10000x'te 4 puanlık artış 40000, 100000x'te 6 puanlık artış 600000 oldu.
Uygulama yeniden başlatıldığında skorun 646679 olarak ve 100000x seçiminin
korunduğu doğrulandı. Ayrıntılar `analysis/menu-injection-probe.txt` dosyasındadır.
Menünün sürüklenmesi ve arka plana dokunma geçişi ayrıca taklit uygulamada test
edildi. Bu sonuçlar tüm cihaz ve oyun modları için garanti değildir.

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
