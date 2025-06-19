"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, Crown, Shield, Sparkles, Zap } from "lucide-react";
import { useState } from "react";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: "month" | "year";
  features: string[];
  limitations?: string[];
  popular?: boolean;
  recommended?: boolean;
  icon?: "free" | "premium" | "business";
}

interface SubscriptionPlanCardProps {
  plan: SubscriptionPlan;
  currentPlan?: string;
  isLoading?: boolean;
  onSelectPlan?: (planId: string) => void;
  className?: string;
}

const planIcons = {
  free: Shield,
  premium: Sparkles,
  business: Crown,
};

export function SubscriptionPlanCard({
  plan,
  currentPlan,
  isLoading = false,
  onSelectPlan,
  className,
}: SubscriptionPlanCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const isCurrentPlan = currentPlan === plan.id;
  const isFree = plan.price === 0;

  const Icon = plan.icon ? planIcons[plan.icon] : Zap;

  const handleSelectPlan = async () => {
    if (isCurrentPlan || isProcessing || !onSelectPlan) return;

    setIsProcessing(true);
    try {
      await onSelectPlan(plan.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number, currency: string, interval: string) => {
    if (price === 0) return "Free";

    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    });

    return `${formatter.format(price)}/${interval}`;
  };

  const buttonText = () => {
    if (isCurrentPlan) return "Current Plan";
    if (isProcessing) return "Processing...";
    if (isFree) return "Get Started";
    return currentPlan ? "Upgrade" : "Subscribe";
  };

  return (
    <Card
      className={cn(
        "relative transition-all duration-200 hover:shadow-lg",
        plan.popular && "ring-2 ring-primary shadow-lg scale-105",
        plan.recommended && "border-primary",
        isCurrentPlan && "bg-muted/50",
        className,
      )}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-3 py-1">
            Most Popular
          </Badge>
        </div>
      )}

      {plan.recommended && !plan.popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge variant="outline" className="bg-background px-3 py-1">
            Recommended
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-4">
          <div
            className={cn(
              "p-3 rounded-full",
              plan.popular
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="w-6 h-6" />
          </div>
        </div>

        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription className="text-sm">
          {plan.description}
        </CardDescription>

        <div className="pt-4">
          <div className="text-3xl font-bold">
            {formatPrice(plan.price, plan.currency, plan.interval)}
          </div>
          {!isFree && (
            <div className="text-sm text-muted-foreground mt-1">
              Billed {plan.interval}ly
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Features */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">What's included:</h4>
          <ul className="space-y-2">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Limitations */}
        {plan.limitations && plan.limitations.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">
              Limitations:
            </h4>
            <ul className="space-y-2">
              {plan.limitations.map((limitation) => (
                <li
                  key={limitation}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="w-4 h-4 text-center mt-0.5 flex-shrink-0">
                    •
                  </span>
                  <span>{limitation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Button */}
        <Button
          className={cn(
            "w-full mt-6",
            plan.popular && "bg-primary hover:bg-primary/90",
            isCurrentPlan && "opacity-75",
          )}
          variant={plan.popular ? "default" : "outline"}
          disabled={isCurrentPlan || isProcessing || isLoading}
          onClick={handleSelectPlan}
        >
          {buttonText()}
        </Button>

        {/* Additional Info */}
        {!isFree && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Cancel anytime • 14-day money-back guarantee
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
