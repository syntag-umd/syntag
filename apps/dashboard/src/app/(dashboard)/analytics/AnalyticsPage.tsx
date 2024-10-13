"use client";

import React, { useMemo } from "react";
import { Select, Typography, DatePicker, Row, Col, Spin } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs"; // Correct import
import { RangePickerProps } from "./types";
import TimeSavedCard from "./TimeSaved";
import CallCountCard from "./CallCount";
import AverageCallTimeCard from "./AverageCallTime";
import CallCountChartsCard from "./CallCountChartsCard";
import { api } from "~/server/trpc/clients/react";

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface AnalyticsPageProps {
  receptionists: string[];
  receptionistMap: Record<string, string>;
}
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  receptionists,
  receptionistMap,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const agent_overviews_query = api.agent.getOverview.useQuery();

  const receptionist_sp = searchParams.get("receptionists")?.split(",");
  // Derive query params directly
  const receptionists_uuids: string[] = (
    receptionist_sp ??
    agent_overviews_query.data?.map((va) => va.uuid) ??
    []
  ).filter((s) => uuidRegex.test(s)); //turns [''] into []

  const startDate = searchParams.get("startDate")
    ? dayjs(searchParams.get("startDate"))
    : null;
  const endDate = searchParams.get("endDate")
    ? dayjs(searchParams.get("endDate"))
    : null;
  const selectedDates =
    startDate && endDate
      ? ([startDate, endDate] as RangePickerProps["value"])
      : null;

  console.log(
    "Search params",
    searchParams.get("receptionists"),
    typeof searchParams.get("receptionists"),
    searchParams.get("receptionists")?.length,
    searchParams.get("receptionists")?.split(","),
    receptionists_uuids,
  );

  // Memoized values to avoid unnecessary re-renders
  const options = useMemo(
    () =>
      receptionists.map((item) => ({
        value: item,
        label: receptionistMap[item],
      })),
    [receptionists],
  );

  const handleReceptionistChange = (receptionistIds: string[]) => {
    updateQueryParams(receptionistIds, selectedDates);
  };

  const handleDateChange = (
    dates: RangePickerProps["value"],
    dateStrings: [string, string],
  ) => {
    const newDates = dates && dates.length === 2 ? dates : null;
    updateQueryParams(receptionists_uuids, newDates);
  };

  const updateQueryParams = (
    receptionists_uuids: string[],
    dates: RangePickerProps["value"],
  ) => {
    const queryParams: Record<string, string | string[]> = {};

    queryParams.receptionists = receptionists_uuids
      .filter((s) => s.length > 0)
      .join(","); // Convert array to comma-separated string
    if (dates) {
      if (dates[0]) queryParams.startDate = dates[0].format("YYYY-MM-DD HH:mm");
      if (dates[1]) queryParams.endDate = dates[1].format("YYYY-MM-DD HH:mm");
    }
    const queryString = new URLSearchParams(
      queryParams as Record<string, string>,
    ).toString();
    router.push(`?${queryString}`); // Use URLSearchParams to construct the query string
  };

  return (
    <div>
      <Row gutter={[16, 16]} className="flex-col md:flex-row">
        <Col xs={24} md={12} className="mb-4 md:mb-0">
          <Text>Filter by receptionists</Text>
          <Select
            mode="multiple"
            size="large"
            placeholder="Select receptionists"
            value={receptionists_uuids}
            onChange={handleReceptionistChange}
            style={{ width: "100%" }}
            options={options}
          />
        </Col>
        <Col xs={24} md={12}>
          <Text>Filter by date</Text>
          <div></div>
          <RangePicker
            showTime={{ format: "HH:mm" }}
            size="large"
            format="YYYY-MM-DD HH:mm"
            value={selectedDates}
            onChange={handleDateChange}
          />
        </Col>
      </Row>
      {receptionists_uuids.length === 0 ? (
        <div className="flex justify-center pt-4">
          {agent_overviews_query.isLoading ? (
            <Spin />
          ) : (
            <p>No receptionists selected</p>
          )}
        </div>
      ) : (
        <>
          <Row gutter={[16, 16]} className="mt-4">
            <Col span={24} sm={8}>
              <CallCountCard
                agent_ids={receptionists_uuids}
                selected_dates={selectedDates}
              />
            </Col>
            <Col span={24} sm={8}>
              <TimeSavedCard
                agent_ids={receptionists_uuids}
                selected_dates={selectedDates}
              />
            </Col>
            <Col span={24} sm={8}>
              <AverageCallTimeCard
                agent_ids={receptionists_uuids}
                selected_dates={selectedDates}
              />
            </Col>
          </Row>
          <div className="mt-4">
            <CallCountChartsCard
              agent_ids={receptionists_uuids}
              selected_dates={selectedDates}
              receptionistMap={receptionistMap}
            />
          </div>
        </>
      )}
    </div>
  );
};
