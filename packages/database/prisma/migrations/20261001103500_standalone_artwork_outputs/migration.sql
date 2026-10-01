CREATE TABLE `StandaloneArtworkOutput` (
  `id` VARCHAR(191) NOT NULL,
  `standaloneArtworkId` VARCHAR(191) NOT NULL,
  `contentType` ENUM('POST', 'CAROUSEL', 'REEL', 'STORY') NOT NULL,
  `formatLabel` VARCHAR(191) NULL,
  `quantity` INTEGER NOT NULL DEFAULT 1,
  `effortPoints` INTEGER NOT NULL DEFAULT 1,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `StandaloneArtworkOutput_standaloneArtworkId_sortOrder_idx`(`standaloneArtworkId`, `sortOrder`),
  INDEX `StandaloneArtworkOutput_contentType_idx`(`contentType`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `StandaloneArtworkOutput`
  ADD CONSTRAINT `StandaloneArtworkOutput_standaloneArtworkId_fkey`
  FOREIGN KEY (`standaloneArtworkId`) REFERENCES `StandaloneArtwork`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
