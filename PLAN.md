# 🦭 Masaüstü Fok Pet — Uygulama Planı

> Hedef: Windows masaüstünde yaşayan, pixel art tarzında, sevimli ve "oynanabilir" bir fok balığı pet'i.

---

## 1. Karakter

**İsim (varsayılan):** `Fok` / kullanıcı değiştirebilir. Öneri: **"Buz"** veya **"Pofuduk"**.

**Görünüm:** Harp seal yavrusu (beyaz-gri, iri gözler, 3 telli bıyık) — pixel art.
- Taban tuval: **48×48 px**, fok gövdesi ~40×28 px
- Palet: **16 renk** (kilitli palet, `palette.json`)
- 1 px koyu outline, 2 ton gölge (cel-shading)
- Ekranda **3× ölçek** (144 px) — ayarlardan 1×–4×
- 2 yön (sol/sağ) + ayna ile 4 yön; yukarı/aşağı sadece göz ve baş eğimi

**Varyantlar (boya/aksesuar ile açılır):** Harbor seal (gri benekli), Leopard seal (lekeli), Buz mavisi, Pembe "pamuk şeker".

---

## 2. Teknoloji Seçimi

| Aday | Artı | Eksi | Karar |
|---|---|---|---|
| **Electron + Canvas2D** | Şeffaf/click-through pencere, tray, hızlı iterasyon, canvas pixel-perfect | ~150 MB paket | ✅ **Önerilen** |
| Tauri (Rust + WebView2) | ~8 MB, hızlı | Şeffaflık + click-through kurulumu zahmetli, Rust öğrenme eğrisi | Alternatif |
| Python + PySide6 | Python tanıdık | Paketleme, animasyon ve UI daha yavaş geliştirilir | Alternatif |
| Godot 4 | Animasyon/fizik hazır | Fazla "oyun", tray/OS entegrasyonu zayıf | ❌ |

**Karar: Electron 3x + saf JS (framework yok).** Renderer'da `<canvas>` + sprite sheet. Build: `electron-builder` → NSIS installer.

---

## 3. Pencere Mimarisi (Windows)

```
┌─ Pet Window (şeffaf, çerçevesiz, always-on-top) ─────────────┐
│  Çalışma alanını kaplar (taskbar hariç)                       │
│  Varsayılan: setIgnoreMouseEvents(true, {forward:true})       │
│  Renderer hit-test → fare fokun üstündeyse click-through off   │
│  İçinde: fok + toplar + arkadaşlar + süsler (hepsi canvas)    │
└───────────────────────────────────────────────────────────────┘
        ▲ IPC
┌─ Main Process ────────────────────────────────────────────────┐
│ tray · save/load · autostart · cursor poll · idle/battery     │
│ fullscreen tespiti · çoklu monitör · ayarlar                  │
└───────────────────────────────────────────────────────────────┘
```

**Neden tek büyük pencere?** Toplar, arkadaşlar ve süsler masaüstünde serbest dolaşabilsin, fok ekran kenarına/taskbar'a oturabilsin diye. Alternatif (fok boyutunda küçük pencereyi her karede taşımak) Windows'ta titreme yapıyor.

**Kritik detaylar**
- `transparent:true, frame:false, hasShadow:false, skipTaskbar:true, resizable:false`
- `alwaysOnTop` + `setAlwaysOnTop(true,'screen-saver')` (tam ekran uygulamaların üstünde kalmaması için ayar)
- **Tam ekran oyun/uygulama algılanınca otomatik gizle** (QoL — yoksa oyun oynanamaz)
- DPI farkı: `devicePixelRatio` ile canvas'ı keskinleştir, `image-rendering: pixelated`
- Çoklu monitör: her monitör için ayrı pencere (v2)
- `powerMonitor.getSystemIdleTime()` → kullanıcı yoksa fok uyur
- `powerMonitor.on('on-battery')` → fok üşür/titrer
- `app.setLoginItemSettings()` → Windows açılışında başlat (opsiyonel)
- Tray: 🦭 ikonuna sağ tık → Besle / Oyna / Uyut / Ayarlar / Gizle / Çıkış

---

## 4. Fok Ne Yapabilsin? (Davranış Kataloğu)

