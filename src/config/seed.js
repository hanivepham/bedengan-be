require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const runSeed = async () => {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT, 10) || 3306;
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'db_bedengan';

  console.log('----------------------------------------------------');
  console.log(`[SEED] Menghubungkan ke MySQL di ${dbHost}:${dbPort}...`);

  let rootConn;
  try {
    rootConn = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword
    });

    console.log(`[SEED] Membuat database '${dbName}' jika belum ada...`);
    await rootConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await rootConn.end();
  } catch (error) {
    console.error('[SEED ERROR] Gagal menghubungkan ke MySQL tanpa database:', error.message);
    process.exit(1);
  }

  // Buka koneksi langsung ke db_bedengan
  const conn = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    multipleStatements: true
  });

  try {
    console.log(`[SEED] Membuat tabel-tabel di database '${dbName}'...`);

    // 1. Tabel Admins
    await conn.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Tabel Grounds
    await conn.query(`
      CREATE TABLE IF NOT EXISTS grounds (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code CHAR(2) UNIQUE NOT NULL,
        name VARCHAR(50) NOT NULL,
        capacity_badge VARCHAR(100) NOT NULL,
        description TEXT,
        area_size VARCHAR(50),
        terrain_feature VARCHAR(100),
        nearby_facility VARCHAR(100),
        toilet_distance VARCHAR(100),
        highlight_text VARCHAR(100),
        highlight_theme ENUM('green','blue','orange','teal','purple') DEFAULT 'green',
        image_url VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Tabel Catalogs
    await conn.query(`
      CREATE TABLE IF NOT EXISTS catalogs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category ENUM('rental','warung','photographer') NOT NULL,
        name VARCHAR(150) NOT NULL,
        price_text VARCHAR(100),
        description TEXT,
        location_note VARCHAR(150),
        contact_phone VARCHAR(30),
        operating_hours VARCHAR(100),
        image_url VARCHAR(255),
        status VARCHAR(20) DEFAULT 'approved',
        applicant_name VARCHAR(100) DEFAULT NULL,
        social_handle VARCHAR(100) DEFAULT NULL,
        tags VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Tabel Rules & Guides
    await conn.query(`
      CREATE TABLE IF NOT EXISTS rules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('rule','warning','etiquette') NOT NULL,
        title VARCHAR(150) NOT NULL,
        description TEXT,
        icon_name VARCHAR(50),
        display_order INT DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Tabel Emergency Contacts
    await conn.query(`
      CREATE TABLE IF NOT EXISTS emergency_contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        phone_number VARCHAR(30) NOT NULL,
        location_detail VARCHAR(150),
        icon_name VARCHAR(50)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Tabel Reviews
    await conn.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        visitor_name VARCHAR(100) NOT NULL,
        rating INT NOT NULL,
        comment TEXT NOT NULL,
        visit_date VARCHAR(50),
        is_published BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Tabel Site Configs
    await conn.query(`
      CREATE TABLE IF NOT EXISTS site_configs (
        config_key VARCHAR(100) PRIMARY KEY,
        config_value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('[SEED] Seluruh 7 tabel berhasil diverifikasi/dibuat.');

    // --- SEED ADMIN DEFAULT ---
    console.log('[SEED] Mengisi Akun Admin Default...');
    const adminPasswordHash = await bcrypt.hash('password123', 10);
    await conn.query(
      `INSERT INTO admins (name, email, password_hash)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash)`,
      ['Admin Bedengan', 'admin@bedengan.com', adminPasswordHash]
    );

    // --- SEED 13 ZONA GROUND (A - M) ---
    console.log('[SEED] Mengisi data 13 Zona Ground (A - M)...');
    const groundsData = [
      {
        code: 'A',
        name: 'GROUND A',
        capacity_badge: 'Kapasitas: ±35 Tenda',
        area_size: 'Luas: ±850 m²',
        terrain_feature: 'Tanah Rumput Datar',
        nearby_facility: 'Dekat Titik Listrik',
        toilet_distance: 'Toilet ±30 meter',
        highlight_text: 'Akses Ramah Anak-anak',
        highlight_theme: 'green',
        image_url: '/uploads/grounds/ground_a.jpg',
        description: 'Lokasi tepat di samping pos registrasi & area parkir utama. Kontur tanah sangat datar beralaskan rumput lembut.'
      },
      {
        code: 'B',
        name: 'GROUND B',
        capacity_badge: 'Kapasitas: ±20 Tenda',
        area_size: 'Luas: ±520 m²',
        terrain_feature: 'Kontur Terasering',
        nearby_facility: 'Area Terbuka Pinus',
        toilet_distance: 'Toilet Terdekat',
        highlight_text: 'View Panorama',
        highlight_theme: 'green',
        image_url: '/uploads/grounds/ground_b.jpg',
        description: 'Memiliki undakan terasering bertingkat dengan pemandangan terbuka menghadap lembah hutan pinus.'
      },
      {
        code: 'C',
        name: 'GROUND C',
        capacity_badge: 'Kapasitas: ±18 Tenda',
        area_size: 'Luas: ±450 m²',
        terrain_feature: 'Bibir Sungai Berbatu',
        nearby_facility: 'Dekat Warung Kopi',
        toilet_distance: 'Toilet ±45 meter',
        highlight_text: 'Riverside Camp',
        highlight_theme: 'blue',
        image_url: '/uploads/grounds/ground_c.jpg',
        description: 'Bersebelahan langsung dengan aliran air sungai Bedengan yang jernih dan dangkal. Udara sangat sejuk dan segar.'
      },
      {
        code: 'D',
        name: 'GROUND D',
        capacity_badge: 'Kapasitas: ±40 Tenda (Sangat Luas)',
        area_size: 'Luas: ±1.100 m²',
        terrain_feature: 'Spot Api Unggun',
        nearby_facility: 'Rombongan >80 Org',
        toilet_distance: 'Toilet Khusus Blok D',
        highlight_text: 'Area Gathering Luas',
        highlight_theme: 'green',
        image_url: '/uploads/grounds/ground_d.jpg',
        description: 'Area terhampar luas di bagian atas bukit, memiliki lapangan api unggun bersama, favorit untuk gathering kantor atau pramuka.'
      },
      {
        code: 'E',
        name: 'GROUND E',
        capacity_badge: 'Kapasitas: ±22 Tenda',
        area_size: 'Luas: ±580 m²',
        terrain_feature: 'Gazebo Istirahat',
        nearby_facility: 'Warung ±15 meter',
        toilet_distance: 'Toilet Tengah',
        highlight_text: 'Fasilitas Lengkap',
        highlight_theme: 'green',
        image_url: '/uploads/grounds/ground_e.jpg',
        description: 'Sangat strategis bagi camper yang ingin kemudahan membeli makanan hangat, charger ponsel, dan dekat gazebo bersantai.'
      },
      {
        code: 'F',
        name: 'GROUND F',
        capacity_badge: 'Kapasitas: ±25 Tenda',
        area_size: 'Luas: ±680 m²',
        terrain_feature: 'Pohon Pinus Rapat',
        nearby_facility: 'Cocok Pasang Hammock',
        toilet_distance: 'Toilet ±40 meter',
        highlight_text: 'Teduh & Rindang',
        highlight_theme: 'green',
        image_url: '/uploads/grounds/ground_f.jpg',
        description: 'Dikelilingi tegakan pohon pinus tua yang tinggi dan rapat, menahan hembusan angin kencang serta sangat sejuk di siang hari.'
      },
      {
        code: 'G',
        name: 'GROUND G',
        capacity_badge: 'Kapasitas: ±15 Tenda',
        area_size: 'Luas: ±420 m²',
        terrain_feature: 'Tanah Padat Berkerikil',
        nearby_facility: 'Asri & Hening',
        toilet_distance: 'Toilet ±55 meter',
        highlight_text: 'Jalur Trekking',
        highlight_theme: 'green',
        image_url: '/uploads/grounds/ground_g.jpg',
        description: 'Berada di jalur lintasan menuju sumber mata air pegunungan, cocok untuk penikmat alam yang gemar berjalan santai.'
      },
      {
        code: 'H',
        name: 'GROUND H',
        capacity_badge: 'Kapasitas: ±8 Tenda (Mini Area)',
        area_size: 'Luas: ±240 m²',
        terrain_feature: 'Privasi Terjaga',
        nearby_facility: 'Minim Lalu Lalang',
        toilet_distance: 'Toilet ±70 meter',
        highlight_text: 'Private & Tenang',
        highlight_theme: 'green',
        image_url: '/uploads/grounds/ground_h.jpg',
        description: 'Area kompak berkapasitas terbatas, ideal untuk keluarga kecil atau solo camper yang menginginkan privasi tinggi.'
      },
      {
        code: 'I',
        name: 'GROUND I',
        capacity_badge: 'Kapasitas: ±18 Tenda',
        area_size: 'Luas: ±490 m²',
        terrain_feature: 'Sungai Dangkal Tenang',
        nearby_facility: 'Bibir Sungai Datar',
        toilet_distance: 'Toilet ±35 meter',
        highlight_text: 'Kids Friendly Water',
        highlight_theme: 'blue',
        image_url: '/uploads/grounds/ground_i.jpg',
        description: 'Sungai memiliki dasar bebatuan halus dan aliran tenang, sangat aman untuk aktivitas bermain air anak-anak didampingi orang tua.'
      },
      {
        code: 'J',
        name: 'GROUND J',
        capacity_badge: 'Kapasitas: 5 Tenda',
        area_size: 'Luas: ±530 m²',
        terrain_feature: 'Mushola ±25 meter',
        nearby_facility: 'Kran Air Melimpah',
        toilet_distance: 'Toilet 2 ±20 meter',
        highlight_text: 'Dekat Mushola',
        highlight_theme: 'green',
        image_url: '/uploads/grounds/ground_j.jpg',
        description: 'Akses ibadah ke Mushola Al-Hidayah Bedengan hanya 1 menit jalan kaki. Dekat instalasi kran air bersih melimpah.'
      },
      {
        code: 'K',
        name: 'GROUND K',
        capacity_badge: 'Kapasitas: ±30 Tenda',
        area_size: 'Luas: ±780 m²',
        terrain_feature: 'Spot Foto Sunrise',
        nearby_facility: 'Pagi Cepat Hangat',
        toilet_distance: 'Toilet ±50 meter',
        highlight_text: 'Spot Fotogenik',
        highlight_theme: 'orange',
        image_url: '/uploads/grounds/ground_k.jpg',
        description: 'Menghadap ke timur sehingga mendapatkan pendar cahaya fajar (morning rays) pertama yang menembus celah pepohonan pinus.'
      },
      {
        code: 'L',
        name: 'GROUND L',
        capacity_badge: 'Kapasitas: ±12 Tenda',
        area_size: 'Luas: ±350 m²',
        terrain_feature: 'Bebatuan Sungai Eksotis',
        nearby_facility: 'Suasana Tenang Sejuk',
        toilet_distance: 'Toilet ±65 meter',
        highlight_text: 'Spot Syahdu',
        highlight_theme: 'teal',
        image_url: '/uploads/grounds/ground_l.jpg',
        description: 'Terletak persis pada tikungan alami aliran sungai jernih dengan hamparan batu kali alami. Sangat syahdu di sore dan malam hari.'
      },
      {
        code: 'M',
        name: 'GROUND M',
        capacity_badge: 'Kapasitas: ±15 Tenda',
        area_size: 'Luas: ±460 m²',
        terrain_feature: 'Nol Polusi Cahaya',
        nearby_facility: 'Langit Bintang Terbaik',
        toilet_distance: 'Toilet ±80 meter',
        highlight_text: 'Sky Watchers Pick',
        highlight_theme: 'purple',
        image_url: '/uploads/grounds/ground_m.jpg',
        description: 'Zona perkemahan terjauh dari gerbang utama, memiliki tingkat polusi cahaya paling minim. Sempurna untuk menikmati taburan bintang malam (*stargazing*).'
      }
    ];

    for (const g of groundsData) {
      await conn.query(
        `INSERT INTO grounds (code, name, capacity_badge, area_size, terrain_feature, nearby_facility, toilet_distance, highlight_text, highlight_theme, image_url, description, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           capacity_badge = VALUES(capacity_badge),
           area_size = VALUES(area_size),
           terrain_feature = VALUES(terrain_feature),
           nearby_facility = VALUES(nearby_facility),
           toilet_distance = VALUES(toilet_distance),
           highlight_text = VALUES(highlight_text),
           highlight_theme = VALUES(highlight_theme),
           image_url = VALUES(image_url),
           description = VALUES(description),
           is_active = TRUE`,
        [
          g.code,
          g.name,
          g.capacity_badge,
          g.area_size,
          g.terrain_feature,
          g.nearby_facility,
          g.toilet_distance,
          g.highlight_text,
          g.highlight_theme,
          g.image_url,
          g.description
        ]
      );
    }

    // --- SEED SITE CONFIGS ---
    console.log('[SEED] Mengisi Site Configs...');
    const siteConfigs = [
      ['overall_ground_map_url', '/uploads/maps/bedengan_map.png'],
      ['evacuation_map_url', '/uploads/maps/evacuation_map.png'],
      ['etiquette_title', 'Etika Berkemah di Bedengan'],
      ['etiquette_description', 'Mohon jaga kelestarian alam hutan pinus Bedengan. Bawa kantong sampah sendiri, hindari membuat perapian liar di akar pohon pinus, dan hormati ketenangan sesama camper setelah pukul 22.00 WIB.'],
      ['about_bedengan', 'Bumi Perkemahan Bedengan terletak di Desa Selorejo, Kecamatan Dau, Kabupaten Malang. Kawasan hutan pinus asri dengan aliran sungai jernih dari lereng Gunung Panderman.'],
      ['contact_admin_phone', '081234567890'],
      ['contact_admin_email', 'info@bedengan.com'],
      ['camping_fee', 'Rp 25.000 / orang / malam'],
      ['park_fee', 'Motor: Rp 5.000 | Mobil: Rp 10.000'],
      ['location_lat', '-7.934821'],
      ['location_lng', '112.531205']
    ];

    for (const [key, value] of siteConfigs) {
      await conn.query(
        `INSERT INTO site_configs (config_key, config_value)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
        [key, value]
      );
    }

    // --- SEED CATALOGS ---
    console.log('[SEED] Mengisi Data Catalogs...');
    const catalogsData = [
      // Rental
      {
        category: 'rental',
        name: 'Bedengan Camp Rental',
        price_text: 'Mulai Rp 50.000',
        description: 'Penyewaan tenda dome kapasitas 2-6 orang, sleeping bag hangat, matras foil, flysheet tahan air, kompor portable, nesting, dan lentera camping.',
        location_note: 'Pos Utama Blok A',
        contact_phone: '081234567893',
        operating_hours: '08:00 - 20:00',
        image_url: '/uploads/catalogs/rental_camp.jpg',
        status: 'approved',
        applicant_name: 'Pak Bambang',
        social_handle: '@bedengancamprental',
        tags: 'Tenda Dome, Matras, Kompor'
      },
      {
        category: 'rental',
        name: 'Sewa Tenda Berkah',
        price_text: 'Mulai Rp 45.000',
        description: 'Persewaan tenda berkualitas, perlengkapan masak gunung, lampu tenda, dan matras empuk.',
        location_note: 'Pintu Masuk Gerbang 2',
        contact_phone: '081298765432',
        operating_hours: '07:00 - 21:00',
        image_url: '/uploads/catalogs/rental_berkah.jpg',
        status: 'pending',
        applicant_name: 'Siti Aminah',
        social_handle: '@tenda_berkah_camp',
        tags: 'Tenda Dome, Alat Masak'
      },
      // Warung & Kuliner
      {
        category: 'warung',
        name: 'Warung Soto Bedengan',
        price_text: 'Rp 15.000 - Rp 25.000',
        description: 'Menyajikan soto ayam kampung kuah segar rempah hangat, kopi tubruk khas Malang, aneka gorengan hangat, dan teh manis.',
        location_note: 'Dekat Ground E',
        contact_phone: '081234567890',
        operating_hours: '06:00 - 18:00',
        image_url: '/uploads/catalogs/warung_soto.jpg',
        status: 'approved',
        applicant_name: 'Bu Soto',
        social_handle: '@sotobedengan',
        tags: 'Soto Ayam, Aneka Minuman'
      },
      {
        category: 'warung',
        name: 'Warung Bu Diroh',
        price_text: 'Rp 10.000 - Rp 25.000',
        description: 'Sedia aneka mie rebus telur, nasi rawon daging sapi empuk, teh tarik hangat, dan aneka jajanan cemilan.',
        location_note: 'Sebelah Mushola Al-Hidayah Ground J',
        contact_phone: '081234567891',
        operating_hours: '07:00 - 20:00',
        image_url: '/uploads/catalogs/warung_diroh.jpg',
        status: 'approved',
        applicant_name: 'Bu Diroh',
        social_handle: '@warungbudiroh',
        tags: 'Aneka Mie, Aneka Lalapan'
      },
      {
        category: 'warung',
        name: 'Warung Barokah',
        price_text: 'Rp 12.000 - Rp 30.000',
        description: 'Nasi rawon khas Malang, es kelapa muda (olahan degan segar), pisang goreng keju renyah, dan air mineral dingin.',
        location_note: 'Depan Pos 1 Ground A',
        contact_phone: '081234567892',
        operating_hours: '08:00 - 17:00',
        image_url: '/uploads/catalogs/warung_barokah.jpg',
        status: 'approved',
        applicant_name: 'Pak Slamet',
        social_handle: '@warungbarokahdau',
        tags: 'Nasi Rawon, Olahan Degan'
      },
      {
        category: 'warung',
        name: 'Warung Kopi Senja',
        price_text: 'Rp 8.000 - Rp 20.000',
        description: 'Kopi seduh manual V60 & Tubruk, wedang jahe sereh hangat, mie instan kuah pedas, dan jagung bakar nikmat malam.',
        location_note: 'Tepi Sungai Ground C',
        contact_phone: '081345678901',
        operating_hours: '15:00 - 23:00',
        image_url: '/uploads/catalogs/kopi_senja.jpg',
        status: 'pending',
        applicant_name: 'Budi Santoso',
        social_handle: '@kopisenjabedengan',
        tags: 'Kopi Seduh, Wedang Jahe'
      },
      // Photographer
      {
        category: 'photographer',
        name: 'The Prime Photography',
        price_text: 'Paket mulai Rp 250.000',
        description: 'Spesialis wedding, prewedding, dan event camping photography dengan nuansa cinematic dan natural pine forest.',
        location_note: 'Basecamp Selorejo',
        contact_phone: '081399887766',
        operating_hours: '06:00 - 18:00',
        image_url: '/uploads/catalogs/photographer_prime.jpg',
        status: 'approved',
        applicant_name: 'Rahmat Hidayat',
        social_handle: '@theprimephotography',
        tags: 'Cinematic, Prewedding, Event'
      },
      {
        category: 'photographer',
        name: 'Alan Picture',
        price_text: 'Paket mulai Rp 150.000',
        description: 'Menangkap momen kebahagiaan Anda. Tersedia layanan photoshoot couple, family, dan group di area sungai dan sunrise spot.',
        location_note: 'Standby Ground B & K',
        contact_phone: '081277665544',
        operating_hours: '05:30 - 18:00',
        image_url: '/uploads/catalogs/photographer_alan.jpg',
        status: 'approved',
        applicant_name: 'Alan Maulana',
        social_handle: '@alanpicture.id',
        tags: 'Family, Couple, Sunrise Spot'
      }
    ];

    const [existingCatalogs] = await conn.query('SELECT COUNT(*) as cnt FROM catalogs');
    if (existingCatalogs[0].cnt === 0) {
      for (const item of catalogsData) {
        await conn.query(
          `INSERT INTO catalogs (category, name, price_text, description, location_note, contact_phone, operating_hours, image_url, status, applicant_name, social_handle, tags)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.category,
            item.name,
            item.price_text,
            item.description,
            item.location_note,
            item.contact_phone,
            item.operating_hours,
            item.image_url,
            item.status,
            item.applicant_name,
            item.social_handle,
            item.tags
          ]
        );
      }
    }

    // --- SEED RULES ---
    console.log('[SEED] Mengisi Data Rules & Etiquette...');
    const rulesData = [
      {
        type: 'rule',
        title: 'Wajib Registrasi & Menjaga Karcis',
        description: 'Setiap pengunjung dan camper wajib melapor di loket pos masuk utama serta menyimpan bukti pembayaran karcis selama berkemah.',
        icon_name: 'receipt_long',
        display_order: 1
      },
      {
        type: 'rule',
        title: 'Jam Tenang (Quiet Hours)',
        description: 'Mulai pukul 22.00 hingga 06.00 WIB diberlakukan jam tenang. Dilarang memutar musik keras atau menggunakan sound system demi kenyamanan bersama.',
        icon_name: 'volume_off',
        display_order: 2
      },
      {
        type: 'warning',
        title: 'Larangan Membuat Api Unggun di Atas Akar Pinus',
        description: 'Dilarang keras menyalakan api unggun langsung di atas akar pohon pinus untuk mencegah kebakaran hutan bawah tanah. Gunakan tungku khusus yang disediakan atau spot tanah terbuka berjarak aman.',
        icon_name: 'local_fire_department',
        display_order: 3
      },
      {
        type: 'warning',
        title: 'Waspada Debit Sungai Saat Hujan di Hulu',
        description: 'Apabila cuaca mendung gelap atau turun hujan di area lereng Gunung Panderman, segera jauhi sempadan sungai untuk mengantisipasi kenaikan debit air mendadak.',
        icon_name: 'water_drop',
        display_order: 4
      },
      {
        type: 'etiquette',
        title: 'Bawa Pulang Sampahmu (Leave No Trace)',
        description: 'Sediakan kantong sampah mandiri. Bawa kembali seluruh sampah anorganik ke pos pembuangan sampah akhir gerbang utama.',
        icon_name: 'delete_outline',
        display_order: 5
      },
      {
        type: 'etiquette',
        title: 'Jaga Kelestarian Pohon & Alam Sekitar',
        description: 'Dilarang menebang dahan, mengelupas kulit pinus, atau memaku pohon. Rawat kelestarian hutan Bedengan untuk generasi berikutnya.',
        icon_name: 'park',
        display_order: 6
      }
    ];

    const [existingRules] = await conn.query('SELECT COUNT(*) as cnt FROM rules');
    if (existingRules[0].cnt === 0) {
      for (const r of rulesData) {
        await conn.query(
          `INSERT INTO rules (type, title, description, icon_name, display_order)
           VALUES (?, ?, ?, ?, ?)`,
          [r.type, r.title, r.description, r.icon_name, r.display_order]
        );
      }
    }

    // --- SEED EMERGENCY CONTACTS ---
    console.log('[SEED] Mengisi Data Kontak Darurat...');
    const contactsData = [
      {
        title: 'Pos Pengelola Utama Bedengan',
        phone_number: '081234567890',
        location_detail: 'Pos Registrasi & Tiket Gerbang Utama',
        icon_name: 'phone_in_talk'
      },
      {
        title: 'Tim SAR & Medis Lapangan',
        phone_number: '081234567899',
        location_detail: 'Posko Kesehatan Samping Mushola Al-Hidayah',
        icon_name: 'medical_services'
      },
      {
        title: 'Polsek Dau Malang',
        phone_number: '0341461110',
        location_detail: 'Jl. Raya Mulyoagung No. 2, Dau, Malang',
        icon_name: 'local_police'
      },
      {
        title: 'Puskesmas Dau',
        phone_number: '0341462002',
        location_detail: 'Kecamatan Dau, Kab. Malang',
        icon_name: 'local_hospital'
      }
    ];

    const [existingContacts] = await conn.query('SELECT COUNT(*) as cnt FROM emergency_contacts');
    if (existingContacts[0].cnt === 0) {
      for (const c of contactsData) {
        await conn.query(
          `INSERT INTO emergency_contacts (title, phone_number, location_detail, icon_name)
           VALUES (?, ?, ?, ?)`,
          [c.title, c.phone_number, c.location_detail, c.icon_name]
        );
      }
    }

    // --- SEED REVIEWS ---
    console.log('[SEED] Mengisi Data Ulasan Pengunjung...');
    const reviewsData = [
      {
        visitor_name: 'Rian Pratama',
        rating: 5,
        comment: 'Suasana Ground C mantap banget, langsung di bibir sungai jernih. Anak-anak betah main air dan udaranya super adem!',
        visit_date: '12 Oktober 2026',
        is_published: true
      },
      {
        visitor_name: 'Siti Nurhaliza',
        rating: 5,
        comment: 'Camping di Ground K view sunrise-nya magis parah! Akses fasilitas toilet dan warung juga dekat dan bersih. Sangat rekomen buat keluarga.',
        visit_date: '08 Oktober 2026',
        is_published: true
      },
      {
        visitor_name: 'Dimas Wicaksono',
        rating: 4,
        comment: 'Ground D sangat cocok untuk rombongan gathering komunitas. Spot api unggunnya lapang dan parkiran aman dijaga petugas semalaman.',
        visit_date: '01 Oktober 2026',
        is_published: true
      }
    ];

    const [existingReviews] = await conn.query('SELECT COUNT(*) as cnt FROM reviews');
    if (existingReviews[0].cnt === 0) {
      for (const rev of reviewsData) {
        await conn.query(
          `INSERT INTO reviews (visitor_name, rating, comment, visit_date, is_published)
           VALUES (?, ?, ?, ?, ?)`,
          [rev.visitor_name, rev.rating, rev.comment, rev.visit_date, rev.is_published]
        );
      }
    }

    console.log('----------------------------------------------------');
    console.log('[SEED SUKSES] Database dan data awal berhasil diinisialisasi 100%!');
    console.log('Admin Default: admin@bedengan.com / password123');
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('[SEED ERROR]', err);
    process.exit(1);
  } finally {
    await conn.end();
  }
};

runSeed();
