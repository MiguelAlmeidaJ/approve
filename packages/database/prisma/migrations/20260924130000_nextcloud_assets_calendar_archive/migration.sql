-- AlterTable
ALTER TABLE `Calendar`
ADD COLUMN `archivedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `ContentAsset` (
  `id` VARCHAR(191) NOT NULL,
  `contentItemId` VARCHAR(191) NOT NULL,
  `provider` ENUM('NEXTCLOUD') NOT NULL DEFAULT 'NEXTCLOUD',
  `filePath` TEXT NOT NULL,
  `fileName` VARCHAR(191) NOT NULL,
  `fileId` VARCHAR(191) NULL,
  `mimeType` VARCHAR(191) NULL,
  `etag` VARCHAR(191) NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `ContentAsset_contentItemId_sortOrder_idx`(`contentItemId`, `sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ContentAsset`
ADD CONSTRAINT `ContentAsset_contentItemId_fkey`
FOREIGN KEY (`contentItemId`) REFERENCES `ContentItem`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;
