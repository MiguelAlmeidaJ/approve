-- CreateTable
CREATE TABLE `ContentFormat` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `contentType` ENUM('POST', 'CAROUSEL', 'REEL', 'STORY') NOT NULL,
  `width` INTEGER NOT NULL,
  `height` INTEGER NOT NULL,
  `supportsFeed` BOOLEAN NOT NULL DEFAULT true,
  `supportsStories` BOOLEAN NOT NULL DEFAULT false,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `ContentFormat_contentType_active_idx`(`contentType`, `active`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `ContentItem`
ADD COLUMN `formatId` VARCHAR(191) NULL,
ADD COLUMN `contentType` ENUM('POST', 'CAROUSEL', 'REEL', 'STORY') NOT NULL DEFAULT 'POST',
ADD COLUMN `publishToFeed` BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN `publishToStories` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `ContentItem_formatId_idx` ON `ContentItem`(`formatId`);

-- AddForeignKey
ALTER TABLE `ContentItem`
ADD CONSTRAINT `ContentItem_formatId_fkey`
FOREIGN KEY (`formatId`) REFERENCES `ContentFormat`(`id`)
ON DELETE SET NULL ON UPDATE CASCADE;
