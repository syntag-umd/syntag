"use client";
import { Tabs } from "antd";
import styled from "@emotion/styled";

/** &.ant-tabs-tab-active -> current class with the additional class
 *  & .ant-tabs-tab-btn -> any descendent class
 * is(&) -> increases specificity and precedence
 */
export const StyledTabs = styled(Tabs)`


  & .ant-tabs-nav::before {
    border-color: var(--primary);
  }

  :is(&):is(&):is(&) > * > * > * > .ant-tabs-tab {
    &:hover {
      color: var(--primary);
      cursor: pointer;
    }
    border-color: var(--primary);
    border-radius: var(--radius) var(--radius) 0px 0px;

    &.ant-tabs-tab-active {
      :hover {
        cursor: default;
      }
      background-color: var(--primary);
      & > .ant-tabs-tab-btn {
        color: #fff;
      }
    }
  }
`;
