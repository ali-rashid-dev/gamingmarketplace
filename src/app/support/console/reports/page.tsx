import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getSupportReports } from "../data";
import { SupportReportQueue } from "./support-report-queue";

export default async function SupportReportsPage() {
  const reports = await getSupportReports();
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Trust and safety</p>
      <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Abuse and suspicious activity</h1>
      <p className="mt-2 text-sm text-muted-foreground">Review agent-submitted reports and update case status.</p>
      {reports.length ? (
        <div className="mt-5 space-y-3">
          {reports.map((report) => (
            <Card key={report.id} className="min-w-0">
              <CardContent className="grid min-w-0 gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{report.category.replaceAll("_", " ")}</Badge>
                    <Badge variant={report.status === "OPEN" ? "destructive" : "secondary"}>{report.status}</Badge>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{report.details}</p>
                  <p className="mt-2 break-words text-xs text-muted-foreground">
                    Reported by {report.submittedBy.name}
                    {report.reportedUser ? ` · Account ${report.reportedUser.name} (${report.reportedUser.email})` : ""}
                    {report.order ? ` · Order ${report.order.orderNumber}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Submitted {report.createdAt.toLocaleString()}{report.assignedTo ? ` · Owner ${report.assignedTo.name}` : ""}</p>
                </div>
                <SupportReportQueue reportId={report.id} status={report.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mt-5 border-dashed"><CardContent className="py-10 text-center text-sm text-muted-foreground">No reports have been filed.</CardContent></Card>
      )}
    </main>
  );
}
