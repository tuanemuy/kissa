import { PrometheusMetricsCollector } from "@/core/adapters/prometheus/metricsCollector";
import { createContext } from "@/lib/context";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const context = await createContext();

    // Ensure we have a Prometheus metrics collector
    if (!(context.metricsCollector instanceof PrometheusMetricsCollector)) {
      return NextResponse.json(
        { error: "Metrics endpoint requires Prometheus collector" },
        { status: 500 },
      );
    }

    const metricsData = context.metricsCollector.getMetricsEndpoint();

    return new Response(metricsData, {
      headers: {
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Failed to generate metrics:", error);
    return NextResponse.json(
      { error: "Failed to generate metrics" },
      { status: 500 },
    );
  }
}
