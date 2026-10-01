ALTER TABLE `SystemBranding`
  ADD COLUMN `darkLogoPath` TEXT NULL AFTER `logoName`,
  ADD COLUMN `darkLogoName` VARCHAR(191) NULL AFTER `darkLogoPath`;
