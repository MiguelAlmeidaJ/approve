-- Productivity controls, artwork annotations, audit trail and secure public expiry

ALTER TABLE `Designer`
  ADD COLUMN `weeklyCapacityPoints` INTEGER NOT NULL DEFAULT 30;

ALTER TABLE `Calendar`
  ADD COLUMN `shareExpiresAt` DATETIME(3) NULL;

ALTER TABLE `ContentItem`
  ADD COLUMN `effortPoints` INTEGER NOT NULL DEFAULT 1;

UPDATE `ContentItem`
SET `effortPoints` =
  CASE
    WHEN `contentType` = 'REEL' THEN 3
    WHEN `contentType` = 'CAROUSEL' THEN 2
    ELSE 1
  END;

CREATE TABLE `ContentAnnotation` (
  `id` VARCHAR(191) NOT NULL,
  `contentItemId` VARCHAR(191) NOT NULL,
  `assetId` VARCHAR(191) NULL,
  `authorType` ENUM('INTERNAL','CLIENT','SYSTEM') NOT NULL,
  `authorDesignerId` VARCHAR(191) NULL,
  `authorName` VARCHAR(191) NULL,
  `x` DOUBLE NOT NULL,
  `y` DOUBLE NOT NULL,
  `message` TEXT NOT NULL,
  `resolvedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `ContentAnnotation_contentItemId_createdAt_idx`(`contentItemId`, `createdAt`),
  INDEX `ContentAnnotation_assetId_idx`(`assetId`),
  INDEX `ContentAnnotation_authorDesignerId_idx`(`authorDesignerId`),
  INDEX `ContentAnnotation_resolvedAt_idx`(`resolvedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AuditLog` (
  `id` VARCHAR(191) NOT NULL,
  `actorDesignerId` VARCHAR(191) NULL,
  `actorName` VARCHAR(191) NULL,
  `action` VARCHAR(191) NOT NULL,
  `entityType` VARCHAR(191) NOT NULL,
  `entityId` VARCHAR(191) NOT NULL,
  `summary` TEXT NOT NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `AuditLog_actorDesignerId_createdAt_idx`(`actorDesignerId`, `createdAt`),
  INDEX `AuditLog_entityType_entityId_createdAt_idx`(`entityType`, `entityId`, `createdAt`),
  INDEX `AuditLog_action_createdAt_idx`(`action`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ContentAnnotation`
  ADD CONSTRAINT `ContentAnnotation_contentItemId_fkey`
  FOREIGN KEY (`contentItemId`) REFERENCES `ContentItem`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ContentAnnotation`
  ADD CONSTRAINT `ContentAnnotation_assetId_fkey`
  FOREIGN KEY (`assetId`) REFERENCES `ContentAsset`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `ContentAnnotation`
  ADD CONSTRAINT `ContentAnnotation_authorDesignerId_fkey`
  FOREIGN KEY (`authorDesignerId`) REFERENCES `Designer`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `AuditLog`
  ADD CONSTRAINT `AuditLog_actorDesignerId_fkey`
  FOREIGN KEY (`actorDesignerId`) REFERENCES `Designer`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
