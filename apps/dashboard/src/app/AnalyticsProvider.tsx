"use client";
import React, { useEffect } from "react";
import { BrowserAgent } from "@newrelic/browser-agent/loaders/browser-agent";
import { env } from "~/env";

const newRelicOptions = {
  init: {
    session_replay: {
      enabled: true,
      block_selector: "",
      mask_text_selector: "",
      sampling_rate: 100.0,
      error_sampling_rate: 100.0,
      mask_all_inputs: false,
      collect_fonts: true,
      inline_images: false,
      inline_stylesheet: true,
      mask_input_options: {},
    },
    distributed_tracing: { enabled: true },
    privacy: { cookies_enabled: true },
    ajax: { deny_list: ["bam.nr-data.net"] },
  },
  info: {
    beacon: "bam.nr-data.net",
    errorBeacon: "bam.nr-data.net",
    licenseKey: "NRJS-a063273c9df1d4f5130",
    applicationID: "1103350576",
    sa: 1,
  },
  loader_config: {
    accountID: "4563433",
    trustKey: "4563433",
    agentID: "1103350576",
    licenseKey: "NRJS-a063273c9df1d4f5130",
    applicationID: "1103350576",
  },
  features: [] as any[],
};
export class BrowserAnalytics {
  static agentPromise: Promise<BrowserAgent> | null = null;
  static async loadAgent() {
    const BrowserAgentModule = await import(
      "@newrelic/browser-agent/loaders/browser-agent"
    );

    const LoggingModule = await import(
      "@newrelic/browser-agent/features/logging"
    );
    //I don't think this does anything
    newRelicOptions.features.push(LoggingModule.Logging);

    const agent = new BrowserAgentModule.BrowserAgent(newRelicOptions);
    agent.setApplicationVersion(env.NEXT_PUBLIC_VERSION);
    agent.recordReplay();
    agent.start();

    agent.wrapLogger(console, "error", { level: "ERROR" });
    /* agent.wrapLogger(console, "log", { level: "INFO" }); */

    const lm = new LoggingModule.Logging(
      agent.agentIdentifier,
      agent.sharedAggregator,
    );

    return agent;
  }

  static async getAgent() {
    if (typeof window === "undefined") {
      throw new Error("No window object: GetAgent");
    }
    if (BrowserAnalytics.agentPromise) {
      return await BrowserAnalytics.agentPromise;
    }
    BrowserAnalytics.agentPromise = BrowserAnalytics.loadAgent();
    return await BrowserAnalytics.agentPromise;
  }
  static async setUserId(userId: string | null) {
    const agent = await BrowserAnalytics.getAgent();
    agent.setUserId(userId);
  }
}

export default function AnalyticsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (env.NEXT_PUBLIC_BROWSER_ANALYTICS === "TRUE") {
      try {
        if (typeof window !== "undefined") {
          void BrowserAnalytics.getAgent();
        }
      } catch (e) {
        console.error("NR: ", e);
      }
    } else {
      console.warn("NR: Browser analytics disabled");
    }
  }, []);

  return children;
}
