-- Client publishing rhythm + commemorative dates

CREATE TABLE `ClientPostingWeekday` (
  `id` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `weekday` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `ClientPostingWeekday_clientId_weekday_key`(`clientId`, `weekday`),
  INDEX `ClientPostingWeekday_weekday_idx`(`weekday`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommemorativeDate` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `day` INTEGER NOT NULL,
  `month` INTEGER NOT NULL,
  `year` INTEGER NULL,
  `scope` ENUM('NATIONAL', 'CUSTOM') NOT NULL DEFAULT 'CUSTOM',
  `city` VARCHAR(191) NULL,
  `state` VARCHAR(191) NULL,
  `description` TEXT NULL,
  `clientId` VARCHAR(191) NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `CommemorativeDate_month_day_idx`(`month`, `day`),
  INDEX `CommemorativeDate_year_idx`(`year`),
  INDEX `CommemorativeDate_scope_active_idx`(`scope`, `active`),
  INDEX `CommemorativeDate_clientId_idx`(`clientId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ClientPostingWeekday`
  ADD CONSTRAINT `ClientPostingWeekday_clientId_fkey`
  FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CommemorativeDate`
  ADD CONSTRAINT `CommemorativeDate_clientId_fkey`
  FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO `CommemorativeDate`
  (`id`, `name`, `day`, `month`, `year`, `scope`, `city`, `state`, `description`, `clientId`, `active`, `createdAt`, `updatedAt`)
VALUES
  ('national-0101', 'Confraternização Universal', 1, 1, NULL, 'NATIONAL', NULL, NULL, 'Feriado nacional e início do ano.', NULL, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('national-0308', 'Dia Internacional da Mulher', 8, 3, NULL, 'NATIONAL', NULL, NULL, 'Data de grande relevância para conteúdo institucional e de marca.', NULL, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('national-0315', 'Dia do Consumidor', 15, 3, NULL, 'NATIONAL', NULL, NULL, 'Data relevante para campanhas de relacionamento e varejo.', NULL, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('national-0421', 'Tiradentes', 21, 4, NULL, 'NATIONAL', NULL, NULL, 'Feriado nacional.', NULL, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('national-0501', 'Dia do Trabalho', 1, 5, NULL, 'NATIONAL', NULL, NULL, 'Feriado nacional e data institucional.', NULL, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('national-0612', 'Dia dos Namorados', 12, 6, NULL, 'NATIONAL', NULL, NULL, 'Data comercial relevante no Brasil.', NULL, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('national-0907', 'Independência do Brasil', 7, 9, NULL, 'NATIONAL', NULL, NULL, 'Feriado nacional.', NULL, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('national-0915', 'Dia do Cliente', 15, 9, NULL, 'NATIONAL', NULL, NULL, 'Data comercial e de relacionamento com clientes.', NULL, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('national-1012', 'Dia das Crianças / Nossa Senhora Aparecida', 12, 10, NULL, 'NATIONAL', NULL, NULL, 'Data nacional de forte apelo para campanhas.', NULL, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('national-1102', 'Finados', 2, 11, NULL, 'NATIONAL', NULL, NULL, 'Feriado nacional.', NULL, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('national-1115', 'Proclamação da República', 15, 11, NULL, 'NATIONAL', NULL, NULL, 'Feriado nacional.', NULL, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('national-1120', 'Dia da Consciência Negra', 20, 11, NULL, 'NATIONAL', NULL, NULL, 'Feriado nacional e data de relevância social.', NULL, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('national-1225', 'Natal', 25, 12, NULL, 'NATIONAL', NULL, NULL, 'Feriado nacional e importante data sazonal.', NULL, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('national-1231', 'Réveillon', 31, 12, NULL, 'NATIONAL', NULL, NULL, 'Data sazonal de encerramento do ano.', NULL, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));


-- Existing clients receive a sensible default publishing rhythm (Mon/Wed/Fri).
INSERT INTO `ClientPostingWeekday` (`id`, `clientId`, `weekday`, `createdAt`)
SELECT CONCAT('pw-', `id`, '-1'), `id`, 1, CURRENT_TIMESTAMP(3) FROM `Client`;

INSERT INTO `ClientPostingWeekday` (`id`, `clientId`, `weekday`, `createdAt`)
SELECT CONCAT('pw-', `id`, '-3'), `id`, 3, CURRENT_TIMESTAMP(3) FROM `Client`;

INSERT INTO `ClientPostingWeekday` (`id`, `clientId`, `weekday`, `createdAt`)
SELECT CONCAT('pw-', `id`, '-5'), `id`, 5, CURRENT_TIMESTAMP(3) FROM `Client`;
