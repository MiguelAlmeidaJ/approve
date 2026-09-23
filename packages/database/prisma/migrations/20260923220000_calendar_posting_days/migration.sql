-- CreateTable
CREATE TABLE `CalendarPostingDay` (
  `id` VARCHAR(191) NOT NULL,
  `calendarId` VARCHAR(191) NOT NULL,
  `scheduledDate` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `CalendarPostingDay_calendarId_scheduledDate_key`(`calendarId`, `scheduledDate`),
  INDEX `CalendarPostingDay_scheduledDate_idx`(`scheduledDate`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CalendarPostingDay`
ADD CONSTRAINT `CalendarPostingDay_calendarId_fkey`
FOREIGN KEY (`calendarId`) REFERENCES `Calendar`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;
