"use client";

// components/MultiLineChart.tsx
import React from "react";
import dynamic from "next/dynamic";
import { Spin } from "antd";
import dayjs from "dayjs";
import { api } from "~/server/trpc/clients/react";
import { RangePickerProps } from "./types";
import { useTheme } from "next-themes";

// Dynamically import ApexCharts to avoid SSR issues
const ApexCharts = dynamic(() => import("react-apexcharts"), { ssr: false });

const CallCountCharts: React.FC<{
  agent_ids: string[];
  selected_dates: RangePickerProps["value"];
  receptionistMap: Record<string, string>;
}> = ({ agent_ids, selected_dates, receptionistMap }) => {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "light";
  // Memoize the dates to prevent unnecessary re-renders
  const queryStartDate = React.useMemo(
    () =>
      selected_dates?.[0]?.toDate() ??
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    [selected_dates],
  );
  const queryEndDate = React.useMemo(
    () => selected_dates?.[1]?.toDate() ?? new Date(Date.now()),
    [selected_dates],
  );

  const { data, isLoading, error } =
    api.conversations.getDailyConversationCounts.useQuery({
      agent_ids,
      startDate: queryStartDate,
      endDate: queryEndDate,
    });

  // Handle the case where data is undefined
  if (error) {
    console.error("Error fetching data:", error);
    return <div>Error loading data</div>;
  }

  const callData = data?.dailyCounts ?? [];
  const startDate = data?.startDate ?? queryStartDate;
  const endDate = data?.endDate ?? queryEndDate;

  const formattedStartDate = dayjs(startDate).format("MMM D, YYYY");
  const formattedEndDate = dayjs(endDate).format("MMM D, YYYY");

  // Function to generate date range for the x-axis
  const generateDateRange = (start: string, end: string) => {
    const startDate = dayjs(start);
    const endDate = dayjs(end);
    const dates = [];

    let currentDate = startDate;
    while (currentDate <= endDate) {
      dates.push(currentDate.format("MMM D, YYYY"));
      currentDate = currentDate.add(1, "day");
    }

    return dates;
  };

  const axisLabelColor = theme === "dark" ? "#888888" : "#000000";
  const axisTitleColor = theme === "dark" ? "#888888" : "#000000";
  const legendColor = theme === "dark" ? "#888888" : "#000000";

  const options = {
    chart: {
      type: "line" as const,
      height: 350,
      toolbar: {
        show: false,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth" as const,
    },
    xaxis: {
      categories: generateDateRange(formattedStartDate, formattedEndDate),
      labels: {
        style: {
          colors: axisLabelColor,
        },
      },
    },
    yaxis: {
      title: {
        text: "Number of calls",
        style: {
          color: axisTitleColor,
        },
      },
      labels: {
        style: {
          colors: axisLabelColor,
        },
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      theme: theme,
      style: {
        fontSize: "12px",
        colors: ["var(--primary)"],
      },
      onDatasetHover: {
        highlightDataSeries: true,
      },
      marker: {
        show: true,
      },
    },
    legend: {
      labels: {
        colors: legendColor, // Color for legend text
      },
    },
    colors: [
      "#E06666",
      "#E08080",
      "#E09999",
      "#E0B3B3",
      "#D66E6E",
      "#E0667F",
      "#F2A1A1",
      "#E07D7D",
      "#E0A1A1",
      "#F57F7F",
    ],
  };

  const series = Array.isArray(callData)
    ? [] // If callData is an array (never[]), return an empty array
    : Object.entries(callData).map(([agentId, counts]) => ({
        name: receptionistMap[agentId] ?? agentId,
        data: counts,
      }));

  console.log("Data", data);
  return (
    <div style={{ position: "relative", height: 350 }}>
      {isLoading ? (
        <Spin
          size="large"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
      ) : (
        <ApexCharts
          options={options}
          series={series}
          type="line"
          height={350}
        />
      )}
    </div>
  );
};

export default CallCountCharts;