### 4.1 Temel / pasif
| Davranış | Tetik |
|---|---|
| Nefes alma (idle) | varsayılan |
| Göz kırpma (rastgele 3–7 sn) | idle |
| Fareyi gözle takip etme | imleç yakınken |
| Etrafa bakınma, başını çevirme | idle |
| Gerinme + esneme | uykudan sonra |
| Esneme (yawn) | enerji düşükken |
| Uyuma (Zzz baloncukları) | enerji 0 veya kullanıcı idle |
| Karın üstü sürünme (yürüme) | hedefe giderken |
| Ekran kenarına / taskbar'a tırmanıp oturma | rastgele |
| Düşme + yere yaylanarak iniş | sürükleyip bırakınca |
| Sürüklenirken sallanma (dangle) | sürükleme |
| Fırlatılınca çarpıp yuvarlanma | fırlatma hızı > eşik |

### 4.2 Etkileşim (kullanıcı)
| Etkileşim | Tepki |
|---|---|
| Kafasına tıkla → **sevmek** | mutlu zıplama, kalpler, gözler kısılır |
| Karnına tıkla → **gıdıklama** | kıkırdama, yuvarlanma |
| Uzun basıp sürükle | havada asılı kalma, sonra düşme |
| Sağ tık | hızlı menü (Besle / Oyna / Uyut / İstatistik) |
| Çift tık | sevinç spini |
| Balık sürükle-bırak | yer, çiğner, mutlu olur |
| Oyuncak topu sürükle-bırak | topun peşinden koşar, burnunda dengeler |

### 4.3 İhtiyaçlar (needs)
| Stat | Azalma | Etki |
|---|---|---|
| Tokluk (hunger) | uyanıkken 25 sn'de 1 | düşükse balık ister, yavaşlar |
| Mutluluk (happiness) | ilgilenilmezse ~45 sn'de 1 | düşükse üzgün, oyun reddeder |
| Enerji (energy) | uyanıkken 20 sn'de 1 | 0 ise uyur |
| Temizlik (cleanliness) | ~2 dk'da 1 | düşükse mutsuzlaşır, yıkanmak ister |
| Sevgi (affection) | artar | seviye/XP açar |

> Denge: 1 gerçek saat ≈ 1 "fok günü". Bakım zorunlu değil — ihmal edilirse üzülür ama ölmez.

### 4.4 Yetenekler / numaralar (XP ile açılır)
`spin` · `clap` (palet çırpma) · `backflip` · `sing` (baloncuklu nota) · `wave` · `balance ball` · `hoop jump` · `bubble blow` · `dance` · `peek-a-boo`

### 4.5 Oyuncaklar
- **Plaj topu** — gerçek fizik, zıplar, fok peşinden koşar, burnunda dengeler
- **Çember (hoop)** — sürüklenebilir, fok içinden atlar
- **Balık** — yemek + mini oyun hedefi
- **Sabun köpüğü** — patlatınca mutluluk
- **Kova** — fok içine dalar (kafa görünür)
- **Buz bloğu** — üstünde kayar
- **Ördek** — gıcırdar, fok onunla konuşur

### 4.6 Süsler (kalıcı, masaüstüne yerleştirilir)
Buz kütlesi (fok üstünde oturur) · yosun · denizyıldızı · parti flaması · kar yığını (kışın) · deniz kabuğu · küçük buz saçağı · "BUZ" isim tabelası

### 4.7 Arkadaşlar (ara sıra ziyaret eder)
| Arkadaş | Davranış |
|---|---|
| 🐧 Penguen | fokla yarışır, birlikte kayar |
| 🦦 Su samuru | balık paylaşır, sırt üstü yüzer |
| 🐦 Martı | balık çalar, fok kovalar |
| 🦀 Yengeç | yan yan yürür, fok merakla izler |
| 🐟 Küçük balık | zıplar, fok yakalamaya çalışır |

Arkadaşlar 5–20 dk'da bir gelir, 2–5 dk kalır, sonra gider. Aynı anda max 2 arkadaş.

### 4.8 Mini oyunlar
1. **Top Denge** — top burnunda, ritimle tıkla, düşürmeden tut
2. **Balık Yakala** — zıplayan balıklara tıkla, skor
3. **Köpük Patlat** — köpükleri patlat, kombo
4. **Çemberden Atla** — çemberi sürükle, doğru anda tıkla

Skor → **balık parası** → aksesuar ve süs al.

### 4.9 Aksesuarlar (mağaza)
Şapka: parti şapkası, korsan şapkası, taç, Noel şapkası, kulaklık
Boyun: atkı, papyon, kolye
Yüz: güneş gözlüğü, tek göz bandı
Sırt: küçük sırt çantası, deniz kabuğu

