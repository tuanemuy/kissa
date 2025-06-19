"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Download,
  Receipt,
  Settings,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { SubscriptionPlanCard } from "./SubscriptionPlanCard";

interface Subscription {
  id: string;
  plan: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd?: boolean;
  trialEnd?: string;
}

interface Usage {
  checkIns: { current: number; limit: number };
  locations: { current: number; limit: number };
  storage: { current: number; limit: number };
}

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  description: string;
  downloadUrl?: string;
}

const SUBSCRIPTION_PLANS = [
  {
    id: "free",
    name: "Free",
    description: "Perfect for getting started",
    price: 0,
    currency: "usd",
    interval: "month" as const,
    icon: "free" as const,
    features: [
      "Up to 10 check-ins per month",
      "3 locations",
      "Basic analytics",
      "Community support",
    ],
    limitations: ["Limited to 100MB storage", "No advanced features"],
  },
  {
    id: "premium",
    name: "Premium",
    description: "Great for individuals and small teams",
    price: 9.99,
    currency: "usd",
    interval: "month" as const,
    icon: "premium" as const,
    popular: true,
    features: [
      "Unlimited check-ins",
      "50 locations",
      "Advanced analytics",
      "Priority support",
      "Export data",
      "Custom themes",
    ],
  },
  {
    id: "business",
    name: "Business",
    description: "For teams and organizations",
    price: 29.99,
    currency: "usd",
    interval: "month" as const,
    icon: "business" as const,
    recommended: true,
    features: [
      "Everything in Premium",
      "Unlimited locations",
      "Team collaboration",
      "Advanced integrations",
      "Custom branding",
      "Dedicated support",
      "SLA guarantee",
    ],
  },
];

