CREATE TABLE `SystemBranding` (
  `id` VARCHAR(191) NOT NULL DEFAULT 'default',
  `logoPath` TEXT NULL,
  `logoName` VARCHAR(191) NULL,
  `faviconPath` TEXT NULL,
  `faviconName` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
