-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               8.4.3 - MySQL Community Server - GPL
-- Server OS:                    Win64
-- HeidiSQL Version:             12.8.0.6908
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- Dumping structure for table db_bedengan.cloud_images
CREATE TABLE IF NOT EXISTS `cloud_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `file_key` varchar(255) NOT NULL,
  `file_url` text NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` int NOT NULL,
  `uploader_id` int DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `mime_type` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table db_bedengan.cloud_images: ~13 rows (approximately)
INSERT INTO `cloud_images` (`id`, `file_key`, `file_url`, `entity_type`, `entity_id`, `uploader_id`, `file_size`, `mime_type`, `created_at`) VALUES
	(1, 'bedengan/grounds/k1uedhmputmntmt5edju', 'https://res.cloudinary.com/iwa6xewr/image/upload/v1794881815/bedengan/grounds/k1uedhmputmntmt5edju.jpg', 'ground', 1, 1, 408928, 'image/jpeg', '2026-11-17 02:16:51'),
	(2, 'bedengan/grounds/gorn9qgv1dacc8myyi7i', 'https://res.cloudinary.com/iwa6xewr/image/upload/v1794881836/bedengan/grounds/gorn9qgv1dacc8myyi7i.jpg', 'ground', 2, 1, 355028, 'image/jpeg', '2026-11-17 02:17:12'),
	(3, 'bedengan/grounds/dew3wehbavvsr3nmiddh', 'https://res.cloudinary.com/iwa6xewr/image/upload/v1794881854/bedengan/grounds/dew3wehbavvsr3nmiddh.jpg', 'ground', 3, 1, 348831, 'image/jpeg', '2026-11-17 02:17:30'),
	(4, 'bedengan/grounds/typmvlt8fz3pj6tw7avn', 'https://res.cloudinary.com/iwa6xewr/image/upload/v1794881869/bedengan/grounds/typmvlt8fz3pj6tw7avn.jpg', 'ground', 4, 1, 381060, 'image/jpeg', '2026-11-17 02:17:44'),
	(5, 'bedengan/grounds/k6m8lcwbjlwfzj1pnhib', 'https://res.cloudinary.com/iwa6xewr/image/upload/v1794881886/bedengan/grounds/k6m8lcwbjlwfzj1pnhib.jpg', 'ground', 5, 1, 385442, 'image/jpeg', '2026-11-17 02:18:03'),
	(6, 'bedengan/grounds/hleoo17rps9l0uahtnqf', 'https://res.cloudinary.com/iwa6xewr/image/upload/v1794881902/bedengan/grounds/hleoo17rps9l0uahtnqf.jpg', 'ground', 6, 1, 393978, 'image/jpeg', '2026-11-17 02:18:17'),
	(7, 'bedengan/grounds/utqngd9oqv1hbykbnunm', 'https://res.cloudinary.com/iwa6xewr/image/upload/v1794881916/bedengan/grounds/utqngd9oqv1hbykbnunm.jpg', 'ground', 7, 1, 379777, 'image/jpeg', '2026-11-17 02:18:31'),
	(8, 'bedengan/grounds/xsslpkcyyjal4q1qrfpv', 'https://res.cloudinary.com/iwa6xewr/image/upload/v1794881933/bedengan/grounds/xsslpkcyyjal4q1qrfpv.jpg', 'ground', 8, 1, 371628, 'image/jpeg', '2026-11-17 02:18:49'),
	(9, 'bedengan/grounds/ruoszerzjnnigrwxzxpv', 'https://res.cloudinary.com/iwa6xewr/image/upload/v1794881949/bedengan/grounds/ruoszerzjnnigrwxzxpv.jpg', 'ground', 9, 1, 377725, 'image/jpeg', '2026-11-17 02:19:06'),
	(10, 'bedengan/grounds/tpif3bf3pllwycsunjp4', 'https://res.cloudinary.com/iwa6xewr/image/upload/v1794881964/bedengan/grounds/tpif3bf3pllwycsunjp4.jpg', 'ground', 10, 1, 398754, 'image/jpeg', '2026-11-17 02:19:20'),
	(11, 'bedengan/grounds/drwsvbmj3aqfnpncpou9', 'https://res.cloudinary.com/iwa6xewr/image/upload/v1794881980/bedengan/grounds/drwsvbmj3aqfnpncpou9.jpg', 'ground', 11, 1, 356631, 'image/jpeg', '2026-11-17 02:19:35'),
	(12, 'bedengan/grounds/o1sz7z2n4lld7xkmygwt', 'https://res.cloudinary.com/iwa6xewr/image/upload/v1794881996/bedengan/grounds/o1sz7z2n4lld7xkmygwt.jpg', 'ground', 12, 1, 380671, 'image/jpeg', '2026-11-17 02:19:52'),
	(13, 'bedengan/grounds/mvwjywqdravfk3wdmqwj', 'https://res.cloudinary.com/iwa6xewr/image/upload/v1794882010/bedengan/grounds/mvwjywqdravfk3wdmqwj.jpg', 'ground', 13, 1, 407166, 'image/jpeg', '2026-11-17 02:20:06');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
