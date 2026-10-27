/**
 * =============================================================================
 *  generate-dummy-images.cjs
 *  Pembuat gambar placeholder untuk folder /uploads milik `bedengan-be`
 * =============================================================================
 *
 *  MASALAH YANG DISELESAIKAN
 *  Tabel `grounds`, `catalogs`, dan `site_configs` di db_bedengan menyimpan path
 *  gambar (kolom image_url), misalnya "/uploads/grounds/ground_a.jpg".
 *  Tapi folder uploads/ baru berisi .gitkeep, sehingga Flutter dan Next.js
 *  yang membuka URL gambar itu mendapat Error 404.
 *
 *  CARA KERJA
 *  1. Membaca path gambar langsung dari database (bukan menebak nama file),
 *     jadi hasilnya pasti sama dengan yang dikembalikan API.
 *  2. Membuat gambar placeholder tepat di path tersebut:
 *       - Foto Ground & Katalog -> JPG 1200x800 (warna mengikuti tema / kategori)
 *       - Denah kawasan         -> PNG 1600x1000 (berisi kotak Ground A-M)
 *       - Peta evakuasi         -> PNG 1600x1000 (ditandai jelas BUKAN peta resmi)
 *  3. File yang SUDAH ADA tidak ditimpa, jadi aman kalau nanti kamu sudah
 *     punya foto asli. Pakai --force kalau memang ingin menimpa semuanya
 *     (hati-hati: foto asli juga ikut tertimpa).
 *  4. Kalau MySQL tidak bisa dihubungi, skrip tetap membuat gambar default
 *     (ground_a..m.jpg dan 2 peta) berdasarkan data PRD. Gambar katalog
 *     dilewati karena nama filenya hanya ada di database.
 *
 *  CARA PAKAI (jalankan dari folder bedengan-be)
 *      npm install --save-dev jimp@0.22.12
 *      node scripts/generate-dummy-images.cjs
 *      node scripts/generate-dummy-images.cjs --force
 *
 *  Kenapa .cjs? Supaya skrip tetap jalan walaupun package.json memakai
 *  "type": "module".
 * =============================================================================
 */
'use strict';

const fs = require('fs');
const path = require('path');

/* =============================================================================
 * 1. PENGATURAN DASAR
 * ========================================================================== */
const ROOT = path.resolve(__dirname, '..'); // folder bedengan-be (satu tingkat di atas /scripts)
const UPLOADS_DIR = path.join(ROOT, 'uploads');
const FORCE = process.argv.includes('--force'); // timpa file yang sudah ada?

const PHOTO_SIZE = { w: 1200, h: 800 }; // foto Ground & Katalog (JPG, rasio 3:2)
const MAP_SIZE = { w: 1600, h: 1000 }; // peta denah & evakuasi (PNG)
const SUPPORTED_EXT = ['.jpg', '.jpeg', '.png']; // Jimp 0.22 tidak bisa menulis .webp

// Warna gradasi [atas, bawah] dalam format [R, G, B].
// Nama tema sama persis dengan ENUM highlight_theme di tabel grounds.
const THEMES = {
    green: { top: [27, 94, 32], bottom: [67, 160, 71] },
    blue: { top: [13, 71, 161], bottom: [30, 136, 229] },
    orange: { top: [191, 54, 12], bottom: [245, 124, 0] },
    teal: { top: [0, 77, 64], bottom: [0, 137, 123] },
    purple: { top: [74, 20, 140], bottom: [142, 36, 170] },
    red: { top: [127, 0, 0], bottom: [198, 40, 40] }, // khusus peta evakuasi
    gray: { top: [55, 71, 79], bottom: [96, 125, 139] }, // cadangan jika tema tidak dikenal
};

// Tabel catalogs tidak punya kolom tema, jadi warna ditentukan dari kategorinya.
const CATEGORY_THEME = { rental: 'blue', warung: 'orange', photographer: 'purple' };
const CATEGORY_LABEL = {
    rental: 'SEWA ALAT',
    warung: 'WARUNG LOKAL',
    photographer: 'JASA FOTOGRAFER',
};

