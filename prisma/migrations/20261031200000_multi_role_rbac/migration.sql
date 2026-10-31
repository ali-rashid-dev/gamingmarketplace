CREATE TABLE "role" (
    "id" TEXT NOT NULL,
    "key" "UserRole" NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "permission" (
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "role_permission" (
    "roleId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("roleId", "permissionKey")
);

CREATE TABLE "user_role_assignment" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_assignment_pkey" PRIMARY KEY ("userId", "roleId")
);

CREATE UNIQUE INDEX "role_key_key" ON "role"("key");
CREATE INDEX "role_permission_permissionKey_idx" ON "role_permission"("permissionKey");
CREATE INDEX "user_role_assignment_roleId_createdAt_idx" ON "user_role_assignment"("roleId", "createdAt");

ALTER TABLE "role_permission"
  ADD CONSTRAINT "role_permission_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permission"
  ADD CONSTRAINT "role_permission_permissionKey_fkey"
  FOREIGN KEY ("permissionKey") REFERENCES "permission"("key") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_role_assignment"
  ADD CONSTRAINT "user_role_assignment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_role_assignment"
  ADD CONSTRAINT "user_role_assignment_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "role" ("id", "key") VALUES
  ('role_buyer', 'BUYER'),
  ('role_seller', 'SELLER'),
  ('role_support', 'SUPPORT'),
  ('role_admin', 'ADMIN'),
  ('role_super_admin', 'SUPER_ADMIN');

INSERT INTO "permission" ("key", "description") VALUES
  ('marketplace.browse', 'Browse published marketplace offers.'),
  ('offers.purchase', 'Purchase marketplace offers.'),
  ('orders.own.manage', 'Manage the account holder’s own orders.'),
  ('listings.create', 'Create marketplace listings.'),
  ('listings.moderate', 'Review and moderate marketplace listings.'),
  ('sellers.verify', 'Review seller applications and verification.'),
  ('shop.own.manage', 'Manage the account holder’s own shop.'),
  ('support.tickets.handle', 'Handle support tickets.'),
  ('disputes.investigate', 'Investigate marketplace disputes.'),
  ('users.read.limited', 'Read specifically authorized user records.'),
  ('users.manage', 'Manage marketplace user accounts.'),
  ('games.manage', 'Manage games and categories.'),
  ('commissions.manage', 'Manage marketplace commissions.'),
  ('payouts.manage', 'Review and manage seller payouts.'),
  ('admins.manage', 'Manage administrator accounts.'),
  ('permissions.manage', 'Manage role and permission assignments.'),
  ('settings.read.limited', 'Read specifically authorized system settings.'),
  ('settings.manage', 'Manage global system settings.'),
  ('audit.read.limited', 'Read specifically authorized audit records.'),
  ('audit.read', 'Read platform audit logs.');

INSERT INTO "role_permission" ("roleId", "permissionKey") VALUES
  ('role_buyer', 'marketplace.browse'),
  ('role_buyer', 'offers.purchase'),
  ('role_buyer', 'orders.own.manage'),
  ('role_seller', 'marketplace.browse'),
  ('role_seller', 'offers.purchase'),
  ('role_seller', 'orders.own.manage'),
  ('role_seller', 'listings.create'),
  ('role_seller', 'shop.own.manage'),
  ('role_support', 'marketplace.browse'),
  ('role_support', 'support.tickets.handle'),
  ('role_support', 'disputes.investigate'),
  ('role_support', 'users.read.limited'),
  ('role_support', 'audit.read.limited'),
  ('role_admin', 'marketplace.browse'),
  ('role_admin', 'listings.create'),
  ('role_admin', 'listings.moderate'),
  ('role_admin', 'sellers.verify'),
  ('role_admin', 'support.tickets.handle'),
  ('role_admin', 'disputes.investigate'),
  ('role_admin', 'users.manage'),
  ('role_admin', 'games.manage'),
  ('role_admin', 'commissions.manage'),
  ('role_admin', 'payouts.manage'),
  ('role_admin', 'settings.read.limited'),
  ('role_admin', 'audit.read.limited'),
  ('role_super_admin', 'marketplace.browse'),
  ('role_super_admin', 'listings.create'),
  ('role_super_admin', 'listings.moderate'),
  ('role_super_admin', 'sellers.verify'),
  ('role_super_admin', 'support.tickets.handle'),
  ('role_super_admin', 'disputes.investigate'),
  ('role_super_admin', 'users.manage'),
  ('role_super_admin', 'games.manage'),
  ('role_super_admin', 'commissions.manage'),
  ('role_super_admin', 'payouts.manage'),
  ('role_super_admin', 'admins.manage'),
  ('role_super_admin', 'permissions.manage'),
  ('role_super_admin', 'settings.manage'),
  ('role_super_admin', 'audit.read');

INSERT INTO "user_role_assignment" ("userId", "roleId")
SELECT "id", 'role_buyer' FROM "user"
ON CONFLICT DO NOTHING;

INSERT INTO "user_role_assignment" ("userId", "roleId")
SELECT u."id",
       CASE u."role"
         WHEN 'SELLER' THEN 'role_seller'
         WHEN 'SUPPORT' THEN 'role_support'
         WHEN 'ADMIN' THEN 'role_admin'
         WHEN 'SUPER_ADMIN' THEN 'role_super_admin'
       END
FROM "user" u
WHERE u."role" IN ('SELLER', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN')
  AND (
    u."role" <> 'SELLER'
    OR EXISTS (
      SELECT 1 FROM "sellerProfile" sp
      WHERE sp."userId" = u."id" AND sp."status" = 'APPROVED'
    )
  )
ON CONFLICT DO NOTHING;

INSERT INTO "user_role_assignment" ("userId", "roleId")
SELECT sp."userId", 'role_seller'
FROM "sellerProfile" sp
WHERE sp."status" = 'APPROVED'
ON CONFLICT DO NOTHING;

DROP INDEX IF EXISTS "user_role_idx";
ALTER TABLE "user" DROP COLUMN "role";

CREATE FUNCTION assign_default_buyer_role() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "user_role_assignment" ("userId", "roleId")
  VALUES (NEW."id", 'role_buyer')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "user_assign_default_buyer_role"
AFTER INSERT ON "user"
FOR EACH ROW
EXECUTE FUNCTION assign_default_buyer_role();
