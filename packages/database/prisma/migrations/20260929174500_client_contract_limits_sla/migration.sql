ALTER TABLE `Client`
  ADD COLUMN `monthlyPostLimit` INTEGER NULL,
  ADD COLUMN `monthlyCarouselLimit` INTEGER NULL,
  ADD COLUMN `monthlyReelLimit` INTEGER NULL,
  ADD COLUMN `monthlyStoryLimit` INTEGER NULL,
  ADD COLUMN `monthlyStandaloneLimit` INTEGER NULL,
  ADD COLUMN `monthlyPointsLimit` INTEGER NULL,
  ADD COLUMN `defaultArtworkSlaHours` INTEGER NOT NULL DEFAULT 72,
  ADD COLUMN `defaultStandaloneSlaHours` INTEGER NOT NULL DEFAULT 48;
