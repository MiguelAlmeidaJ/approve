-- Agency operations: SLA, strategy, comments, versions, templates, notifications and metrics

ALTER TABLE `Client`
  ADD COLUMN `toneOfVoice` TEXT NULL,
  ADD COLUMN `targetAudience` TEXT NULL,
  ADD COLUMN `region` VARCHAR(191) NULL,
  ADD COLUMN `services` TEXT NULL,
  ADD COLUMN `objectives` TEXT NULL,
  ADD COLUMN `prohibitedTerms` TEXT NULL,
  ADD COLUMN `hashtags` TEXT NULL,
  ADD COLUMN `references` TEXT NULL,
  ADD COLUMN `mlabsProfileId` VARCHAR(191) NULL;

ALTER TABLE `CommemorativeDate`
  ADD COLUMN `tags` TEXT NULL;

ALTER TABLE `Calendar`
  ADD COLUMN `planningDueAt` DATETIME(3) NULL,
  ADD COLUMN `planningApprovalDueAt` DATETIME(3) NULL,
  ADD COLUMN `artworkDueAt` DATETIME(3) NULL,
  ADD COLUMN `artworkApprovalDueAt` DATETIME(3) NULL,
  ADD COLUMN `schedulingDueAt` DATETIME(3) NULL;

ALTER TABLE `ContentItem`
  ADD COLUMN `planningReady` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `artworkVersion` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `metricReach` INTEGER NULL,
  ADD COLUMN `metricImpressions` INTEGER NULL,
  ADD COLUMN `metricLikes` INTEGER NULL,
  ADD COLUMN `metricComments` INTEGER NULL,
  ADD COLUMN `metricShares` INTEGER NULL,
  ADD COLUMN `metricSaves` INTEGER NULL,
  ADD COLUMN `metricsUpdatedAt` DATETIME(3) NULL;

ALTER TABLE `ContentAsset`
  ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN `active` BOOLEAN NOT NULL DEFAULT true;

UPDATE `ContentItem` ci
SET `artworkVersion` = 1
WHERE EXISTS (
  SELECT 1
  FROM `ContentAsset` ca
  WHERE ca.`contentItemId` = ci.`id`
);

CREATE TABLE `ContentComment` (
  `id` VARCHAR(191) NOT NULL,
  `contentItemId` VARCHAR(191) NOT NULL,
  `authorType` ENUM('INTERNAL','CLIENT','SYSTEM') NOT NULL,
  `authorDesignerId` VARCHAR(191) NULL,
  `authorName` VARCHAR(191) NULL,
  `message` TEXT NOT NULL,
  `visibleToClient` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `ContentComment_contentItemId_createdAt_idx`(`contentItemId`, `createdAt`),
  INDEX `ContentComment_authorDesignerId_idx`(`authorDesignerId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Notification` (
  `id` VARCHAR(191) NOT NULL,
  `designerId` VARCHAR(191) NOT NULL,
  `type` ENUM('INFO','ACTION','APPROVAL','CHANGE','DEADLINE','PUBLISHING') NOT NULL DEFAULT 'INFO',
  `title` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `link` VARCHAR(191) NULL,
  `readAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `Notification_designerId_readAt_createdAt_idx`(`designerId`, `readAt`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BriefingTemplate` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `niche` VARCHAR(191) NULL,
  `contentType` ENUM('POST','CAROUSEL','REEL','STORY') NOT NULL DEFAULT 'POST',
  `theme` VARCHAR(191) NULL,
  `headline` VARCHAR(191) NULL,
  `subheadline` VARCHAR(191) NULL,
  `caption` TEXT NULL,
  `designerNotes` TEXT NULL,
  `publishToFeed` BOOLEAN NOT NULL DEFAULT true,
  `publishToStories` BOOLEAN NOT NULL DEFAULT false,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `BriefingTemplate_active_contentType_idx`(`active`, `contentType`),
  INDEX `BriefingTemplate_niche_idx`(`niche`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ContentComment`
  ADD CONSTRAINT `ContentComment_contentItemId_fkey`
  FOREIGN KEY (`contentItemId`) REFERENCES `ContentItem`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ContentComment`
  ADD CONSTRAINT `ContentComment_authorDesignerId_fkey`
  FOREIGN KEY (`authorDesignerId`) REFERENCES `Designer`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Notification`
  ADD CONSTRAINT `Notification_designerId_fkey`
  FOREIGN KEY (`designerId`) REFERENCES `Designer`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO `BriefingTemplate`
  (`id`,`name`,`description`,`niche`,`contentType`,`theme`,`headline`,`subheadline`,`caption`,`designerNotes`,`publishToFeed`,`publishToStories`,`active`,`createdAt`,`updatedAt`)
VALUES
  ('tpl-institucional','Institucional','Conteúdo de posicionamento e marca.',NULL,'POST','Institucional / marca','[Headline institucional]','[Complemento da mensagem]','[Legenda institucional com CTA]','Priorizar identidade visual e mensagem de marca.',true,false,true,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
  ('tpl-faq','FAQ / dúvida frequente','Resposta educativa para uma dúvida recorrente.',NULL,'CAROUSEL','FAQ / educação','[Pergunta principal]','[Promessa de resposta]','[Legenda explicando a resposta e convidando para interação]','Organizar resposta em passos claros e objetivos.',true,false,true,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
  ('tpl-produto','Produto / serviço','Apresentação de oferta ou benefício.',NULL,'POST','Produto / serviço','[Benefício principal]','[Diferencial ou prova]','[Legenda comercial com CTA]','Destacar benefício antes de características.',true,true,true,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3)),
  ('tpl-bastidores','Bastidores','Humanização e rotina do cliente.',NULL,'REEL','Bastidores / rotina','[Gancho curto]','[Contexto do bastidor]','[Legenda humanizada e espontânea]','Usar cenas reais e ritmo leve.',true,true,true,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3));
