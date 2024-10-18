"use client";
import styled from "@emotion/styled";
import {
  Button as AntButton,
  ConfigProvider,
  Popover,
  Tabs,
  Radio,
  RadioChangeEvent,
} from "antd";
import React, { useEffect, useState } from "react";
import { TinyColor } from "@ctrl/tinycolor";
import { api } from "~/server/trpc/clients/react";
import { formatDistanceStrict } from "date-fns";
import parsePhoneNumber from "libphonenumber-js";
import {
  type ConvoSearch,
  type ConvosResponse,
} from "~/features/conversations/router";
const StyledTabs = styled(Tabs)`
  & {
    min-height: min(500px, 80vh);
    max-height: min(500px, 80vh);
  }
  & .ant-tabs-nav {
    padding: 8px 0px 8px 0px;
  }
  :is(&):is(&):is(&) {
    .ant-tabs-tab {
      border: 1px solid var(--border);
      padding: 8px 8px 8px 18px;
      border-radius: calc(var(--radius) / 2);
    }
    .ant-tabs-tab:hover:not(.ant-tabs-tab-active) {
      color: var(--card-foreground-hover);
      opacity: 0.7;
    }
    .ant-tabs-tab-active {
      border-radius-top-right: 0px;
      borer-radius-bottom-right: 0px;
      }
      .ant-tabs-tab-btn {
        flex-grow: 1;
      }
    }
  }
`;

import { Input } from "antd";
import themeConfig from "~/styles/themeConfig";
import { DatePicker, theme as antdTheme } from "antd";
import { type Dayjs } from "dayjs";

const { RangePicker } = DatePicker;
const { Search } = Input;

function formatTimeOfDay(date: Date) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const options = {
    month: "long" as const,
    day: "numeric" as const,
    year: "numeric" as const,
    timeZone: timeZone,
  };
  const formatter = new Intl.DateTimeFormat("en-US", options);
  const dateTime = formatter.format(date);

  const dayTime = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timeZone,
  });
  const distanceToNow = formatDistanceStrict(date, new Date());

  return { distanceToNow, dateTime, dayTime };
}

