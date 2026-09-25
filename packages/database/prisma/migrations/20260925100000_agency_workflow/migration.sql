-- Agency workflow: planning approval -> production -> artwork approval -> scheduling

ALTER TABLE `Calendar`
  ADD COLUMN `stage` ENUM(
    'PLANNING',
    'PRE_APPROVAL',
    'PRODUCTION',
    'FINAL_APPROVAL',
    'SCHEDULING',
    'COMPLETED',
    'ARCHIVED'
  ) NOT NULL DEFAULT 'PLANNING';

ALTER TABLE `ContentItem`
  ADD COLUMN `theme` VARCHAR(191) NULL,
  ADD COLUMN `headline` VARCHAR(191) NULL,
  ADD COLUMN `subheadline` VARCHAR(191) NULL,
  ADD COLUMN `designerNotes` TEXT NULL,
  ADD COLUMN `stage` ENUM(
    'PLANNING',
    'PRE_APPROVAL_PENDING',
    'PRE_APPROVED',
    'PRE_CHANGES_REQUESTED',
    'DESIGN_PENDING',
    'DESIGN_IN_PROGRESS',
    'ART_APPROVAL_PENDING',
    'ART_CHANGES_REQUESTED',
    'ART_APPROVED',
    'READY_TO_SCHEDULE',
    'SCHEDULED',
    'PUBLISHED',
    'SCHEDULING_ERROR'
  ) NOT NULL DEFAULT 'PLANNING',
  ADD COLUMN `planningApprovedAt` DATETIME(3) NULL,
  ADD COLUMN `artworkApprovedAt` DATETIME(3) NULL,
  ADD COLUMN `externalScheduleId` VARCHAR(191) NULL,
  ADD COLUMN `publishedAt` DATETIME(3) NULL,
  ADD COLUMN `publishingError` TEXT NULL;

ALTER TABLE `ReviewHistory`
  ADD COLUMN `phase` ENUM('PLANNING', 'ARTWORK')
  NOT NULL DEFAULT 'ARTWORK';

-- Preserve the meaning of existing calendars and approvals.
UPDATE `ContentItem`
SET `stage` = CASE `status`
  WHEN 'PENDING_APPROVAL' THEN 'ART_APPROVAL_PENDING'
  WHEN 'APPROVED' THEN 'ART_APPROVED'
  WHEN 'CHANGES_REQUESTED' THEN 'ART_CHANGES_REQUESTED'
  ELSE 'PLANNING'
END;

UPDATE `ContentItem`
SET `artworkApprovedAt` = `reviewedAt`
WHERE `stage` = 'ART_APPROVED' AND `reviewedAt` IS NOT NULL;

UPDATE `Calendar` c
SET c.`stage` = 'FINAL_APPROVAL'
WHERE EXISTS (
  SELECT 1
  FROM `ContentItem` ci
  WHERE ci.`calendarId` = c.`id`
);

UPDATE `Calendar`
SET `stage` = 'ARCHIVED'
WHERE `archivedAt` IS NOT NULL;

CREATE INDEX `Calendar_stage_idx` ON `Calendar`(`stage`);
CREATE INDEX `ContentItem_stage_idx` ON `ContentItem`(`stage`);
CREATE INDEX `ReviewHistory_phase_idx` ON `ReviewHistory`(`phase`);