// Data cadangan dari PRD (hanya dipakai kalau database tidak bisa dibaca).
const DEFAULT_GROUNDS = [
    ['A', 'green'], ['B', 'green'], ['C', 'blue'], ['D', 'green'], ['E', 'green'],
    ['F', 'green'], ['G', 'green'], ['H', 'green'], ['I', 'blue'], ['J', 'green'],
    ['K', 'orange'], ['L', 'teal'], ['M', 'purple'],
].map(([code, theme]) => ({
    code,
    name: `GROUND ${code}`,
    highlight_theme: theme,
    image_url: `/uploads/grounds/ground_${code.toLowerCase()}.jpg`,
}));
const DEFAULT_DENAH_URL = '/uploads/maps/bedengan_map.png';
const DEFAULT_EVAC_URL = '/uploads/maps/evacuation_map.png';

// Pesan di terminal sengaja ASCII saja supaya aman di CMD / PowerShell lama.
const log = {
    ok: (msg) => console.log(`  [OK]    ${msg}`),
    skip: (msg) => console.log(`  [LEWAT] ${msg}`),
    warn: (msg) => console.warn(`  [WARN]  ${msg}`),
    err: (msg) => console.error(`  [GAGAL] ${msg}`),
};

function fatal(msg) {
    console.error(`\n[GAGAL] ${msg}\n`);
    process.exit(1);
}

/* =============================================================================
 * 2. MEMUAT LIBRARY (dengan pesan error yang jelas)
 * ========================================================================== */
let Jimp;
try {
    Jimp = require('jimp');
} catch (e) {
    fatal('Library "jimp" belum terpasang.\n        Jalankan dulu:  npm install --save-dev jimp@0.22.12');
}
if (typeof Jimp.loadFont !== 'function') {
    // Jimp 1.x punya API berbeda; skrip ini ditulis untuk 0.22.x.
    fatal('Versi jimp tidak cocok (skrip ini butuh jimp 0.22.x).\n        Jalankan:  npm install --save-dev jimp@0.22.12');
}

// Pakai file .env yang sama dengan server supaya koneksi database identik.
try {
    require('dotenv').config({ path: path.join(ROOT, '.env'), quiet: true });
} catch (e) {
    log.warn('Paket dotenv tidak ditemukan, memakai pengaturan database bawaan.');
}

let mysql = null;
try {
    mysql = require('mysql2/promise');
} catch (e) {
    /* ditangani di readDatabase() */
}

/* =============================================================================
 * 3. MEMBACA DATABASE (nama tabel & kolom persis sesuai PRD bagian 3)
 * ========================================================================== */
async function readDatabase() {
    if (!mysql) throw new Error('paket mysql2 tidak ditemukan');

    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'db_bedengan',
        connectTimeout: 5000, // jangan menggantung kalau MySQL mati
    });

    try {
        const [grounds] = await conn.query(
            'SELECT code, name, image_url, highlight_theme FROM grounds ORDER BY code ASC'
        );
        const [catalogs] = await conn.query(
            'SELECT id, category, name, image_url FROM catalogs ORDER BY id ASC'
        );
        const [configs] = await conn.query(
            "SELECT config_key, config_value FROM site_configs " +
            "WHERE config_key IN ('overall_ground_map_url', 'evacuation_map_url')"
        );
        return { grounds, catalogs, configs };
    } finally {
        await conn.end(); // selalu tutup koneksi, walau query gagal
    }
}

/* =============================================================================
 * 4. FUNGSI BANTU
 * ========================================================================== */

// Ubah path dari database (/uploads/...) menjadi path file di komputer.
// Mengembalikan null kalau path tidak aman / bukan milik folder uploads.
function toLocalFile(urlPath) {
    if (typeof urlPath !== 'string' || !urlPath.trim()) return null;
    const clean = urlPath.trim().split('?')[0].replace(/\\/g, '/');
    if (!clean.startsWith('/uploads/')) return null; // URL luar / path aneh bukan urusan skrip ini

    // Awali dengan '.' supaya path.resolve membaca ini sebagai path RELATIF.
    // (Tanpa '.', di Windows "/uploads/x" bisa dibaca sebagai C:\uploads\x.)
    const abs = path.resolve(ROOT, '.' + clean);

    // Cegah path traversal seperti "/uploads/../../sesuatu.jpg".
    return abs.startsWith(UPLOADS_DIR + path.sep) ? abs : null;
}

