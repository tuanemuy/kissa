import { getUserBillingHistory } from "@/actions/billing";
import { requireAuth } from "@/lib/auth";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();

    const url = new URL(request.url);
    const page = Number.parseInt(url.searchParams.get("page") || "1");
    const limit = Number.parseInt(url.searchParams.get("limit") || "20");

    const billingHistory = await getUserBillingHistory(page, limit);

    // Transform billing history to invoice format
    const invoices = billingHistory.items.map((transaction) => ({
      id: transaction.id,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      date: transaction.createdAt.toISOString(),
      description: `${transaction.type.replace("_", " ")} - ${transaction.fromPlan || "Plan"} to ${transaction.toPlan || "Plan"}`,
      downloadUrl: `/api/billing/invoices/${transaction.id}/download`,
    }));

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Failed to get invoices:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
