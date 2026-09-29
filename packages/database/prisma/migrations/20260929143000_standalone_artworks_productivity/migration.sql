ALTER TABLE `ContentItem`
  ADD COLUMN `productionDesignerId` VARCHAR(191) NULL,
  ADD INDEX `ContentItem_productionDesignerId_idx`(`productionDesignerId`);

ALTER TABLE `ContentItem`
  ADD CONSTRAINT `ContentItem_productionDesignerId_fkey`
  FOREIGN KEY (`productionDesignerId`) REFERENCES `Designer`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `StandaloneArtwork` (
  `id` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `designerId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `briefing` TEXT NOT NULL,
  `contentType` ENUM('POST','CAROUSEL','REEL','STORY') NOT NULL DEFAULT 'POST',
  `formatLabel` VARCHAR(191) NULL,
  `quantity` INTEGER NOT NULL DEFAULT 1,
  `effortPoints` INTEGER NOT NULL DEFAULT 1,
  `priority` ENUM('LOW','NORMAL','HIGH','URGENT') NOT NULL DEFAULT 'NORMAL',
  `status` ENUM('REQUESTED','IN_PRODUCTION','IN_APPROVAL','CHANGES_REQUESTED','APPROVED','DELIVERED','CANCELLED') NOT NULL DEFAULT 'REQUESTED',
  `dueAt` DATETIME(3) NULL,
  `nextcloudPath` TEXT NULL,
  `revisionCount` INTEGER NOT NULL DEFAULT 0,
  `startedAt` DATETIME(3) NULL,
  `approvedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `StandaloneArtwork_clientId_status_idx`(`clientId`, `status`),
  INDEX `StandaloneArtwork_designerId_status_idx`(`designerId`, `status`),
  INDEX `StandaloneArtwork_dueAt_idx`(`dueAt`),
  INDEX `StandaloneArtwork_completedAt_idx`(`completedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `StandaloneArtwork`
  ADD CONSTRAINT `StandaloneArtwork_clientId_fkey`
  FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `StandaloneArtwork_designerId_fkey`
  FOREIGN KEY (`designerId`) REFERENCES `Designer`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
