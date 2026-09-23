-- AlterTable
ALTER TABLE `Designer`
ADD COLUMN `role` ENUM('DEV', 'ADMIN', 'DESIGNER') NOT NULL DEFAULT 'DESIGNER';

-- AlterTable
ALTER TABLE `Client`
ADD COLUMN `assignedDesignerId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Client_assignedDesignerId_idx` ON `Client`(`assignedDesignerId`);

-- AddForeignKey
ALTER TABLE `Client`
ADD CONSTRAINT `Client_assignedDesignerId_fkey`
FOREIGN KEY (`assignedDesignerId`) REFERENCES `Designer`(`id`)
ON DELETE SET NULL ON UPDATE CASCADE;
