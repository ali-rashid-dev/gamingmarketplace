import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserRole } from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";

const roles = [
  { role: UserRole.BUYER, description: "Marketplace buyer role; assigned to every account by default." },
  { role: UserRole.SELLER, description: "Seller access is assigned only after the seller application is approved." },
  { role: UserRole.SUPPORT, description: "Support console access for tickets, reports, and dispute workflows." },
  { role: UserRole.ADMIN, description: "Marketplace operations access, including catalog and listing moderation." },
  { role: UserRole.SUPER_ADMIN, description: "Platform administration, privileged access management, and audit review." },
];

type Access = "yes" | "limited" | "no";

const accessLabels: Record<Access, string> = {
  yes: "Allowed",
  limited: "Limited",
  no: "Not allowed",
};

const permissionRows: {
  feature: string;
  permissionKey: string;
  limitedKey?: string;
}[] = [
  { feature: "Browse games", permissionKey: "marketplace.browse" },
  { feature: "Purchase offers", permissionKey: "offers.purchase" },
  { feature: "Manage own orders", permissionKey: "orders.own.manage" },
  { feature: "Create listings", permissionKey: "listings.create" },
  { feature: "Manage own shop", permissionKey: "shop.own.manage" },
  { feature: "Handle support tickets", permissionKey: "support.tickets.handle" },
  { feature: "Investigate disputes", permissionKey: "disputes.investigate" },
  { feature: "Manage users", permissionKey: "users.manage", limitedKey: "users.read.limited" },
  { feature: "Manage games", permissionKey: "games.manage" },
  { feature: "Manage commissions", permissionKey: "commissions.manage" },
  { feature: "Manage payouts", permissionKey: "payouts.manage" },
  { feature: "Manage administrators", permissionKey: "admins.manage" },
  { feature: "Manage permissions", permissionKey: "permissions.manage" },
  { feature: "Global system settings", permissionKey: "settings.manage", limitedKey: "settings.read.limited" },
  { feature: "View audit logs", permissionKey: "audit.read", limitedKey: "audit.read.limited" },
];

function AccessCell({ access }: { access: Access }) {
  if (access === "yes") {
    return (
      <TableCell className="text-center text-emerald-500">
        <span aria-label={accessLabels[access]} title={accessLabels[access]}>✓</span>
      </TableCell>
    );
  }
  if (access === "limited") {
    return (
      <TableCell className="text-center">
        <Badge variant="secondary">{accessLabels[access]}</Badge>
      </TableCell>
    );
  }
  return (
    <TableCell className="text-center text-muted-foreground">
      <span aria-label={accessLabels[access]} title={accessLabels[access]}>—</span>
    </TableCell>
  );
}

export default async function RoleStructurePage() {
  const roleRecords = await prisma.role.findMany({
    include: { permissions: { select: { permissionKey: true } } },
  });
  const grants = new Map(
    roleRecords.map(({ key, permissions }) => [
      key,
      new Set(permissions.map(({ permissionKey }) => permissionKey)),
    ])
  );
  const permissions = permissionRows.map((row) => ({
    feature: row.feature,
    access: roles.map(({ role }) => {
      const roleGrants = grants.get(role);
      if (roleGrants?.has(row.permissionKey)) return "yes" as const;
      if (row.limitedKey && roleGrants?.has(row.limitedKey)) return "limited" as const;
      return "no" as const;
    }) as [Access, Access, Access, Access, Access],
  }));

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Access control</p>
      <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Role and permission matrix</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Each account can hold multiple roles. An account begins with Buyer access; approved seller and privileged roles are added separately.
      </p>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Initial role and permission matrix</CardTitle>
          <CardDescription>
            Role grants are stored separately from accounts. The table shows the initial role-permission policy; record-level restrictions remain specific to each workflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>
              ✓ Allowed · Limited access is restricted to specifically authorized records and actions · — Not allowed
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="min-w-48">Feature</TableHead>
                {roles.map(({ role }) => (
                  <TableHead key={role} scope="col" className="text-center">
                    {role.replaceAll("_", " ")}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissions.map(({ feature, access }) => (
                <TableRow key={feature}>
                  <TableHead scope="row" className="font-medium">{feature}</TableHead>
                  {access.map((roleAccess, index) => (
                    <AccessCell key={`${feature}-${roles[index].role}`} access={roleAccess} />
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <section aria-labelledby="role-details-heading" className="mt-8">
        <h2 id="role-details-heading" className="font-display text-xl font-semibold">Current role structure</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Role assignments and permission grants are stored in the database. Permission grants are currently seeded as a fixed policy rather than configurable here. Mandatory multi-factor or step-up authentication is not implemented.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {roles.map(({ role, description }) => (
            <Card key={role}>
              <CardHeader>
                <CardTitle>{role.replaceAll("_", " ")}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
