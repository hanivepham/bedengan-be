# 🌲 Bedengan Xplore - Backend REST API

REST API Express.js yang modular, aman, dan siap pakai untuk ekosistem **Bedengan Xplore** (mendukung aplikasi mobile Flutter **`bedengan-mobile`** dan web dashboard admin Next.js **`bedengan-adminnext`**).

---

## 📑 Daftar Isi
1. [Fitur Utama](#-fitur-utama)
2. [Teknologi & Dependensi](#-teknologi--dependensi)
3. [Struktur Direktori Proyek](#-struktur-direktori-proyek)
4. [Konfigurasi Environment (.env)](#-konfigurasi-environment-env)
5. [Skema Database & Seeder Data Awal](#-skema-database--seeder-data-awal)
6. [Dokumentasi Lengkap REST API](#-dokumentasi-lengkap-rest-api)
   - [Standar Respons JSON & URL Gambar](#standar-respons-json--url-gambar)
   - [1. Autentikasi Admin (`/api/auth`)](#1-autentikasi-admin-apiauth)
   - [2. Zona Perkemahan (`/api/grounds`)](#2-zona-perkemahan-apigrounds)
   - [3. Katalog Fasilitas & Layanan (`/api/catalogs`)](#3-katalog-fasilitas--layanan-apicatalogs)
   - [4. Panduan Berkemah & Kontak Darurat (`/api/guides`)](#4-panduan-berkemah--kontak-darurat-apiguides)
   - [5. Beranda & Dashboard Admin (`/api/home`)](#5-beranda--dashboard-admin-apihome)
   - [6. Asisten AI Virtual (`/api/ai/chat`)](#6-asisten-ai-virtual-apiaichat)
7. [Panduan Menjalankan Aplikasi](#-panduan-menjalankan-aplikasi)
8. [Akun Default & Catatan Keamanan](#-akun-default--catatan-keamanan)

---

## 🌟 Fitur Utama
- **Modular MVC Architecture**: Struktur kode rapi memisahkan config, controllers, middlewares, routes, dan utils.
- **Dynamic Image Host Formatter**: Seluruh URL gambar relatif otomatis diubah menjadi URL lengkap dinamis (`http://<host>:<port>/uploads/...`) menyesuaikan domain/host pengakses (Flutter, Web Next.js, atau Postman).
- **Admin JWT Authentication**: Otentikasi stateless dengan token JWT 24 jam dan enkripsi password `bcryptjs`.
- **Upload File Aman**: Middleware `multer` dengan validasi ekstensi (`.jpg`, `.jpeg`, `.png`, `.webp`), batas ukuran 5MB, penamaan file unik berbasis *timestamp*, dan perutean folder otomatis (`uploads/grounds/`, `uploads/catalogs/`, `uploads/maps/`).
- **Spesifikasi Lengkap Ground (A - M)**: 13 zona perkemahan terisi lengkap dengan pengelompokan objek `specs` (`area_size`, `terrain_feature`, `nearby_facility`, `toilet_distance`) sekaligus mempertahankan field di root objek.
- **Tanya AI Hibrida (Dual-Engine)**:
  - Menggunakan REST API Google Gemini (`gemini-2.5-flash`) jika `GEMINI_API_KEY` dikonfigurasi.
  - Otomatis beralih (*graceful fallback*) ke *Smart Keyword Rule Engine* lokal berbasis data MySQL jika API Key kosong atau kuota habis.
- **Auto-Retry Database Connection**: Server Express otomatis melakukan percobaan ulang koneksi ke MySQL jika server database sedang *booting*.

---

## 🛠 Teknologi & Dependensi
- **Runtime**: Node.js (v18+)
- **Framework Web**: Express.js (v4.21+)
- **Database**: MySQL 8.x (didukung via Laragon / XAMPP)
- **Database Driver**: `mysql2/promise` (Connection Pool)
- **Keamanan**: `helmet` (Cross-Origin Resource Policy disesuaikan untuk asset statis), `cors` (Origins `*`), `bcryptjs`, `jsonwebtoken`
- **Upload Handler**: `multer`
- **Development Tool**: `nodemon`

---

## 📁 Struktur Direktori Proyek

```text
bedengan-be/
├── .env                              # Konfigurasi environment lokal (diabaikan git)
├── .env.example                      # Template referensi variabel environment
├── .gitignore                        # Aturan pengabaian file git
├── package.json                      # Dependensi dan script npm
├── README.md                         # Dokumentasi lengkap sistem
├── server.js                         # Entry point server Express & koneksi database
├── uploads/                          # Direktori penyimpanan file statis publik
│   ├── grounds/.gitkeep              # Foto zona ground A sampai M
│   ├── catalogs/.gitkeep             # Foto rental, warung, dan fotografer
│   └── maps/.gitkeep                 # Gambar peta kawasan & jalur evakuasi
└── src/
    ├── app.js                        # Konfigurasi middleware Express, CORS, Helmet, Static & Error Handler
    ├── config/
    │   ├── db.js                     # Pool koneksi MySQL menggunakan mysql2/promise
    │   └── seed.js                   # Script migrasi 7 tabel dan pengisi data awal otomatis
    ├── controllers/
    │   ├── authController.js         # Logika autentikasi admin & profil
    │   ├── groundController.js       # Logika 13 zona ground & pengelompokan spesifikasi
    │   ├── catalogController.js      # Logika katalog rental, warung, fotografer & filter
    │   ├── guideController.js        # Logika aturan, etika, peringatan, & kontak darurat
    │   ├── homeController.js         # Logika beranda, ringkasan dashboard, ulasan, & site config
    │   └── aiController.js           # Logika Tanya AI Gemini + fallback knowledge engine
    ├── middlewares/
    │   ├── authMiddleware.js         # Verifikasi Bearer Token JWT
    │   └── uploadMiddleware.js       # Konfigurasi Multer & validasi gambar
    ├── routes/
    │   ├── authRoutes.js             # Rute /api/auth
    │   ├── groundRoutes.js           # Rute /api/grounds
    │   ├── catalogRoutes.js          # Rute /api/catalogs
    │   ├── guideRoutes.js            # Rute /api/guides
    │   ├── homeRoutes.js             # Rute /api/home
    │   └── aiRoutes.js               # Rute /api/ai
    └── utils/
        └── responseHelper.js         # Helper respons standar JSON & pembentuk URL gambar
```

---

## ⚙ Konfigurasi Environment (`.env`)

Buat file `.env` di root direktori dengan menyalin dari `.env.example`:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=db_bedengan
JWT_SECRET=bedengan_xplore_secret_key_2026
GEMINI_API_KEY=
```

> **Catatan Gemini API**: Jika Anda mengisi `GEMINI_API_KEY`, fitur Tanya AI akan menggunakan model AI generatif Google (`gemini-2.5-flash`). Jika dikosongkan, fitur Tanya AI tetap bekerja 100% menggunakan sistem cerdas berbasis konteks database lokal.

---

## 🗄 Skema Database & Seeder Data Awal

Script migrasi dan seeder berada di `src/config/seed.js`. Jalankan perintah berikut untuk membuat database dan mengisi data:
```bash
npm run seed
```

### Tabel yang Dibuat (7 Tabel):
1. **`admins`**: Akun pengelola sistem admin (`id`, `name`, `email`, `password_hash`, `created_at`).
2. **`grounds`**: 13 Zona Ground A-M (`id`, `code`, `name`, `capacity_badge`, `description`, `area_size`, `terrain_feature`, `nearby_facility`, `toilet_distance`, `highlight_text`, `highlight_theme`, `image_url`, `is_active`, `updated_at`).
3. **`catalogs`**: Rental, Warung & Kuliner, Fotografer (`id`, `category`, `name`, `price_text`, `description`, `location_note`, `contact_phone`, `operating_hours`, `image_url`, `status`, `applicant_name`, `social_handle`, `tags`, `created_at`).
4. **`rules`**: Tata tertib, larangan api unggun, dan etika berkemah (`id`, `type`, `title`, `description`, `icon_name`, `display_order`).
5. **`emergency_contacts`**: Pos pengelola, SAR, Polsek, Puskesmas (`id`, `title`, `phone_number`, `location_detail`, `icon_name`).
6. **`reviews`**: Ulasan dan bintang dari pengunjung (`id`, `visitor_name`, `rating`, `comment`, `visit_date`, `is_published`, `created_at`).
7. **`site_configs`**: Konfigurasi umum dinamis (`config_key`, `config_value`, `updated_at`).

### Data Awal 13 Zona Ground:
| Kode | Nama Zona | Kapasitas | Luas | Keunggulan Utama | Tema Warna |
|:---:|:---|:---|:---|:---|:---:|
| **A** | GROUND A | ±35 Tenda | ±850 m² | Akses Ramah Anak-anak (Dekat Pos & Parkir) | `green` |
| **B** | GROUND B | ±20 Tenda | ±520 m² | View Panorama Terasering Lembah Pinus | `green` |
| **C** | GROUND C | ±18 Tenda | ±450 m² | Riverside Camp (Bibir Sungai Jernih) | `blue` |
| **D** | GROUND D | ±40 Tenda | ±1.100 m² | Area Gathering Luas & Lapangan Api Unggun | `green` |
| **E** | GROUND E | ±22 Tenda | ±580 m² | Fasilitas Lengkap (Dekat Warung & Gazebo) | `green` |
| **F** | GROUND F | ±25 Tenda | ±680 m² | Teduh & Rindang (Tegakan Pinus Rapat) | `green` |
| **G** | GROUND G | ±15 Tenda | ±420 m² | Jalur Trekking Sumber Air Pegunungan | `green` |
| **H** | GROUND H | ±8 Tenda | ±240 m² | Private & Tenang (Minim Lalu Lalang) | `green` |
| **I** | GROUND I | ±18 Tenda | ±490 m² | Kids Friendly Water (Sungai Dangkal Tenang) | `blue` |
| **J** | GROUND J | 5 Tenda | ±530 m² | Dekat Mushola Al-Hidayah (Kran Melimpah) | `green` |
| **K** | GROUND K | ±30 Tenda | ±780 m² | Spot Fotogenik Sunrise (Morning Rays) | `orange` |
| **L** | GROUND L | ±12 Tenda | ±350 m² | Spot Syahdu Tikungan Sungai Batu Eksotis | `teal` |
| **M** | GROUND M | ±15 Tenda | ±460 m² | Sky Watchers Pick (Nol Polusi Cahaya / Stargazing) | `purple` |

---

## 📡 Dokumentasi Lengkap REST API

### Standar Respons JSON & URL Gambar
Semua respons server menggunakan format seragam:
```json
{
  "status": "success" | "error",
  "message": "Pesan deskriptif",
  "data": null | [] | {}
}
```
Setiap field gambar (`image_url`, `overall_map_url`, `evacuation_map_url`) otomatis berupa URL lengkap:  
`http://localhost:5000/uploads/grounds/ground_a.jpg`

---

### 1. Autentikasi Admin (`/api/auth`)

#### `POST /api/auth/login`
- **Akses**: Public
- **Body JSON**:
  ```json
  {
    "email": "admin@bedengan.com",
    "password": "password123"
  }
  ```
- **Respons (200 OK)**:
  ```json
  {
    "status": "success",
    "message": "Login berhasil. Selamat datang di Bedengan Xplore Admin!",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "admin": {
        "id": 1,
        "name": "Admin Bedengan",
        "email": "admin@bedengan.com",
        "created_at": "2026-10-17T08:29:08.000Z"
      }
    }
  }
  ```

#### `GET /api/auth/me`
- **Akses**: Protected (`Headers: Authorization: Bearer <token>`)
- **Respons (200 OK)**: Mengembalikan informasi profil akun admin yang sedang login.

#### `PUT /api/auth/profile`
- **Akses**: Protected (`Headers: Authorization: Bearer <token>`)
- **Body JSON**: `{ "name": "...", "current_password": "...", "new_password": "..." }`

---

### 2. Zona Perkemahan (`/api/grounds`)

#### `GET /api/grounds`
- **Akses**: Public
- **Kegunaan**: Menampilkan peta kawasan, etika berkemah, dan daftar 13 zona ground yang telah dikelompokkan spesifikasinya.
- **Respons (200 OK)**:
  ```json
  {
    "status": "success",
    "message": "Daftar zona perkemahan berhasil diambil.",
    "data": {
      "overall_map_url": "http://localhost:5000/uploads/maps/bedengan_map.png",
      "etiquette": {
        "title": "Etika Berkemah di Bedengan",
        "description": "Mohon jaga kelestarian alam hutan pinus Bedengan..."
      },
      "grounds": [
        {
          "id": 1,
          "code": "A",
          "name": "GROUND A",
          "capacity_badge": "Kapasitas: ±35 Tenda",
          "area_size": "Luas: ±850 m²",
          "terrain_feature": "Tanah Rumput Datar",
          "nearby_facility": "Dekat Titik Listrik",
          "toilet_distance": "Toilet ±30 meter",
          "highlight_text": "Akses Ramah Anak-anak",
          "highlight_theme": "green",
          "image_url": "http://localhost:5000/uploads/grounds/ground_a.jpg",
          "is_active": true,
          "specs": {
            "area_size": "Luas: ±850 m²",
            "terrain_feature": "Tanah Rumput Datar",
            "nearby_facility": "Dekat Titik Listrik",
            "toilet_distance": "Toilet ±30 meter"
          }
        }
      ]
    }
  }
  ```

#### `GET /api/grounds/:code`
- **Akses**: Public (Menerima parameter kode huruf `A` s/d `M` atau ID numerik).
- **Respons (200 OK)**: Detail 1 zona ground beserta `specs`.

#### `POST /api/grounds`
- **Akses**: Protected (`Bearer <token>`)
- **Content-Type**: `multipart/form-data`
- **Form Fields**: `code`, `name`, `capacity_badge`, `area_size`, `terrain_feature`, `nearby_facility`, `toilet_distance`, `highlight_text`, `highlight_theme`, `description`, file gambar: `image`.

#### `PUT /api/grounds/:id`
- **Akses**: Protected (`Bearer <token>`)
- **Content-Type**: `multipart/form-data` / `application/json`
- **Kegunaan**: Memperbarui informasi ground atau mengganti foto.

#### `DELETE /api/grounds/:id`
- **Akses**: Protected (`Bearer <token>`)

---

### 3. Katalog Fasilitas & Layanan (`/api/catalogs`)

Kategori yang didukung: `'rental'`, `'warung'`, `'photographer'`.

#### `GET /api/catalogs`
- **Akses**: Public
- **Query Params (Opsional)**:
  - `?category=rental` (atau `warung` / `photographer`)
  - `?status=approved` (atau `pending` / `all`)
  - `?search=soto` (Mencari berdasarkan nama, deskripsi, lokasi, tag, atau nama pemohon)
- **Respons (200 OK)**: Array daftar katalog dengan gambar URL penuh.

#### `GET /api/catalogs/:id`
- **Akses**: Public

#### `POST /api/catalogs`
- **Akses**: Protected Admin (`Bearer <token>`)
- **Content-Type**: `multipart/form-data`
- **Form Fields**: `category`, `name`, `price_text`, `description`, `location_note`, `contact_phone`, `operating_hours`, `tags`, file gambar: `image`.

#### `POST /api/catalogs/apply`
- **Akses**: Public
- **Kegunaan**: Pendaftaran mandiri mitra/warga lokal (otomatis berstatus `pending`).

#### `PUT /api/catalogs/:id`
- **Akses**: Protected Admin (Bisa untuk approve status: `{ "status": "approved" }`).

#### `DELETE /api/catalogs/:id`
- **Akses**: Protected Admin

---

### 4. Panduan Berkemah & Kontak Darurat (`/api/guides`)

#### `GET /api/guides`
- **Akses**: Public
- **Respons (200 OK)**:
  ```json
  {
    "status": "success",
    "message": "Data panduan berkemah berhasil diambil.",
    "data": {
      "evacuation_map_url": "http://localhost:5000/uploads/maps/evacuation_map.png",
      "etiquette_summary": { ... },
      "rules": [ ... ],
      "warnings": [ ... ],
      "etiquette": [ ... ],
      "emergency_contacts": [ ... ]
    }
  }
  ```

#### Manajemen Rules & Warnings (Protected):
- `POST /api/guides/rules`: Tambah aturan (`type`: `rule` | `warning` | `etiquette`, `title`, `description`, `icon_name`, `display_order`).
- `PUT /api/guides/rules/:id`: Perbarui aturan.
- `DELETE /api/guides/rules/:id`: Hapus aturan.

#### Manajemen Kontak Darurat (Protected):
- `POST /api/guides/contacts`: Tambah kontak (`title`, `phone_number`, `location_detail`, `icon_name`).
- `PUT /api/guides/contacts/:id`: Perbarui kontak.
- `DELETE /api/guides/contacts/:id`: Hapus kontak.

---

### 5. Beranda & Dashboard Admin (`/api/home`)

#### `GET /api/home`
- **Akses**: Public (Digunakan untuk halaman beranda Flutter Mobile).
- **Data yang Dikembalikan**:
  - `about_bedengan`
  - `location`: Koordinat Latitude & Longitude serta alamat lengkap.
  - `fees`: Tarif tiket camping dan biaya parkir.
  - `summary`: Total jumlah ground, rental, warung, fotografer.
  - `reviews`: Ulasan pengunjung yang dipublikasikan.

#### `GET /api/home/dashboard`
- **Akses**: Protected Admin (Khusus Dashboard Web Next.js).
- **Data yang Dikembalikan**:
  - `total_warung`: 3
  - `total_rental`: 1
  - `total_photographer`: 2
  - `total_grounds`: 13
  - `pending_count`: Jumlah pengajuan usaha yang berstatus `pending`.
  - `pending_registrations`: Daftar lengkap usaha pending yang menunggu review admin.
  - `recent_activities`: Riwayat aktivitas terbaru sistem.

#### `POST /api/home/reviews`
- **Akses**: Public (Kirim ulasan pengunjung).
- **Body JSON**:
  ```json
  {
    "visitor_name": "Rian Pratama",
    "rating": 5,
    "comment": "Suasana Ground C mantap banget, langsung di bibir sungai jernih!",
    "visit_date": "12 Oktober 2026"
  }
  ```

#### `DELETE /api/home/reviews/:id`
- **Akses**: Protected Admin

#### `PUT /api/home/configs`
- **Akses**: Protected Admin (Memperbarui teks informasi atau biaya operasional).

#### `POST /api/home/configs/upload-map`
- **Akses**: Protected Admin (Mengunggah gambar peta umum atau peta jalur evakuasi baru).

---

### 6. Asisten AI Virtual (`/api/ai/chat`)

Mendukung endpoint `POST /api/ai/chat` dan alias `POST /api/ai`.

- **Akses**: Public
- **Body JSON**:
  ```json
  {
    "message": "Ground mana yang paling ramah untuk anak-anak dan dekat sungai?"
  }
  ```
- **Respons (200 OK)**:
  ```json
  {
    "status": "success",
    "message": "Respons asisten Bedengan berhasil.",
    "data": {
      "reply": "Halo! Untuk kegiatan berkemah bersama keluarga dan anak-anak, kami sangat merekomendasikan:\n1. **GROUND A**: Lokasinya sangat datar, beralaskan rumput lembut, tepat di samping pos registrasi & parkir utama dengan akses listrik mudah.\n2. **GROUND I (Riverside Kids Friendly)**: Aliran sungainya dangkal dan berarus tenang dengan bebatuan halus, sangat aman dan seru untuk bermain air anak-anak didampingi orang tua.\n3. **GROUND E**: Dekat dengan warung makan dan gazebo untuk kenyamanan logistik si kecil.",
      "source": "bedengan-knowledge-engine"
    }
  }
  ```
> **Catatan Algoritma AI**: Sistem cerdas ini mengenali kata kunci seperti `anak/keluarga`, `sungai/riverside`, `stargazing/bintang`, `sunrise/foto`, `mushola/sholat`, `gathering/rombongan`, `sewa tenda/rental`, `makanan/warung/kopi`, `aturan/jam tenang`, `biaya/karcis`, dan `darurat/bantuan`.

---

## 🚀 Panduan Menjalankan Aplikasi

### 1. Prasyarat
- Pastikan MySQL (Laragon / XAMPP) dalam status **Running**.
- Pastikan file `.env` sudah sesuai.

### 2. Jalankan Migrasi & Seeder Database
```bash
npm run seed
```

### 3. Jalankan Server Mode Pengembangan (Live Reload)
```bash
npm run dev
```

### 4. Jalankan Server Mode Produksi
```bash
npm run start
```

---

## 🔐 Akun Default & Catatan Keamanan

- **Email Admin**: `admin@bedengan.com`
- **Password Default**: `password123`
- **Secret Key JWT**: `bedengan_xplore_secret_key_2026`
- **Keamanan Gambar**: Header `Cross-Origin-Resource-Policy: false` diaktifkan pada Helmet Express agar aplikasi frontend Next.js (`localhost:3000`) dan aplikasi Flutter Mobile dapat memuat seluruh file foto di `/uploads/...` tanpa kendala kebijakan CORS.

---
© 2026 **Bedengan Xplore Development Team**. Hak Cipta Dilindungi.
