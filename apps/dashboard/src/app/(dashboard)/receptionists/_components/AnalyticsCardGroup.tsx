"use client";

import React from 'react';
import { Row, Col } from 'antd';
import CallCountCard from './CallCount'; 
import TimeSavedCard from './TimeSaved';
import AverageCallDurationCard from './AverageCallDuration';

const AnalyticsCardGroup: React.FC<{ timeframe: string }> = ({ timeframe }) => {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={24} md={8}>
        <CallCountCard timeframe={timeframe} />
      </Col>
      <Col xs={24} sm={24} md={8}>
        <TimeSavedCard timeframe={timeframe} />
      </Col>
      <Col xs={24} sm={24} md={8}>
        <AverageCallDurationCard timeframe={timeframe} />
      </Col>
    </Row>
  );
};

export default AnalyticsCardGroup;