// Font bitmap Jimp hanya punya karakter ASCII, jadi buang tanda aksen & simbol lain.
function ascii(value) {
    return String(value == null ? '' : value)
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E]/g, '')
        .replace(/\s+/g, ' ') // simbol yang dibuang bisa meninggalkan spasi ganda
        .trim();
}

/* =============================================================================
 * 5. MENGGAMBAR (gradasi, kotak, teks)
 * ========================================================================== */
const FONTS = {};
async function loadFonts() {
    FONTS.f128 = await Jimp.loadFont(Jimp.FONT_SANS_128_WHITE);
    FONTS.f64 = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
    FONTS.f32 = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
    FONTS.f16 = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
}

// Kanvas dengan gradasi vertikal (atas gelap -> bawah lebih terang).
function newGradient(w, h, themeName) {
    const theme = THEMES[themeName] || THEMES.gray;
    const img = new Jimp(w, h, 0x000000ff);
    img.scan(0, 0, w, h, function (x, y, idx) {
        const t = y / (h - 1);
        for (let c = 0; c < 3; c++) {
            this.bitmap.data[idx + c] = Math.round(theme.top[c] + (theme.bottom[c] - theme.top[c]) * t);
        }
        this.bitmap.data[idx + 3] = 255;
    });
    return img;
}

// Kotak berisi warna. alpha 1 = pekat, 0.35 = transparan (dicampur dengan latar).
function fillRect(img, x, y, w, h, rgb, alpha = 1) {
    img.scan(Math.round(x), Math.round(y), Math.round(w), Math.round(h), function (px, py, idx) {
        for (let c = 0; c < 3; c++) {
            this.bitmap.data[idx + c] = Math.round(this.bitmap.data[idx + c] * (1 - alpha) + rgb[c] * alpha);
        }
    });
}

// Garis tepi kotak = 4 kotak tipis.
function strokeRect(img, x, y, w, h, thick, rgb, alpha = 1) {
    fillRect(img, x, y, w, thick, rgb, alpha); // atas
    fillRect(img, x, y + h - thick, w, thick, rgb, alpha); // bawah
    fillRect(img, x, y + thick, thick, h - 2 * thick, rgb, alpha); // kiri
    fillRect(img, x + w - thick, y + thick, thick, h - 2 * thick, rgb, alpha); // kanan
}

// Pilih font terbesar yang masih muat di kotak (kata terpanjang <= lebar, tinggi <= tinggi kotak).
function pickFont(fonts, text, maxW, maxH) {
    for (const font of fonts) {
        const longestWord = Math.max(...text.split(/\s+/).map((word) => Jimp.measureText(font, word)));
        const height = Jimp.measureTextHeight(font, text, maxW);
        if (longestWord <= maxW && height <= maxH) return font;
    }
    return fonts[fonts.length - 1]; // font terkecil sebagai jalan terakhir
}

// Cetak teks di tengah sebuah kotak (x, y, lebar, tinggi). Teks panjang otomatis turun baris.
function fitText(img, fonts, text, x, y, w, h) {
    const font = pickFont(fonts, text, Math.round(w), Math.round(h));
    img.print(
        font,
        Math.round(x),
        Math.round(y),
        { text, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER, alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE },
        Math.round(w),
        Math.round(h)
    );
}

