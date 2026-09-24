-- AlterTable
ALTER TABLE `Client`
ADD COLUMN `niche` VARCHAR(191) NULL,
ADD COLUMN `phone` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `ClientCredential` (
  `id` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `passwordHash` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `ClientCredential_clientId_key`(`clientId`),
  UNIQUE INDEX `ClientCredential_email_key`(`email`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClientSession` (
  `id` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `tokenHash` VARCHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `ClientSession_tokenHash_key`(`tokenHash`),
  INDEX `ClientSession_clientId_idx`(`clientId`),
  INDEX `ClientSession_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ClientCredential`
ADD CONSTRAINT `ClientCredential_clientId_fkey`
FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClientSession`
ADD CONSTRAINT `ClientSession_clientId_fkey`
FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;