### 4.10 Ortam farkındalığı
- Gece (22:00–07:00) → fok uykulu, esner
- CPU %80+ → fok sıcaktan kanat çırpar
- Pil az → üşür, titrer
- Yağmur (opsiyonel hava API) → camdan dışarı bakar, üzgün
- Kullanıcı 10 dk idle → fok da uyur

---

## 5. Animasyon Listesi (v1: 22 klip)

| # | Klip | Kare | FPS | Loop |
|---|---|---|---|---|
| 1 | `idle` | 4 | 4 | ✓ |
| 2 | `blink` | 3 | 12 | ✗ |
| 3 | `look_left` / `look_right` | 2 | 6 | ✗ |
| 4 | `slide` (yürüme) | 6 | 10 | ✓ |
| 5 | `jump` | 4 | 12 | ✗ |
| 6 | `fall` | 3 | 8 | ✓ |
| 7 | `land` | 3 | 14 | ✗ |
| 8 | `sleep` | 4 | 3 | ✓ |
| 9 | `wake` | 3 | 8 | ✗ |
| 10 | `yawn` | 5 | 8 | ✗ |
| 11 | `happy` (zıplama) | 6 | 12 | ✗ |
| 12 | `hearts` | 5 | 10 | ✗ |
| 13 | `sad` | 3 | 4 | ✓ |
| 14 | `annoyed` | 3 | 8 | ✗ |
| 15 | `eat` | 6 | 10 | ✗ |
| 16 | `dangle` (sürüklenme) | 2 | 6 | ✓ |
| 17 | `dizzy` | 4 | 8 | ✓ |
| 18 | `spin` | 6 | 14 | ✗ |
| 19 | `clap` | 4 | 12 | ✗ |
| 20 | `balance_ball` | 4 | 8 | ✗ |
| 21 | `bubble` | 6 | 10 | ✗ |
| 22 | `celebrate` | 8 | 12 | ✗ |

**Sprite sheet formatı:** her klip ayrı PNG (`assets/seal/idle.png`), yatay şerit, + `atlas.json`:
```json
{ "idle": { "file": "idle.png", "frameW": 48, "frameH": 48, "frames": 4, "fps": 4, "loop": true, "events": { "2": "breath_out" } } }
```

---

## 6. Asset Üretim Yolu (3 seçenek)

### A) ✅ Kodla pixel art üretimi (önerilen)
`tools/gen_sprites.py` (Python + Pillow):
- Kilitli 16 renkli palet, 1 px outline, otomatik gölge
- Fok iskeleti parametrik: gövde, baş, paletler, bıyık, göz
- Her klip için frame'leri poz parametreleriyle üretir → tutarlılık garanti
- Çıktı: PNG şeritler + `atlas.json` + `preview.html` (tarayıcıda animasyon önizleme)
- **Artı:** lisans sorunu yok, anında iterasyon, palet değiştirince tüm set değişir
- **Eksi:** el çizimi kadar "sanatsal" değil; ince ayar gerekir

### B) Hazır CC0 sprite paketi (hızlı başlangıç)
itch.io / OpenGameArt'ta "seal" veya "pixel pet" araması. **Lisans (CC0 / CC-BY) kontrol edilmeli**, stil tutarlılığı riski var. Sadece referans veya geçici placeholder için önerilir.

### C) Blender → pixel art render
- Low-poly fok modeli (mevcut `scripts/generate_pets.py` stiline uygun)
- Ortografik kamera, 64×64 render, sonra posterize + nearest-neighbor küçültme
- **Artı:** 3D döndürme, ışık, gölge kolay; top/süs/arkadaş modelleri için ideal
- **Eksi:** 22 klip × kare elle pozlama = yavaş; "3D render pixel art" görünümü el çiziminden farklı
- Not: Blender MCP şu an bağlı değil (addon çalışmıyor) — bu yol seçilirse addon açılmalı

**Öneri:** Fok + arkadaşlar → **A**. Top, kova, çember gibi props → **A** (basit geometri), ileride 3D hissi istenirse **C**.

---

## 7. Proje Yapısı

