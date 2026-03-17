-- CreateTable
CREATE TABLE `ApiKey` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `keyPrefix` VARCHAR(191) NOT NULL,
  `keyHash` VARCHAR(191) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdByAdminId` VARCHAR(191) NULL,
  `lastUsedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `ApiKey_keyHash_key`(`keyHash`),
  INDEX `ApiKey_createdByAdminId_idx`(`createdByAdminId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ApiKey`
ADD CONSTRAINT `ApiKey_createdByAdminId_fkey`
FOREIGN KEY (`createdByAdminId`) REFERENCES `Admin`(`id`)
ON DELETE SET NULL ON UPDATE CASCADE;
