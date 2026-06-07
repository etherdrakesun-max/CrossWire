-- CreateTable
CREATE TABLE "PasskeyUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "credentialId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "PasskeyUser_credentialId_key" ON "PasskeyUser"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "PasskeyUser_walletAddress_key" ON "PasskeyUser"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "PasskeyUser_username_key" ON "PasskeyUser"("username");