```
seal-pet/
├─ package.json
├─ electron/
│  ├─ main.js          # app, pencereler, tray, IPC
│  ├─ preload.js       # güvenli köprü
│  ├─ store.js         # save.json (userData)
│  ├─ windows.js       # click-through, fullscreen, monitör
│  └─ tray.js
├─ src/
│  ├─ index.html
│  ├─ main.js          # renderer bootstrap
│  ├─ engine/
│  │  ├─ loop.js       # sabit 60 Hz, dt clamp
│  │  ├─ animator.js   # atlas + state machine
│  │  ├─ physics.js    # yerçekimi, çarpışma, top fiziği
│  │  └─ input.js      # hit-test, drag, throw
│  ├─ pet/
│  │  ├─ state.js      # needs, xp, level, save
│  │  ├─ ai.js         # utility-based davranış seçici
│  │  └─ actions.js    # davranış implementasyonları
│  ├─ world/
│  │  ├─ toys.js
│  │  ├─ friends.js
│  │  └─ decor.js
│  └─ ui/
│     ├─ menu.js       # sağ tık menüsü
│     ├─ settings.js
│     └─ toast.js      # "+5 mutluluk" gibi
├─ assets/
│  ├─ seal/            # sprite şeritleri + atlas.json
│  ├─ props/
│  ├─ friends/
│  ├─ ui/
│  └─ audio/           # 8-bit efektler (üretilebilir)
├─ tools/
│  ├─ gen_sprites.py
│  ├─ gen_audio.py
│  └─ preview.html
└─ docs/PLAN.md
```

**Kayıt dosyası:** `%APPDATA%/seal-pet/save.json` — isim, statlar, XP, aksesuarlar, süs yerleşimi, ayarlar.

---

## 8. Davranış Motoru (AI)

Her 1–2 saniyede **utility skoru** ile aksiyon seç:

```
score(action) = base_weight
              × need_bias(action)      // açsa eat ağırlığı ↑
              × context_bias(action)   // top varsa play_ball ↑
              × cooldown_penalty
              × novelty                // son 3 aksiyon tekrar etmesin
```

- Ağırlıklı rastgele seçim → robotik döngü olmaz
- Kesintiler: sürükleme > düşme > kullanıcı etkileşimi > ihtiyaç > rastgele
- "Kişilik" parametresi (0–1): `lazy ↔ energetic`, `shy ↔ friendly` → iki fok farklı davranır

---

## 9. Yol Haritası

| Milestone | İçerik | Süre |
|---|---|---|
| **M0** | Electron iskeleti, şeffaf pencere, tray, sürüklenebilir placeholder | 0.5 gün |
| **M1** | Sprite pipeline + `idle/blink/slide/sleep` + animator | 1 gün |
| **M2** | Fizik, sürükle/fırlat, imleç takibi, taskbar'a iniş, click-through | 1 gün |
| **M3** | Needs + kayıt + sevme/besleme + sağ tık menüsü | 1 gün |
| **M4** | Top fiziği, çember, 4 numara, XP/seviye | 1.5 gün |
| **M5** | Arkadaşlar, süsler, mini oyunlar | 2 gün |
| **M6** | Ayarlar UI, ses, installer, autostart, tam ekran gizleme, polish | 1.5 gün |

**Toplam ~8.5 gün** (benim çalışma hızımda çok daha kısa; gerçek süre iterasyon sayısına bağlı).

**v1 kapsamı (MVP):** M0–M4 → tek başına oynanabilir, sevimli bir fok. Arkadaşlar + süsler v1.1.

---

## 10. Riskler

| Risk | Çözüm |
|---|---|
| Şeffaf pencerede tıklama geçişi bugları | Hit-test'i canvas alpha'sından yap, `forward:true` kullan |
| Tam ekran oyunlarda rahatsızlık | Otomatik gizleme + tray'den "Rahatsız Etme" |
| İmzasız exe → SmartScreen uyarısı | İlk sürümlerde portable zip; ileride imzalama |
| 22+ animasyon üretimi yavaş | Parametrik üretici + önizleme sayfası ile hızlı iterasyon |
| CPU/batarya tüketimi | 60→30 FPS'e düşür, pencere gizliyken durdur, `requestAnimationFrame` |
| Çoklu monitör/DPI | v2'ye bırak, v1'de ana monitör |

---

## 11. Açık Kararlar

1. **Stack:** Electron mu, Tauri mi, Python mu? → Electron öneriliyor
2. **Art:** Kodla üretim (A) mi, hazır paket (B) mi, Blender (C) mi? → A öneriliyor
3. **Kapsam:** v1 = M0–M4 (yalnız fok) mi, yoksa arkadaşlar da v1'de mi?
4. **Ton:** sadece sevimli mi, yoksa "bakım/ekonomi" katmanı (balık parası, mağaza) olsun mu?
5. `seals-qol` modu ile bağlantı var mı, yoksa tamamen ayrı mı?