export function BillingDashboard({ userId }: { userId: string }) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      setIsLoading(true);

      // Load subscription status
      const subResponse = await fetch("/api/billing/subscription");
      if (subResponse.ok) {
        const subData = await subResponse.json();
        setSubscription(subData);
      }

      // Load usage data
      const usageResponse = await fetch("/api/billing/usage");
      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        setUsage(usageData);
      }

      // Load invoices
      const invoicesResponse = await fetch("/api/billing/invoices");
      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json();
        setInvoices(invoicesData);
      }
    } catch (error) {
      console.error("Failed to load billing data:", error);
      toast.error("Failed to load billing information.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanChange = async (newPlanId: string) => {
    try {
      const response = await fetch("/api/billing/change-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId: newPlanId }),
      });

      if (response.ok) {
        await loadBillingData();
        setShowPlanSelector(false);
        toast.success("Your subscription has been updated successfully.");
      } else {
        throw new Error("Failed to update plan");
      }
    } catch (error) {
      console.error("Failed to change plan:", error);
      toast.error("Failed to update your subscription plan.");
    }
  };

  const handleCancelSubscription = async () => {
    try {
      const response = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cancelAtPeriodEnd: true }),
      });

      if (response.ok) {
        await loadBillingData();
        setShowCancelConfirm(false);
        toast.success(
          "Your subscription will end at the end of the current billing period.",
        );
      } else {
        throw new Error("Failed to cancel subscription");
      }
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      toast.error("Failed to cancel your subscription.");
    }
  };

  const downloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(
        `/api/billing/invoices/${invoiceId}/download`,
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `invoice-${invoiceId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error("Failed to download invoice");
      }
    } catch (error) {
      console.error("Failed to download invoice:", error);
      toast.error("Failed to download invoice.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "trialing":
        return <Badge className="bg-blue-100 text-blue-800">Trial</Badge>;
      case "past_due":
        return <Badge variant="destructive">Past Due</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={`loading-skeleton-${Math.random().toString(36)}`}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="h-8 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Current Subscription
              </CardTitle>
              <CardDescription>
                Manage your subscription and billing preferences
              </CardDescription>
            </div>
            <Dialog open={showPlanSelector} onOpenChange={setShowPlanSelector}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Change Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Choose Your Plan</DialogTitle>
                  <DialogDescription>
                    Select the plan that best fits your needs. You can change or
                    cancel anytime.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 md:grid-cols-3 py-4">
                  {SUBSCRIPTION_PLANS.map((plan) => (
                    <SubscriptionPlanCard
                      key={plan.id}
                      plan={plan}
                      currentPlan={subscription?.plan}
                      onSelectPlan={handlePlanChange}
                    />
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">
                    {SUBSCRIPTION_PLANS.find((p) => p.id === subscription.plan)
                      ?.name || subscription.plan}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {subscription.trialEnd
                      ? `Trial ends ${new Date(subscription.trialEnd).toLocaleDateString()}`
                      : `Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
                  </p>
                </div>
                {getStatusBadge(subscription.status)}
              </div>

              {subscription.cancelAtPeriodEnd && (
                <Alert>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    Your subscription is scheduled to cancel on{" "}
                    {new Date(
                      subscription.currentPeriodEnd,
                    ).toLocaleDateString()}
                    . You can reactivate it anytime before then.
                  </AlertDescription>
                </Alert>
              )}

              {subscription.plan !== "free" &&
                !subscription.cancelAtPeriodEnd && (
                  <div className="pt-4 border-t">
                    <Dialog
                      open={showCancelConfirm}
                      onOpenChange={setShowCancelConfirm}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Cancel Subscription
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Cancel Subscription</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to cancel your subscription?
                            You'll continue to have access until the end of your
                            current billing period.
                          </DialogDescription>
                        </DialogHeader>

                        <div className="flex gap-2 pt-4">
                          <Button
                            variant="outline"
                            onClick={() => setShowCancelConfirm(false)}
                            className="flex-1"
                          >
                            Keep Subscription
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleCancelSubscription}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
            </>
          ) : (
            <div className="text-center py-8">
              <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No Active Subscription
              </h3>
              <p className="text-muted-foreground mb-4">
                Choose a plan to unlock premium features and unlimited usage.
              </p>
              <Button onClick={() => setShowPlanSelector(true)}>
                View Plans
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      {usage && (
        <Card>
          <CardHeader>
            <CardTitle>Usage This Month</CardTitle>
            <CardDescription>
              Track your usage against your plan limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Check-ins</span>
                  <span>
                    {usage.checkIns.current} /{" "}
                    {usage.checkIns.limit === -1 ? "∞" : usage.checkIns.limit}
                  </span>
                </div>
                <Progress
                  value={
                    usage.checkIns.limit === -1
                      ? 0
                      : (usage.checkIns.current / usage.checkIns.limit) * 100
                  }
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Locations</span>
                  <span>
                    {usage.locations.current} /{" "}
                    {usage.locations.limit === -1 ? "∞" : usage.locations.limit}
                  </span>
                </div>
                <Progress
                  value={
                    usage.locations.limit === -1
                      ? 0
                      : (usage.locations.current / usage.locations.limit) * 100
                  }
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Storage</span>
                  <span>
                    {Math.round(usage.storage.current / 1024 / 1024)} MB /{" "}
                    {Math.round(usage.storage.limit / 1024 / 1024)} MB
                  </span>
                </div>
                <Progress
                  value={(usage.storage.current / usage.storage.limit) * 100}
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Billing History
          </CardTitle>
          <CardDescription>View and download your invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No invoices found.
            </p>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{invoice.description}</span>
                      <Badge
                        variant={
                          invoice.status === "paid"
                            ? "default"
                            : invoice.status === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(invoice.date).toLocaleDateString()} •{" "}
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {invoice.status === "paid" && (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                    {invoice.status === "pending" && (
                      <Clock className="w-4 h-4 text-yellow-600" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadInvoice(invoice.id)}
                      className="flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>
            Manage your payment methods and billing information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-6 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">VISA</span>
              </div>
              <div>
                <p className="font-medium">•••• •••• •••• 4242</p>
                <p className="text-sm text-muted-foreground">Expires 12/24</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <ArrowUpRight className="w-4 h-4" />
              Manage
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
