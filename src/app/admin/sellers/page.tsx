import { SellerStatus } from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { SellerApplicationQueue } from "./seller-application-queue";

export default async function AdminSellerApplicationsPage() {
  const applications = await prisma.sellerProfile.findMany({
    where: { status: SellerStatus.PENDING },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 100,
    select: {
      id: true,
      shopName: true,
      description: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  return <SellerApplicationQueue applications={applications} />;
}
