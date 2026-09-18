-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "assignedStaffId" INTEGER;

-- CreateIndex
CREATE INDEX "Ticket_assignedStaffId_idx" ON "Ticket"("assignedStaffId");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