const NO_TIME_PICKER_CLASSNAME = "ant-no-time-picker";
import PhoneInput, { PhoneInputProps } from "antd-phone-input";
import { transformPhoneNumber } from "~/features/agents/types";
import { Separator } from "~/components/ui/separator";
import { useTheme } from "next-themes";
import { Icons } from "~/components/Icons";
import { MAIN_ID } from "~/app/constants";
import { Dialog, DialogContent } from "~/components/ui/dialog";
export default function Convos(props: { agent_id: string }) {
  const { defaultAlgorithm, darkAlgorithm } = antdTheme;
  const { resolvedTheme } = useTheme();

  const [search, setSearch] = useState<ConvoSearch>({
    agent_id: props.agent_id,
  });
  const { data: convos, isFetching: isConvoFetching } =
    api.conversations.getConvos.useQuery(search, {
      placeholderData: (prev) => prev,
      refetchOnMount: "always",
      refetchOnWindowFocus: "always",
    });
  const [activeConvo, setActiveConvo] = React.useState<string>("0");

  const root = document.documentElement;
  const styles = getComputedStyle(root);
  const primaryColor = styles.getPropertyValue("--primary").trim();
  const tColor = new TinyColor(primaryColor);

  const [dateFilter, setDateFilter] = useState<[Dayjs | null, Dayjs | null]>([
    null,
    null,
  ]);
  const handleDateFilter = (dateFilter: [Dayjs | null, Dayjs | null]) => {
    setDateFilter(dateFilter);
    if (
      dateFilter[0] &&
      dateFilter[1] &&
      dateFilter[0].isAfter(dateFilter[1])
    ) {
      return;
    }

    setSearch((prev) => {
      return {
        ...prev,
        start_time: dateFilter[0]?.toDate(),
        end_time: dateFilter[1]?.toDate(),
      };
    });
  };
  const handleTextFilter = (text: string) => {
    setSearch((prev) => {
      return {
        ...prev,
        text: text,
      };
    });
  };

  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const element = document.getElementById(MAIN_ID);
    if (!element) return;
    const handleResize = () => {
      const style = window.getComputedStyle(element);
      const paddingLeft = parseFloat(style.paddingLeft);
      const paddingRight = parseFloat(style.paddingRight);
      const width = element.getBoundingClientRect().width;
      const innerWidth = width - paddingLeft - paddingRight;

      if (innerWidth >= 600 + 40) {
        setIsDesktop(true);
      }
      if (innerWidth < 600) {
        setIsDesktop(false);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(element);

    handleResize();
    return () => {
      resizeObserver.unobserve(element);
    };
  }, []);
  const handleChangePhoneNumber: PhoneInputProps["onChange"] = (phone) => {
    const phoneNumberConcat = `+${phone.countryCode}${phone.areaCode}${phone.phoneNumber}`;
    const phoneNumber = transformPhoneNumber(phoneNumberConcat);

    const caller_pn = phoneNumber.length === 0 ? undefined : phoneNumber;

    setSearch((prev) => {
      return {
        ...prev,
        caller_pn: caller_pn,
      };
    });
  };
  const [category, setCategory] = useState<"all" | "unread" | "starred">("all");
  const handleChangeCategory = (e: RadioChangeEvent) => {
    const value = e.target.value as "all" | "unread" | "starred";
    setCategory(value);
    if (value == "unread") {
      setSearch((prev) => {
        return {
          ...prev,
          viewed: false,
          starred: undefined,
        };
      });
    } else if (value == "starred") {
      setSearch((prev) => {
        return {
          ...prev,
          starred: true,
          viewed: undefined,
        };
      });
    } else {
      setSearch((prev) => {
        return {
          ...prev,
          starred: undefined,
          viewed: undefined,
        };
      });
    }
  };
  const [textInput, setTextInput] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  if (!convos) {
    return null;
  }

  return (
    <div>
      <ConfigProvider
        theme={{
          ...themeConfig,
          algorithm:
            resolvedTheme === "dark" ? darkAlgorithm : defaultAlgorithm,
          inherit: false,
          components: {
            Tabs: {
              itemSelectedColor: tColor.toHex8String(),
              itemActiveColor: "var(--primary)",
              inkBarColor: "var(--primary)",
              itemHoverColor: "var(--primary)",
            },
          },
        }}
      >
        {isDesktop ? (
          <StyledTabs
            activeKey={activeConvo}
            tabPosition="left"
            onTabClick={(key) => {
              setActiveConvo(key);
            }}
            renderTabBar={(props, DefaultTabBar) => (
              <div className="relative z-[0] box-border min-w-[292px] max-w-[292px] overflow-y-scroll pr-[16px]">
                <div className="mb-1">
                  <Search
                    value={textInput}
                    onChange={(e) => {
                      setTextInput(e.target.value);
                    }}
                    className="[&_.ant-input-search-button]:!w-[56px]"
                    loading={isConvoFetching}
                    onSearch={handleTextFilter}
                  />
                </div>
                <div className="flex justify-between">
                  <RangePicker
                    className="flex-grow !rounded-r-none !border-r-0"
                    popupClassName={NO_TIME_PICKER_CLASSNAME}
                    showTime
                    value={dateFilter}
                    needConfirm={false}
                    placement="bottomLeft"
                    format={(value) => {
                      return `${value.month() + 1}/${value.date()}/${value.year() - 2000}`;
                    }}
                    onCalendarChange={(value) => {
                      handleDateFilter(value);
                    }}
                  />
                  <Popover
                    trigger="click"
                    overlayInnerStyle={{
                      backgroundColor: "var(--background)",
                      position: "relative",
                      top: "-2px",
                      zIndex: 10,
                    }}
                    getPopupContainer={(triggerNode) => {
                      return triggerNode.parentElement!;
                    }}
                    placement="bottomRight"
                    arrow={false}
                    content={
                      <div className="flex flex-col gap-2">
                        <Radio.Group
                          value={category}
                          onChange={handleChangeCategory}
                        >
                          <div className="flex flex-col">
                            <h6 className="opacity-70">Categories</h6>
                            <Radio value={"all"}>All</Radio>
                            <Radio value={"unread"}>Unread</Radio>
                            <Radio value={"starred"}>Starred</Radio>
                          </div>
                        </Radio.Group>
                        <div>
                          <h6 className="opacity-70">Phone Number</h6>
                          <PhoneInput
                            value={search.caller_pn}
                            onChange={handleChangePhoneNumber}
                            onlyCountries={["us"]}
                          />
                        </div>
                      </div>
                    }
                  >
                    <AntButton className="w-[56px] !rounded-l-none opacity-80 hover:bg-card">
                      More
                    </AntButton>
                  </Popover>
                </div>
                {convos.length === 0 ? (
                  <div>
                    <h4 className="mt-4 text-center opacity-60">
                      No conversations
                    </h4>
                  </div>
                ) : (
                  <DefaultTabBar {...props} />
                )}
              </div>
            )}
            items={convos.map((convo, index) => {
              const { distanceToNow } = formatTimeOfDay(convo.createdAt);
              const formattedNumber: string | undefined =
                typeof convo.caller_pn === "string"
                  ? parsePhoneNumber(convo.caller_pn)?.formatNational()
                  : undefined;
              return {
                key: String(index),
                label: (
                  <div className="flex min-h-[50px] flex-col">
                    <div className="relative mb-1 flex items-start justify-between">
                      {!convo.viewed ? (
                        <div className="absolute left-[-12px] top-[8px] h-[8px] w-[8px] rounded-full bg-primary"></div>
                      ) : null}
                      <div>
                        {convo.medium === "PHONE" ? (
                          formattedNumber ? (
                            <h6>{formattedNumber}</h6>
                          ) : (
                            <p className="opacity-65">(unknown)</p>
                          )
                        ) : (
                          <p className="opacity-65">(test)</p>
                        )}
                      </div>
                      <div className="flex items-center gap-[4px]">
                        <p className="text-xs opacity-80">
                          {distanceToNow} ago
                        </p>
                        {convo.starred && (
                          <Icons.star_filled
                            className="fill-primary"
                            size={12}
                          />
                        )}
                      </div>
                    </div>
                    <p className="line-clamp-3 whitespace-normal text-left text-sm">
                      {convo.summary ?? "(no summary)"}
                    </p>
                  </div>
                ),
                children: (
                  <Convo convo_uuid={convo.uuid} convoSearch={search} />
                ),
              };
            })}
          />
        ) : (
          <div>
            <div>
              <div className="mb-1">
                <Search
                  value={textInput}
                  onChange={(e) => {
                    setTextInput(e.target.value);
                  }}
                  className="[&_.ant-input-search-button]:!w-[56px]"
                  loading={isConvoFetching}
                  onSearch={handleTextFilter}
                />
              </div>
              <div className="flex justify-between">
                <RangePicker
                  className="flex-grow !rounded-r-none !border-r-0"
                  popupClassName={NO_TIME_PICKER_CLASSNAME}
                  showTime
                  value={dateFilter}
                  needConfirm={false}
                  placement="bottomLeft"
                  format={(value) => {
                    return `${value.month() + 1}/${value.date()}/${value.year() - 2000}`;
                  }}
                  onCalendarChange={(value) => {
                    handleDateFilter(value);
                  }}
                />
                <Popover
                  trigger="click"
                  overlayInnerStyle={{
                    backgroundColor: "var(--background)",
                    position: "relative",
                    top: "-2px",
                    zIndex: 10,
                  }}
                  getPopupContainer={(triggerNode) => {
                    return triggerNode.parentElement!;
                  }}
                  placement="bottomRight"
                  arrow={false}
                  content={
                    <div className="flex flex-col gap-2">
                      <Radio.Group
                        value={category}
                        onChange={handleChangeCategory}
                      >
                        <div className="flex flex-col">
                          <h6 className="opacity-70">Categories</h6>
                          <Radio value={"all"}>All</Radio>
                          <Radio value={"unread"}>Unread</Radio>
                          <Radio value={"starred"}>Starred</Radio>
                        </div>
                      </Radio.Group>
                      <div>
                        <h6 className="opacity-70">Phone Number</h6>
                        <PhoneInput
                          value={search.caller_pn}
                          onChange={handleChangePhoneNumber}
                        />
                      </div>
                    </div>
                  }
                >
                  <AntButton className="w-[56px] !rounded-l-none opacity-80 hover:bg-card">
                    More
                  </AntButton>
                </Popover>
              </div>
            </div>
            <div>
              {convos.length === 0 ? (
                <h4 className="mt-4 text-center opacity-60">
                  No conversations
                </h4>
              ) : (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <ul className="pt-4">
                    {convos.map((convo, index) => {
                      const { distanceToNow } = formatTimeOfDay(
                        convo.createdAt,
                      );
                      const formattedNumber: string | undefined =
                        typeof convo.caller_pn === "string"
                          ? parsePhoneNumber(convo.caller_pn)?.formatNational()
                          : undefined;
                      return (
                        <li
                          key={convo.uuid}
                          className="mb-2 flex min-h-[50px] flex-col rounded-sm border-[1px] border-border px-4 py-2 hover:cursor-pointer hover:text-card-foreground_hover hover:opacity-70"
                          onClick={() => {
                            setActiveConvo(String(index));
                            setDialogOpen(true);
                          }}
                        >
                          <div className="relative mb-1 flex items-start justify-between">
                            {!convo.viewed ? (
                              <div className="absolute left-[-12px] top-[8px] h-[8px] w-[8px] rounded-full bg-primary"></div>
                            ) : null}
                            <div>
                              {convo.medium === "PHONE" ? (
                                formattedNumber ? (
                                  <h6>{formattedNumber}</h6>
                                ) : (
                                  <p className="opacity-65">(unknown)</p>
                                )
                              ) : (
                                <p className="opacity-65">(test)</p>
                              )}
                            </div>
                            <div className="flex items-center gap-[4px]">
                              <p className="text-xs opacity-80">
                                {distanceToNow} ago
                              </p>
                              {convo.starred && (
                                <Icons.star_filled
                                  className="fill-primary"
                                  size={12}
                                />
                              )}
                            </div>
                          </div>
                          <p className="line-clamp-3 whitespace-normal text-left text-sm">
                            {convo.summary ?? "(no summary)"}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                  <DialogContent className="min-h-[min(500px,_80vh)] w-[90vw] max-w-none pb-4 pt-12 sm:w-[80vw]">
                    <div>
                      {convos[Number(activeConvo)]?.uuid && (
                        <Convo
                          convo_uuid={convos[Number(activeConvo)]!.uuid}
                          convoSearch={search}
                        />
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        )}
      </ConfigProvider>
    </div>
  );
}

function useViewConvo(convoSearch: ConvoSearch) {
  const apiUtils = api.useUtils();
  const viewMutation = api.conversations.viewConvo.useMutation();
  const viewConvo = (convo_uuid: string) => {
    viewMutation.mutateAsync({ convo_uuid }).catch((e) => {
      console.error("Failed to view conversation" + e);
    });
    apiUtils.conversations.getConvos.setData(convoSearch, (prev) => {
      if (!prev) return prev;
      const convoIndex = prev.findIndex((c) => c.uuid === convo_uuid);
      if (convoIndex === -1) return prev;
      const newData = [...prev];
      newData[convoIndex] = {
        ...newData[convoIndex],
        viewed: true,
      } as ConvosResponse[number];
      return newData;
    });
  };
  return { viewConvo };
}

function useStarConvo(convo_uuid: string, convoSearch: ConvoSearch) {
  const apiUtils = api.useUtils();
  const starMutation = api.conversations.setStarConvo.useMutation();
  const setStarConvo = (starred: boolean) => {
    void starMutation.mutateAsync({ convo_uuid, starred }).catch((e) => {
      console.error("Failed to star conversation" + e);
    });

    apiUtils.conversations.getConvoExpanded.setData({ convo_uuid }, (prev) => {
      if (!prev) return prev;
      const newData = { ...prev };
      newData.starred = starred;
      return newData;
    });
    apiUtils.conversations.getConvos.setData(convoSearch, (prev) => {
      if (!prev) return prev;
      const convoIndex = prev.findIndex((c) => c.uuid === convo_uuid);
      if (convoIndex === -1) return prev;
      const newData = [...prev];
      newData[convoIndex] = {
        ...newData[convoIndex],
        starred: starred,
      } as ConvosResponse[number];
      return newData;
    });
  };
  return { setStarConvo };
}

const Convo = (props: { convo_uuid: string; convoSearch: ConvoSearch }) => {
  const { data: convo } = api.conversations.getConvoExpanded.useQuery(
    { convo_uuid: props.convo_uuid },
    {
      placeholderData: (prev) => prev,
    },
  );
  const { setStarConvo } = useStarConvo(props.convo_uuid, props.convoSearch);
  const { viewConvo } = useViewConvo(props.convoSearch);
  useEffect(() => {
    if (convo && convo.viewed === false) {
      viewConvo(convo.uuid);
    }
  }, [convo]);

  if (!convo) {
    return null;
  }
  const formattedNumber: string | undefined =
    typeof convo.caller_pn === "string"
      ? parsePhoneNumber(convo.caller_pn)?.formatInternational()
      : undefined;
  const formattedDates = formatTimeOfDay(convo.createdAt);

  return (
    <div className="flex max-h-[min(500px,_80vh)] min-h-[min(500px,_80vh)] flex-col overflow-y-auto pr-1">
      <div className="mb-2 flex gap-2 text-sm">
        <div className="flex flex-grow flex-wrap justify-between gap-x-6 gap-y-2">
          <div>
            {convo.medium === "PHONE"
              ? formattedNumber
                ? `${formattedNumber}`
                : "(unknown caller)"
              : "(test call)"}
          </div>

          <div>{`${formattedDates.dateTime}, ${formattedDates.dayTime}`}</div>
        </div>
        <div
          className="hover:cursor-pointer"
          onClick={() => setStarConvo(!convo.starred)}
        >
          {convo.starred ? (
            <Icons.star_filled className="fill-primary" size={16} />
          ) : (
            <Icons.star_outline className="fill-foreground" size={16} />
          )}
        </div>
      </div>
      <div>
        <span className="text-xs opacity-60">Summary</span>
        <h4 className="text-balance text-lg">{convo.summary}</h4>
      </div>
      <Separator className="mb-4 mt-2" />
      <ul className="flex-grow space-y-4">
        {convo.message.map((msg) => {
          if (msg.role !== "USER" && msg.role !== "ASSISTANT") {
            return null;
          }
          return (
            <li
              key={msg.id}
              className={`${msg.role === "ASSISTANT"} border-xl flex flex-col rounded-lg border py-2 text-foreground`}
              style={{
                borderColor:
                  msg.role === "ASSISTANT" ? "var(--primary)" : "var(--border)",
              }}
            >
              <div className="flex">
                <div className="pl-2 pr-4">
                  {msg.role === "USER" ? (
                    <Icons.caller />
                  ) : (
                    <Icons.assistant color="var(--primary)" />
                  )}
                </div>
                <p className="text-sm">{msg.content}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
