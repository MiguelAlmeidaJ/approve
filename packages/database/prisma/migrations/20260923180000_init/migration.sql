-- CreateTable
CREATE TABLE `Client` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Client_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Calendar` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `shareToken` VARCHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Calendar_shareToken_key`(`shareToken`),
    INDEX `Calendar_clientId_idx`(`clientId`),
    INDEX `Calendar_periodStart_periodEnd_idx`(`periodStart`, `periodEnd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContentItem` (
    `id` VARCHAR(191) NOT NULL,
    `calendarId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `scheduledAt` DATETIME(3) NOT NULL,
    `channel` ENUM('INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'TIKTOK', 'STORIES', 'OTHER') NOT NULL,
    `format` VARCHAR(191) NOT NULL,
    `caption` TEXT NOT NULL,
    `assetUrl` TEXT NULL,
    `status` ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'CHANGES_REQUESTED') NOT NULL DEFAULT 'DRAFT',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ContentItem_calendarId_scheduledAt_idx`(`calendarId`, `scheduledAt`),
    INDEX `ContentItem_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReviewHistory` (
    `id` VARCHAR(191) NOT NULL,
    `contentItemId` VARCHAR(191) NOT NULL,
    `action` ENUM('APPROVED', 'CHANGES_REQUESTED') NOT NULL,
    `message` TEXT NULL,
    `reviewerName` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ReviewHistory_contentItemId_createdAt_idx`(`contentItemId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Calendar` ADD CONSTRAINT `Calendar_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentItem` ADD CONSTRAINT `ContentItem_calendarId_fkey` FOREIGN KEY (`calendarId`) REFERENCES `Calendar`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReviewHistory` ADD CONSTRAINT `ReviewHistory_contentItemId_fkey` FOREIGN KEY (`contentItemId`) REFERENCES `ContentItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