// Gambar "foto": gradasi + bingkai + judul besar + pita keterangan di bawah.
function renderPhoto({ size, theme, badge, title, note, footer }) {
    const { w, h } = size;
    const img = newGradient(w, h, theme);

    strokeRect(img, 24, 24, w - 48, h - 48, 4, [255, 255, 255], 0.6);

    if (badge) fitText(img, [FONTS.f32], badge, 0, h * 0.09, w, 50);
    fitText(img, [FONTS.f128, FONTS.f64, FONTS.f32], title, 80, h * 0.2, w - 160, h * 0.5);

    // Pita gelap transparan di bawah: baris 1 = label placeholder, baris 2 = path file.
    const bandH = 150;
    fillRect(img, 0, h - bandH, w, bandH, [0, 0, 0], 0.35);
    fitText(img, [FONTS.f32, FONTS.f16], note, 50, h - bandH + 15, w - 100, 50);
    fitText(img, [FONTS.f32, FONTS.f16], footer, 50, h - bandH + 75, w - 100, 50);
    return img;
}

// Denah kawasan: kotak Ground A-M (5 kolom x 3 baris), warna mengikuti highlight_theme.
function renderDenah({ grounds, footer }) {
    const { w, h } = MAP_SIZE;
    const img = new Jimp(w, h, Jimp.rgbaToInt(236, 239, 241, 255));

    fillRect(img, 0, 0, w, 190, [27, 94, 32]);
    fitText(img, [FONTS.f64], 'DENAH KAWASAN BEDENGAN', 0, 25, w, 90);
    fitText(img, [FONTS.f32], 'Skema sementara - bukan peta resmi dan bukan skala', 0, 120, w, 50);

    const cols = 5, boxW = 280, boxH = 190, gap = 30;
    const startX = Math.round((w - (cols * boxW + (cols - 1) * gap)) / 2);
    const startY = 240;
    grounds.slice(0, 15).forEach((g, i) => {
        const x = startX + (i % cols) * (boxW + gap);
        const y = startY + Math.floor(i / cols) * (boxH + gap);
        const theme = THEMES[g.highlight_theme] || THEMES.gray;
        fillRect(img, x, y, boxW, boxH, theme.top);
        fitText(img, [FONTS.f128, FONTS.f64], ascii(g.code) || '?', x, y, boxW, boxH);
    });

    fillRect(img, 0, h - 90, w, 90, [38, 50, 56]);
    fitText(img, [FONTS.f32, FONTS.f16], `PLACEHOLDER - ${footer}`, 50, h - 90, w - 100, 90);
    return img;
}

// Pilih cara menggambar sesuai jenis item.
function render(item) {
    const footer = ascii(item.urlPath);
    switch (item.kind) {
        case 'photo':
            return renderPhoto({
                size: PHOTO_SIZE,
                theme: item.theme,
                badge: item.badge,
                title: item.title,
                note: 'GAMBAR SEMENTARA (PLACEHOLDER) - Bedengan Xplore',
                footer,
            });
        case 'denah':
            return renderDenah({ grounds: item.grounds, footer });
        case 'evac':
            // Ini peta keselamatan, jadi harus jelas bukan data asli supaya tidak menyesatkan.
            return renderPhoto({
                size: MAP_SIZE,
                theme: 'red',
                badge: 'PETA EVAKUASI',
                title: 'BELUM ADA PETA RESMI',
                note: 'GAMBAR SEMENTARA - JANGAN DIPAKAI SEBAGAI PETUNJUK EVAKUASI',
                footer,
            });
        default:
            throw new Error(`jenis gambar tidak dikenal: ${item.kind}`);
    }
}

/* =============================================================================
 * 6. MENYUSUN DAFTAR FILE YANG HARUS ADA
 * ========================================================================== */
