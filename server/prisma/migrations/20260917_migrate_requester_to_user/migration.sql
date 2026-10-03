-- Create temporary mapping table
CREATE TEMP TABLE requester_user_mapping (
    old_id INTEGER,
    new_id INTEGER
);


-- Migrate existing RequesterUser records into User
-- Only insert if the email does not already exist
INSERT INTO "User"
(
    "name",
    "email",
    "passwordHash",
    "role",
    "isActive",
    "mustChangePassword",
    "createdAt",
    "updatedAt"
)
SELECT
    r."name",
    r."email",
    '$2b$10$TemporaryPasswordHash',
    'REQUESTER'::"UserRole",
    r."isActive",
    true,
    r."createdAt",
    r."updatedAt"
FROM "RequesterUser" r
WHERE NOT EXISTS (
    SELECT 1
    FROM "User" u
    WHERE u."email" = r."email"
);


-- Store old RequesterUser id -> new User id mapping
INSERT INTO requester_user_mapping(old_id, new_id)
SELECT
    r.id,
    u.id
FROM "RequesterUser" r
JOIN "User" u
ON r."email" = u."email";


-- Remove old Ticket foreign key
ALTER TABLE "Ticket"
DROP CONSTRAINT "Ticket_requesterId_fkey";


-- Update Ticket requester ownership
UPDATE "Ticket"
SET "requesterId" = m.new_id
FROM requester_user_mapping m
WHERE "Ticket"."requesterId" = m.old_id;


-- Add new Ticket foreign key referencing User
ALTER TABLE "Ticket"
ADD CONSTRAINT "Ticket_requesterId_fkey"
FOREIGN KEY ("requesterId")
REFERENCES "User"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;


-- Remove old temporary requester table
DROP TABLE "RequesterUser";