-- AlterTable
ALTER TABLE `Designer`
ADD COLUMN `active` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `Client`
ADD COLUMN `active` BOOLEAN NOT NULL DEFAULT true;
