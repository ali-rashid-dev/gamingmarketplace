import { SellerStatus } from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { SellerApplicationQueue } from "./seller-application-queue";

const PAGE_SIZE = 100;

function parsePage(pageParam: string | string[] | undefined) {
  const rawPage = Array.isArray(pageParam) ? pageParam[0] : pageParam;
  if (!rawPage || !/^\d+$/.test(rawPage)) return 1;
  const page = Number(rawPage);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export default async function AdminSellerApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { page: pageParam } = await searchParams;
  const totalApplications = await prisma.sellerProfile.count({
    where: { status: SellerStatus.PENDING },
  });
  const totalPages = Math.max(1, Math.ceil(totalApplications / PAGE_SIZE));
  const page = Math.min(parsePage(pageParam), totalPages);
  const applications = await prisma.sellerProfile.findMany({
    where: { status: SellerStatus.PENDING },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      shopName: true,
      description: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  return (
    <SellerApplicationQueue
      applications={applications}
      page={page}
      pageSize={PAGE_SIZE}
      totalApplications={totalApplications}
      totalPages={totalPages}
    />
  );
}
