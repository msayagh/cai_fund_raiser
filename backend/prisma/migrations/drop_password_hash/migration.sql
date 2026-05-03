-- Drop passwordHash column from Donor and Admin (passwordless OTP auth)
ALTER TABLE `Donor` DROP COLUMN `passwordHash`;
ALTER TABLE `Admin` DROP COLUMN `passwordHash`;
