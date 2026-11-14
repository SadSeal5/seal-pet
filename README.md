# 🦭 Fok — Masaüstü Pet

Windows masaüstünde yaşayan, pixel art bir fok. Şeffaf pencere, click-through, fizik, ihtiyaç sistemi.

![Fok masaüstünde](docs/screenshot.png)

## Çalıştırma

```bash
npm install
npm start
```

İlk çalıştırmada Electron ikilisi iner (~100 MB), sonrası hızlı.

## Kontroller

| Etkileşim | Sonuç |
|---|---|
| Sol tık (fokun üstüne) | Sevme — kalpler, mutluluk +9 |
| Sürükle | Havada asılı kalır; bırakınca düşer, fırlatınca yuvarlanır |
| Çift tık | Kutlama spini |
| Sağ tık | Menü: Besle / Sev / Oyna / Arkadaş çağır / Uyut / Durum / Ayarlar / Gizle / Çıkış |
| Topu sürükle | Fizikli top; fok peşinden koşar, burnunda dengeler |
| Balığı sürükle | Fok yaklaşıp yer |

Masaüstünün geri kalanı normal çalışır: pencere yalnızca imleç fokun/topun/menünün üstündeyken fareyi yakalar.
İmleç konumu ana süreçten yoklanır (33 ms), böylece `forward:true` fare olaylarına bağımlı değildir.

## Arkadaşlar

Ara sıra masaüstüne bir arkadaş gelir: 🐧 penguen, 🦦 su samuru, 🐦 martı, 🦀 yengeç, 🐟 balık.
Kenardan girer, fokun yanına yürür, 10–20 saniye takılır, arada foka doğru zıplar, sonra gider.
Aynı anda en fazla 2 arkadaş olur. Sağ tık menüsünden "🐧 Arkadaş çağır" ile hemen çağırabilirsiniz.

## Ortam farkındalığı

- Kullanıcı 10 dakikadır boştaysa fok da uyur
- Gece 22:00–07:00 arası daha sık esner / uyur
- Pilde çalışırken huzursuzlanır (annoyed)
- Tray menüsünden "Rahatsız Etme" ile gizlenebilir, paketlenmiş sürümde "Başlangıçta aç"

## Sprite üretimi

Tüm kareler kodla üretilir (16 renkli kilitli palet, 48×48, 1px outline):

```bash
python tools/gen_sprites.py    # fok: 23 klip + props + ikonlar
python tools/gen_friends.py    # arkadaşlar: 5 tür × 2 klip (32×32)
```

Çıktılar:
- `assets/seal/*.png` — 23 klip, yatay şerit
- `assets/seal/atlas.json` — klip meta verisi
- `assets/friends/*.png` + `friends.json` — arkadaş şeritleri
- `assets/icon.png`, `assets/tray.png`
- `tools/preview.png` — tüm kliplerin kontak sayfası
- `tools/friends_preview.png` — arkadaşların kontak sayfası
- `tools/zoom.png`, `tools/head.png` — yakın inceleme

Paleti değiştirmek için `tools/gen_sprites.py` içindeki `PAL` sözlüğünü düzenleyip yeniden üretin.

## Mimari

```
electron/main.js      pencere, tray, IPC, kayıt, imleç/ortam yoklaması
electron/preload.js   güvenli köprü
src/main.js           oyun döngüsü, giriş, hit-test, click-through
src/engine/animator.js sprite şerit animatörü
src/engine/audio.js   WebAudio 8-bit efektler
src/pet/pet.js        fizik, animasyon durumu, ihtiyaçlar, kayıt
src/pet/ai.js         utility tabanlı davranış seçici
src/world/toys.js     top / balık fiziği
src/world/friends.js  ziyaretçi arkadaşlar
src/ui/ui.js          menü, durum paneli, ayarlar
```

Kayıt: `%APPDATA%/seal-pet/save.json`

## Ayarlar

- **Boyut** 2×–5× (varsayılan 3× = 144 px)
- **Hep üstte**
- **Ses**
- **Fareyi takip et** — fok ara sıra imlece doğru yürür

## Yol haritası

- [x] M0 iskelet, şeffaf pencere, tray
- [x] M1 sprite pipeline + animatör
- [x] M2 fizik, sürükle/fırlat, click-through
- [x] M3 ihtiyaçlar, kayıt, menü
- [x] M4 top, balık, XP
- [x] M5a arkadaşlar (penguen, su samuru, martı, yengeç, balık)
- [x] M5b ortam farkındalığı (boşta uyuma, gece, pil)
- [ ] M5c süsler, mini oyunlar
- [ ] M6 aksesuarlar, mağaza, installer
