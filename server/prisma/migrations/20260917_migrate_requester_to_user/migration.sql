-- Remove old Ticket foreign key
ALTER TABLE "Ticket"
DROP CONSTRAINT "Ticket_requesterId_fkey";


-- Add new Ticket foreign key referencing User
ALTER TABLE "Ticket"
ADD CONSTRAINT "Ticket_requesterId_fkey"
FOREIGN KEY ("requesterId")
REFERENCES "User"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;


-- Remove old temporary requester table
DROP TABLE "RequesterUser";