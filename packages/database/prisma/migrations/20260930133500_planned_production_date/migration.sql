ALTER TABLE `ContentItem`
  ADD COLUMN `plannedProductionDate` DATETIME(3) NULL;

ALTER TABLE `StandaloneArtwork`
  ADD COLUMN `plannedProductionDate` DATETIME(3) NULL;

CREATE INDEX `ContentItem_plannedProductionDate_idx`
  ON `ContentItem`(`plannedProductionDate`);

CREATE INDEX `StandaloneArtwork_plannedProductionDate_idx`
  ON `StandaloneArtwork`(`plannedProductionDate`);
