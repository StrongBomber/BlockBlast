# BlockBlast — inceleme notları

Bu depo, Drive'daki Block Blast 10.9.2 XAPK dosyasının incelenmesi için
hazırlanmıştır; **henüz mod menü veya derlenmiş bir APK içermez**.

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
Skor mantığının tespiti, menünün uygulanması, imzalama ve cihaz testi henüz
**yapılmadı**.
