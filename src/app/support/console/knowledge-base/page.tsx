import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const guides = [
  {
    title: "Verify the order before sharing details",
    category: "Account safety",
    points: [
      "Use the authenticated buyer or seller account connected to the case.",
      "Only discuss order information needed to resolve the ticket.",
      "Never ask for passwords, recovery codes, or payment credentials.",
    ],
  },
  {
    title: "Request useful evidence",
    category: "Investigation",
    points: [
      "Ask for a specific screenshot, delivery timestamp, or transaction reference.",
      "Explain how the evidence relates to the issue and provide a clear response deadline.",
      "Keep requests in the ticket or dispute record so the case history is auditable.",
    ],
  },
  {
    title: "Respond to a disputed delivery",
    category: "Disputes",
    points: [
      "Review the order item, delivery status, and submitted evidence from both parties.",
      "Record relevant facts in an internal note; keep customer-facing replies neutral.",
      "Escalate contested or high-risk cases for review. Do not promise refunds or release funds.",
    ],
  },
  {
    title: "Handle suspicious activity",
    category: "Trust and safety",
    points: [
      "Record observable behavior and related order references rather than assumptions.",
      "File a report for review and avoid confronting or warning a suspected bad actor.",
      "Do not change account roles, payout details, or financial records.",
    ],
  },
];

export default function SupportKnowledgeBasePage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Support playbook</p>
      <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Knowledge base</h1>
      <p className="mt-2 text-sm text-muted-foreground">Internal guidance for safe and consistent customer support.</p>
      <div className="mt-5 grid min-w-0 gap-3 lg:grid-cols-2">
        {guides.map((guide) => (
          <Card key={guide.title}>
            <CardHeader>
              <CardDescription>{guide.category}</CardDescription>
              <CardTitle className="text-base">{guide.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
                {guide.points.map((point) => <li key={point}>{point}</li>)}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs leading-5 text-muted-foreground">
        These support tools do not authorize refunds, payout processing, fund releases, commission changes, or administrative account changes.
      </p>
    </main>
  );
}
