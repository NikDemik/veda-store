-- AlterTable
ALTER TABLE `Series` ADD COLUMN `imageUrl` TEXT NULL,
    ADD COLUMN `parentId` INTEGER NULL,
    ADD COLUMN `sourceSnapshot` JSON NULL,
    MODIFY `description` TEXT NULL;

-- AlterTable
ALTER TABLE `Product` ADD COLUMN `priceOnRequest` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `datasheetUrl` TEXT NULL,
    MODIFY `imageUrl` TEXT NULL;

-- AlterTable
ALTER TABLE `ProductImage` ADD COLUMN `assetId` INTEGER NULL,
    ADD COLUMN `inheritedFromSeriesId` INTEGER NULL,
    MODIFY `url` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `ProductDocument` ADD COLUMN `assetId` INTEGER NULL,
    ADD COLUMN `group` VARCHAR(191) NULL,
    ADD COLUMN `inheritedFromSeriesId` INTEGER NULL,
    MODIFY `url` TEXT NOT NULL,
    MODIFY `storageKey` VARCHAR(2048) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `ProductSpec` ADD COLUMN `sortOrder` INTEGER NOT NULL DEFAULT 0,
    MODIFY `value` TEXT NOT NULL;

-- CreateTable
CREATE TABLE `ProductSeries` (
    `productId` INTEGER NOT NULL,
    `seriesId` INTEGER NOT NULL,

    INDEX `ProductSeries_seriesId_idx`(`seriesId`),
    PRIMARY KEY (`productId`, `seriesId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductOperatingRating` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `mode` ENUM('HEAVY_DUTY', 'LIGHT_DUTY', 'NO_OVERLOAD') NOT NULL,
    `powerKw` DECIMAL(12, 4) NULL,
    `currentA` DECIMAL(12, 4) NULL,

    INDEX `ProductOperatingRating_mode_powerKw_idx`(`mode`, `powerKw`),
    INDEX `ProductOperatingRating_mode_currentA_idx`(`mode`, `currentA`),
    UNIQUE INDEX `ProductOperatingRating_productId_mode_key`(`productId`, `mode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductSource` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `url` TEXT NOT NULL,
    `urlHash` CHAR(64) NOT NULL,
    `contentHash` CHAR(64) NOT NULL,
    `collectedAt` DATETIME(3) NOT NULL,
    `payload` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProductSource_productId_collectedAt_idx`(`productId`, `collectedAt`),
    UNIQUE INDEX `ProductSource_productId_urlHash_contentHash_key`(`productId`, `urlHash`, `contentHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CatalogAsset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sha256` CHAR(64) NOT NULL,
    `url` TEXT NOT NULL,
    `storageKey` TEXT NOT NULL,
    `sourceUrl` TEXT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `downloadedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CatalogAsset_sha256_key`(`sha256`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SeriesDocument` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `seriesId` INTEGER NOT NULL,
    `assetId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `group` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `SeriesDocument_assetId_idx`(`assetId`),
    INDEX `SeriesDocument_seriesId_sortOrder_idx`(`seriesId`, `sortOrder`),
    UNIQUE INDEX `SeriesDocument_seriesId_assetId_key`(`seriesId`, `assetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SeriesImage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `seriesId` INTEGER NOT NULL,
    `assetId` INTEGER NOT NULL,
    `altText` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `SeriesImage_assetId_idx`(`assetId`),
    INDEX `SeriesImage_seriesId_sortOrder_idx`(`seriesId`, `sortOrder`),
    UNIQUE INDEX `SeriesImage_seriesId_assetId_key`(`seriesId`, `assetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Series_parentId_idx` ON `Series`(`parentId`);

-- CreateIndex
CREATE INDEX `ProductImage_assetId_idx` ON `ProductImage`(`assetId`);

-- CreateIndex
CREATE INDEX `ProductImage_inheritedFromSeriesId_idx` ON `ProductImage`(`inheritedFromSeriesId`);

-- CreateIndex
CREATE INDEX `ProductDocument_assetId_idx` ON `ProductDocument`(`assetId`);

-- CreateIndex
CREATE INDEX `ProductDocument_inheritedFromSeriesId_idx` ON `ProductDocument`(`inheritedFromSeriesId`);

-- CreateIndex
CREATE INDEX `ProductSpec_productId_sortOrder_idx` ON `ProductSpec`(`productId`, `sortOrder`);

-- AddForeignKey
ALTER TABLE `Series` ADD CONSTRAINT `Series_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Series`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductImage` ADD CONSTRAINT `ProductImage_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `CatalogAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductImage` ADD CONSTRAINT `ProductImage_inheritedFromSeriesId_fkey` FOREIGN KEY (`inheritedFromSeriesId`) REFERENCES `Series`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductDocument` ADD CONSTRAINT `ProductDocument_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `CatalogAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductDocument` ADD CONSTRAINT `ProductDocument_inheritedFromSeriesId_fkey` FOREIGN KEY (`inheritedFromSeriesId`) REFERENCES `Series`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductSeries` ADD CONSTRAINT `ProductSeries_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductSeries` ADD CONSTRAINT `ProductSeries_seriesId_fkey` FOREIGN KEY (`seriesId`) REFERENCES `Series`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductOperatingRating` ADD CONSTRAINT `ProductOperatingRating_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductSource` ADD CONSTRAINT `ProductSource_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SeriesDocument` ADD CONSTRAINT `SeriesDocument_seriesId_fkey` FOREIGN KEY (`seriesId`) REFERENCES `Series`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SeriesDocument` ADD CONSTRAINT `SeriesDocument_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `CatalogAsset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SeriesImage` ADD CONSTRAINT `SeriesImage_seriesId_fkey` FOREIGN KEY (`seriesId`) REFERENCES `Series`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SeriesImage` ADD CONSTRAINT `SeriesImage_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `CatalogAsset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve existing primary series memberships during the transition.
INSERT INTO `ProductSeries` (`productId`, `seriesId`)
SELECT `id`, `seriesId` FROM `Product` WHERE `seriesId` IS NOT NULL;

-- Preserve existing characteristic insertion order; names may repeat.
UPDATE `ProductSpec` SET `sortOrder` = `id`;