async function buildManifest() {
    let db = null;
    try {
        db = await readDatabase();
        log.ok(`Database terbaca: ${db.grounds.length} ground, ${db.catalogs.length} katalog`);
    } catch (err) {
        log.warn(`Database tidak bisa dibaca (${err.code || err.message}).`);
        log.warn('Memakai data cadangan dari PRD; gambar katalog dilewati.');
        log.warn('Nyalakan MySQL di Laragon, lalu jalankan skrip ini lagi untuk membuat gambar katalog.');
    }

    let grounds = db ? db.grounds : [];
    if (grounds.length === 0) {
        if (db) log.warn('Tabel grounds kosong (sudah menjalankan "npm run seed"?). Memakai data cadangan PRD.');
        grounds = DEFAULT_GROUNDS;
    }
    const catalogs = db ? db.catalogs : [];
    const cfg = {};
    if (db) db.configs.forEach((row) => { cfg[row.config_key] = row.config_value; });

    // Kunci Map = path file absolut, jadi dua baris database dengan gambar yang sama
    // hanya menghasilkan satu file.
    const items = new Map();
    const add = (label, urlPath, spec) => {
        const abs = toLocalFile(urlPath);
        if (!abs) {
            log.skip(`${label}: image_url "${urlPath}" bukan path /uploads/ yang valid, dilewati`);
            return;
        }
        const ext = path.extname(abs).toLowerCase();
        if (!SUPPORTED_EXT.includes(ext)) {
            log.skip(`${label}: format "${ext}" tidak didukung generator (hanya .jpg/.jpeg/.png), dilewati`);
            return;
        }
        if (!items.has(abs)) items.set(abs, { abs, urlPath: urlPath.trim(), ...spec });
    };

    grounds.forEach((g) =>
        add(`grounds ${g.code}`, g.image_url, {
            kind: 'photo',
            theme: g.highlight_theme,
            badge: 'ZONA PERKEMAHAN',
            title: ascii(g.name) || `GROUND ${ascii(g.code)}`,
        })
    );

    catalogs.forEach((c) =>
        add(`catalogs #${c.id}`, c.image_url, {
            kind: 'photo',
            theme: CATEGORY_THEME[c.category],
            badge: CATEGORY_LABEL[c.category],
            title: ascii(c.name) || `KATALOG ${c.id}`,
        })
    );

    add('peta denah', cfg.overall_ground_map_url || DEFAULT_DENAH_URL, { kind: 'denah', grounds });
    add('peta evakuasi', cfg.evacuation_map_url || DEFAULT_EVAC_URL, { kind: 'evac' });

    return [...items.values()];
}

/* =============================================================================
 * 7. PROGRAM UTAMA
 * ========================================================================== */
async function main() {
    console.log('\n=== Generator Gambar Placeholder - Bedengan Xplore ===');
    if (FORCE) log.warn('Mode --force aktif: file yang sudah ada AKAN DITIMPA (termasuk foto asli).');

    await loadFonts();
    const items = await buildManifest();

    let created = 0, skipped = 0, failed = 0;

    for (const item of items) {
        try {
            // Aman secara default: jangan timpa file yang sudah ada.
            if (fs.existsSync(item.abs) && !FORCE) {
                skipped++;
                log.skip(`${item.urlPath}  (sudah ada, tidak ditimpa)`);
                continue;
            }

            const img = render(item);
            const ext = path.extname(item.abs).toLowerCase();
            if (ext === '.jpg' || ext === '.jpeg') img.quality(82); // kualitas JPG: cukup tajam, ukuran kecil

            fs.mkdirSync(path.dirname(item.abs), { recursive: true });
            await img.writeAsync(item.abs);

            // Double-check: baca ulang file yang baru ditulis. Kalau bisa didecode dengan
            // ukuran yang benar, berarti gambarnya valid dan siap dibuka Flutter / browser.
            const check = await Jimp.read(item.abs);
            const kb = (fs.statSync(item.abs).size / 1024).toFixed(0);
            created++;
            log.ok(`${item.urlPath}  ${check.bitmap.width}x${check.bitmap.height}  ${kb} KB`);
        } catch (err) {
            failed++;
            log.err(`${item.urlPath}: ${err.message}`);
        }
    }

    console.log(`\nRingkasan: dibuat ${created} | dilewati ${skipped} | gagal ${failed}`);
    if (items.length > 0) {
        const port = process.env.PORT || 5000;
        console.log('Tes cepat di browser (server harus jalan: npm run dev):');
        console.log(`  http://localhost:${port}${items[0].urlPath}\n`);
    }
    if (failed > 0) process.exitCode = 1;
}

main().catch((err) => fatal(err.stack || err.message));
