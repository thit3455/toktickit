-- Repair only the unusable marker assigned by the historical Lab 2 migration.
-- Lab development initial password: Password123! (bcrypt, cost 10).
-- Existing usable passwords, account state and ownership are preserved.
UPDATE "User"
SET "passwordHash" = '$2b$10$Zx6DNXhwuIk3HRhLhs81eevBSvLd1VhJmObwEn9xmxN0lRTZOn6Hm',
    "mustChangePassword" = true
WHERE "role" = 'REQUESTER'
  AND "passwordHash" = '$2b$10$TemporaryPasswordHash';
