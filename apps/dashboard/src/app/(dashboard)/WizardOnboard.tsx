"use client";
import React, { useRef } from "react";
import { api } from "~/server/trpc/clients/react";
import { Input, Spin, Switch } from "antd";
export default function WizardOnboardLayout({ db_user }: { db_user?: user }) {
  const [showUserButton, setShowUserButton] = React.useState(true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/70">
      <div className="relative my-0 flex h-full max-h-none w-[500px] max-w-full flex-col items-center rounded-none bg-card p-12 pb-6 text-foreground sm:my-8 sm:max-h-[600px] sm:rounded">
        <div
          className={`absolute right-4 top-4 ${showUserButton ? "block" : "hidden"}`}
        >
          <UserButton />
        </div>
        <WizardOnboardSteps
          db_user={db_user}
          setShowUserButton={setShowUserButton}
        />
      </div>
    </div>
  );
}

import { parsePhoneNumber } from "libphonenumber-js";
import { message } from "antd";
function WizardOnboardSteps({
  db_user,
  setShowUserButton,
}: {
  db_user?: user;
  setShowUserButton: (show: boolean) => void;
}) {
  const apiUtils = api.useUtils();
  const user_query = api.user.get.useQuery(void 0, { initialData: db_user });
  const user_phone_numbers = api.phoneNumber.getAll.useQuery();
  const voice_agent_query = api.agent.getAll.useQuery();
  const router = useRouter();
  const change_onboarding_stage_mutation =
    api.user.changeOnboardingStage.useMutation();
  const [loading, setLoading] = React.useState(false);
  const link_to_assistant = api.phoneNumber.linkToAssistant.useMutation();
  if (user_query.isError || voice_agent_query.isError) {
    throw new Error("Error loading in onboarding");
  }

  if (!user_query.data || voice_agent_query.isLoading) {
    console.log(!user_query.data, voice_agent_query.isLoading);
    return <Spin />;
  }
  if (
    !voice_agent_query.data ||
    voice_agent_query.data.length === 0 ||
    !voice_agent_query.data[0] ||
    user_query.data.onboarding_stage === 0
  ) {
    return <FirstPart />;
  }

  const agent = voice_agent_query.data[0];
  if (user_query.data.onboarding_stage === 1) {
    return <SecondPart assistant_uuid={agent.voice_assistant.uuid} />;
  }
  if (user_query.data.onboarding_stage === 2) {
    return <ThirdPart assistant_uuid={agent.voice_assistant.uuid} />;
  }

  if (
    !agent.phone_number &&
    user_phone_numbers.data &&
    user_phone_numbers.data.length > 0
  ) {
    link_to_assistant
      .mutateAsync({
        phone_number_uuid: user_phone_numbers.data[0]!.uuid,
        voice_assistant_uuid: agent.voice_assistant.uuid,
      })
      .catch((e) => {
        console.error("Error linking phone number to assistant: ", e);
      });
    void change_onboarding_stage_mutation
      .mutateAsync(
        {
          onboarding_stage: 4,
        },
        {
          onSuccess: (new_user) => {
            apiUtils.user.get.setData(void 0, new_user);
          },
        },
      )
      .finally(() => {
        router.refresh();
      });
  } else if (user_query.data.onboarding_stage === 3) {
    return (
      <PhoneNumberPart
        assistant_id={agent.voice_assistant.uuid}
        assistant_name={agent.voice_assistant.name ?? undefined}
      />
    );
  }

  const finishOnboarding = async () => {
    setLoading(true);
    await change_onboarding_stage_mutation.mutateAsync({
      onboarding_stage: null,
    });
    router.push("/receptionists/" + agent.voice_assistant.uuid);
    router.refresh();
    setLoading(false);
  };

  setShowUserButton(false);
  const formattedPhone = agent.phone_number?.pn
    ? parsePhoneNumber(agent.phone_number.pn).formatNational()
    : undefined;

  return (
    <div className="flex h-full w-full flex-col items-center self-start">
      <div className="mt-4 flex items-center justify-center">
        <Icons.checkCircle className="h-20 w-20 stroke-primary" />
      </div>
      <h2 className="mb-2 mt-6 font-semibold">
        {agent.voice_assistant.name ?? "Your receptionist"} is ready!
      </h2>
      {agent.phone_number?.pn && (
        <>
          <h6>Give them a call at</h6>
          <h2>
            <a
              href={`tel:${agent.phone_number?.pn}`}
              className="border-b-2 border-b-primary"
            >
              {formattedPhone}
            </a>
          </h2>
        </>
      )}
      <div className="flex w-full flex-grow items-end justify-center">
        {loading ? (
          <Spin />
        ) : (
          <Button className="w-full" onClick={finishOnboarding}>
            Finish
          </Button>
        )}
      </div>
    </div>
  );
}

function PhoneNumberPart({
  assistant_id,
  assistant_name,
}: {
  assistant_id: string;
  assistant_name?: string;
}) {
  const [loading, setLoading] = React.useState(false);
  const apiUtils = api.useUtils();
  const [contains, setContains] = React.useState("");
  const [areaCode, setAreaCode] = React.useState<number | undefined>(undefined);
  const twilioNumberQuery = api.phoneNumber.listTwilioNumbers.useQuery({
    contains: contains,
    areaCode: areaCode,
  });

  const userChangeOnboardingStage =
    api.user.changeOnboardingStage.useMutation();
  const router = useRouter();

  const create_phone_mutation = api.phoneNumber.create.useMutation();
  const link_to_assistant = api.phoneNumber.linkToAssistant.useMutation();
  const createPhoneNumber = async (ac?: number, pn?: string) => {
    try {
      setLoading(true);
      const new_phone = await create_phone_mutation.mutateAsync({
        areaCode: ac,
        contains: pn,
      });
      if (env.NEXT_PUBLIC_FLAG_LIVE_PHONES !== "FALSE") {
        await link_to_assistant.mutateAsync({
          phone_number_uuid: new_phone.uuid,
          voice_assistant_uuid: assistant_id,
        });
      }

      await userChangeOnboardingStage.mutateAsync(
        {
          onboarding_stage: 4,
        },
        {
          onSuccess: (new_user) => {
            apiUtils.user.get.setData(void 0, new_user);
          },
          onSettled: () => {
            try {
              void apiUtils.user.get.invalidate();
              void apiUtils.agent.getAll.invalidate();
            } finally {
              router.refresh();
            }
          },
        },
      );
    } catch (e) {
      console.error("Error purchasing phone number: ", e);
      void message.error(" Try again or choose a different number.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex h-full w-full flex-col self-start">
      <h3 className="font-semibold">
        Select a phone number for {assistant_name ?? "your receptionist"}
      </h3>
      <p className="text mb-2 mt-2 opacity-75">
        Filter numbers by area code, or by letters and digits it should contain
      </p>
      <div className="flex w-full items-center gap-2 pb-4">
        <div className="basis-24">
          <label htmlFor="areaCodeInput" className="mr-2 opacity-75">
            Area Code
          </label>
          <Input
            id="areaCodeInput"
            value={areaCode}
            placeholder="771"
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (isNaN(value)) {
                setAreaCode(undefined);
              } else if (value < 100 || value > 999) {
                setAreaCode(undefined);
              } else {
                setAreaCode(value);
              }
            }}
          />
        </div>
        <div className="flex-grow">
          <label htmlFor="containsInput" className="mr-2 opacity-75">
            Contains
          </label>
          <Input
            id="containsInput"
            placeholder="a*1"
            value={contains}
            onChange={(e) => setContains(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-grow basis-0 flex-col items-center space-y-2 overflow-auto px-1 pt-2">
        {loading ||
        (twilioNumberQuery.isLoading && !twilioNumberQuery.isError) ? (
          <Spin className="pt-4" />
        ) : twilioNumberQuery.data && twilioNumberQuery.data.length > 0 ? (
          twilioNumberQuery.data.map((phoneNumber) => {
            const parsedPhoneNumber = parsePhoneNumber(phoneNumber.phoneNumber);
            const areaCode = Number(
              parsedPhoneNumber.nationalNumber.slice(0, 3),
            );
            console.log(parsedPhoneNumber);
            return (
              <div key={phoneNumber.phoneNumber} className="w-full">
                <Button
                  disabled={loading}
                  variant={"ghost"}
                  className="flex w-full items-center justify-center gap-4 rounded bg-background px-2 py-4 hover:text-primary-hover"
                  onClick={() =>
                    createPhoneNumber(
                      areaCode,
                      parsedPhoneNumber.nationalNumber,
                    )
                  }
                >
                  {parsedPhoneNumber.formatNational() ??
                    phoneNumber.friendlyName}
                </Button>
              </div>
            );
          })
        ) : (
          "No numbers found"
        )}
      </div>
      <div className="flex items-end pt-2">
        <Button
          disabled={loading}
          className="w-full bg-background hover:text-primary"
          variant={"ghost"}
          onClick={() => createPhoneNumber()}
        >
          Any Phone Number
        </Button>
      </div>
    </div>
  );
}

//Third part is that they will be doing file upload.
//this is because when they submit the website they reach a checkpoint
function ThirdPart({ assistant_uuid }: { assistant_uuid: string }) {
  const apiUtils = api.useUtils();
  const addKnowledgeToAssistant =
    api.knowledge.addKnowledgeToAssistant.useMutation();
  const userChangeOnboardingStage =
    api.user.changeOnboardingStage.useMutation();

  const moveNextStage = async () => {
    const new_user = await userChangeOnboardingStage.mutateAsync({
      onboarding_stage: 3,
    });
    apiUtils.user.get.setData(void 0, new_user);
    void apiUtils.user.get.invalidate();
  };

  return (
    <div className="flex h-full w-full flex-col self-start">
      <h2 className="font-semibold">Add files</h2>
      <h6 className="mb-4">Text can be extracted from files or images.</h6>
      <FileUpload
        onUploadSuccess={async (arg) => {
          await addKnowledgeToAssistant.mutateAsync({
            assistant_uuid: assistant_uuid,
            knowledge_uuids: arg.map((kn) => kn.knowledge_uuid),
          });
          await moveNextStage();
        }}
        skipButton={
          <Button variant={"outline"} onClick={() => moveNextStage()}>
            Skip
          </Button>
        }
      />
    </div>
  );
}

//for the website, have a Similar URLs found will added column on the right.
//you can have a butotn like hte tranfercall to add more numbers
function SecondPart({ assistant_uuid }: { assistant_uuid: string }) {
  const form = useForm<IngestWebsitesInput>({
    resolver: zodResolver(ingestWebsitesSchema),
    mode: "onSubmit",
    defaultValues: {
      websites: [{ url: "", crawl: true }],
      assistant_uuid: assistant_uuid,
    },
  });
  const {
    fields: websiteFields,
    append,
    remove,
  } = useFieldArray({
    control: form.control,
    name: "websites",
  });
  const apiUtils = api.useUtils();
  const ingest_websites_mutation = api.knowledge.ingestWebsites.useMutation();
  const change_onboarding_stage_mutation =
    api.user.changeOnboardingStage.useMutation();

  const onSubmit = async (values: IngestWebsitesInput) => {
    if (values.websites.length > 0) {
      await ingest_websites_mutation.mutateAsync(values);
    }
    const updated_user = await change_onboarding_stage_mutation.mutateAsync({
      onboarding_stage: 2,
    });
    apiUtils.user.get.setData(void 0, updated_user);
  };
  return (
    <div className="flex h-full w-full flex-col self-start pb-2">
      <h2 className="font-semibold">Add websites</h2>
      <h6 className="mb-4">
        Information on the websites can be used to answer questions
      </h6>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex h-[80%] flex-col justify-between"
      >
        <ScrollArea className="-mx-3 overflow-auto px-3">
          <div className="mb-1 flex items-end justify-between pl-10 text-sm">
            <div className="w-36">Website URL</div>
            <div className="w-24 text-center">Add similar URLs</div>
          </div>
          <div className="space-y-4">
            {websiteFields.map((field, index) => {
              return (
                <div key={field.id}>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={"outline"}
                      size={"icon"}
                      onClick={() => remove(index)}
                      className="w-10"
                    >
                      <Icons.trash className="h-5 w-5" />
                    </Button>
                    <Controller
                      render={({ field }) => {
                        return (
                          <Input
                            {...field}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                            }}
                            placeholder="https://www.example.com"
                          />
                        );
                      }}
                      name={`websites.${index}.url`}
                      control={form.control}
                    />
                    <div className="flex w-32 justify-end pr-6">
                      <Controller
                        render={({ field }) => (
                          <Switch
                            value={field.value}
                            onChange={(checked) => {
                              field.onChange(checked);
                            }}
                          />
                        )}
                        name={`websites.${index}.crawl`}
                        control={form.control}
                      />
                    </div>
                  </div>
                  {form.formState.errors.websites?.[index]?.url && (
                    <div className="pl-10 text-destructive">
                      {form.formState.errors.websites[index].url.message}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Button
            size={"sm"}
            className="my-4 w-full rounded border-primary-hover bg-card"
            variant={"outline"}
            onClick={() => append({ url: "", crawl: true })}
          >
            Add More
          </Button>
        </ScrollArea>
        <Button className="mt-2" type="submit">
          Submit
        </Button>
      </form>
      <Button
        className="mt-2"
        type="button"
        onClick={() => onSubmit({ websites: [] })}
        variant={"outline"}
      >
        Skip
      </Button>
    </div>
  );
}

function FirstPart() {
  const apiUtils = api.useUtils();
  const [step, setStep] = React.useState(0);
  const [voiceEnum, setVoiceEnum] = React.useState<VoiceEnum | null>(null);
  const [emotionTags, setEmotionTags] = React.useState<EmotionTags | null>(
    null,
  );
  const selectVoice = (voiceEnum: VoiceEnum) => {
    setVoiceEnum(voiceEnum);
    setStep(2);
  };
  const onEnterEmotionTags = (emotionTags: EmotionTags) => {
    setEmotionTags(emotionTags);
    setStep(3);
  };
  const onEnterName = (name: string) => {
    if (name.length <= 0) {
      return;
    }

    setStep(4);
    void createAgent(voiceEnum!, emotionTags!, name);
  };

  const create_agent_mutation = api.agent.create.useMutation();
  const change_onboarding_stage_mutation =
    api.user.changeOnboardingStage.useMutation();
  const createAgent = async (
    voiceEnum: VoiceEnum,
    emotionTags: EmotionTags,
    name: string,
  ) => {
    const new_agent = await create_agent_mutation.mutateAsync({
      voice: voiceEnum,
      name: name,
      emotionTags: emotionTags,
      selectedKnowledge: [],
      instructions: " ",
      firstMessage: `Hi! This is ${name}. How can I help you today?`,
    });

    const updated_user = await change_onboarding_stage_mutation.mutateAsync({
      onboarding_stage: 1,
    });
    apiUtils.user.get.setData(void 0, updated_user);
    apiUtils.agent.getAll.setData(void 0, [new_agent]);

    void apiUtils.user.get.invalidate();
    void apiUtils.agent.getAll.invalidate();
  };

  if (step == 0) {
    return <WelcomeStep incrementStep={() => setStep(1)} />;
  }
  if (step == 1) {
    return <SelectVoiceStep selectVoice={selectVoice} />;
  }
  if (step == 2) {
    return <EmotionTagStep onEnterEmotionTags={onEnterEmotionTags} />;
  }
  if (step == 3) {
    return <EnterNameStep onNextStep={onEnterName} />;
  }
  return <Spin />;
}

// Remove from onboarding step and replace with industry.
function EmotionTagStep({
  onEnterEmotionTags,
}: {
  onEnterEmotionTags: (emotionTags: EmotionTags) => void;
}) {
  const [emotionTags, setEmotionTags] = React.useState<EmotionTags>({
    formalityLevel: FormalityLevel.None,
    toneOfVoice: ToneOfVoice.None,
    humorLevel: HumorLevel.None,
  });
  const handleTagChange = (
    field: keyof EmotionTags,
    value: EmotionTags[keyof EmotionTags],
  ) => {
    setEmotionTags((prev) => {
      return { ...prev, [field]: value };
    });
  };
  return (
    <div className="flex h-full w-full flex-col">
      <h2 className="font-semibold">Add personality traits</h2>
      <h6 className="mb-4">
        These influence the responses your receptionist give
      </h6>
      <div className="mt-2 flex flex-col gap-4">
        <CustomRadioGroup
          onChange={(value) => handleTagChange("formalityLevel", value)}
          defaultValue={emotionTags.formalityLevel}
          enum_={FormalityLevel}
          label="Formality Level"
        />
        <CustomRadioGroup
          onChange={(value) => handleTagChange("toneOfVoice", value)}
          defaultValue={emotionTags.toneOfVoice}
          enum_={ToneOfVoice}
          label="Tone of Voice"
        />
        <CustomRadioGroup
          onChange={(value) => handleTagChange("humorLevel", value)}
          defaultValue={emotionTags.humorLevel}
          enum_={HumorLevel}
          label="Humor Level"
        />
      </div>
      <div className="flex flex-grow items-end">
        <Button
          className="w-full"
          onClick={() => onEnterEmotionTags(emotionTags)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
import { Button as AntButton } from "antd";

const CustomRadioGroup = ({
  onChange,
  defaultValue,
  enum_,
  label,
}: {
  onChange: (e: EmotionTags[keyof EmotionTags]) => void;
  defaultValue: string | number;
  enum_: EmotionValue;
  label: string;
}) => {
  return (
    <div className="my-1">
      <div className="mb-2 text-left text-foreground">{label}</div>
      <div className="grid grid-cols-4 gap-4">
        {Object.values(enum_).map((val: keyof typeof enum_, index) => (
          <div key={index}>
            {defaultValue === val ? (
              <AntButton
                key={index + label}
                type="primary"
                className="w-full font-bold text-white"
              >
                {val}
              </AntButton>
            ) : (
              <AntButton
                key={index + label}
                style={{ width: "100%" }}
                onClick={(_) => onChange(enum_[val])}
              >
                {val}
              </AntButton>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

import { Button } from "~/components/ui/button";

function WelcomeStep({ incrementStep }: { incrementStep: () => void }) {
  return (
    <div className="flex h-full w-full flex-col self-start">
      <div>
        <h2 className="mb-2 font-semibold">Welcome!</h2>
        <h4 className="mb-1">Let&apos;s create your first receptionist.</h4>
        <h4 className="mb-1"> One minute now will save you hours</h4>
      </div>
      <div className="flex flex-grow-[5] flex-col justify-center space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-[1px] border-foreground font-semibold text-foreground">
            1
          </div>
          <h5>Choose their persona</h5>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-[1px] border-foreground font-semibold text-foreground">
            2
          </div>
          <h5>Add knowledge they should know</h5>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-[1px] border-foreground font-semibold text-foreground">
            3
          </div>
          <h5>Select a phone number</h5>
        </div>
      </div>
      <div className="flex flex-grow-[3] items-end">
        <Button variant={"default"} className="w-full" onClick={incrementStep}>
          Next
        </Button>
      </div>
    </div>
  );
}
import {
  type EmotionTags,
  type EmotionValue,
  FormalityLevel,
  HumorLevel,
  ToneOfVoice,
  type VoiceEnum,
  voicesRecord,
} from "~/features/agents/types";

function SelectVoiceStep({
  selectVoice,
}: {
  selectVoice: (voiceEnum: VoiceEnum) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const handlePlayAudio = async (url: string) => {
    if (audioRef.current) {
      audioRef.current.src = url;
      await audioRef.current.play();
    }
  };

  return (
    <div className="flex h-full w-full flex-col">
      <audio ref={audioRef} />
      <h2 className="font-semibold">Select a voice</h2>
      <h6 className="mb-3 opacity-80">
        This determines how your receptionist sounds
      </h6>
      <ScrollArea className="pr-4">
        <div className="space-y-6">
          <div>
            <h4>General American</h4>
            <div className="mb-2 mt-1">
              {Object.keys(voicesRecord)
                .filter(
                  (value) =>
                    value.includes("american") && !value.includes("african"),
                )
                .map((value, index) => {
                  const object_key = value as VoiceEnum;
                  return (
                    <SelectVoiceCard
                      key={object_key}
                      voiceEnum={object_key}
                      onSelect={selectVoice}
                      handlePlayAudio={handlePlayAudio}
                    />
                  );
                })}
            </div>
          </div>
          <div>
            <h4>African American</h4>
            <div className="mb-2 mt-1">
              {Object.keys(voicesRecord)
                .filter((value) => value.includes("africanamerican"))
                .map((value) => {
                  const object_key = value as VoiceEnum;
                  return (
                    <SelectVoiceCard
                      key={object_key}
                      voiceEnum={object_key}
                      onSelect={selectVoice}
                      handlePlayAudio={handlePlayAudio}
                    />
                  );
                })}
            </div>
          </div>
          <div>
            <h4>Indian</h4>
            <div className="mb-2 mt-1">
              {Object.keys(voicesRecord)
                .filter((value) => value.includes("indian"))
                .map((value, index) => {
                  const object_key = value as VoiceEnum;
                  return (
                    <SelectVoiceCard
                      key={object_key}
                      voiceEnum={object_key}
                      onSelect={selectVoice}
                      handlePlayAudio={handlePlayAudio}
                    />
                  );
                })}
            </div>
          </div>
          <div>
            <h4>Spanish</h4>
            <div className="mb-2 mt-1">
              {Object.keys(voicesRecord)
                .filter((value) => value.includes("spanish"))
                .map((value) => {
                  const object_key = value as VoiceEnum;
                  return (
                    <SelectVoiceCard
                      key={object_key}
                      voiceEnum={object_key}
                      onSelect={selectVoice}
                      handlePlayAudio={handlePlayAudio}
                    />
                  );
                })}
            </div>
          </div>
          <div>
            <h4>East Asian</h4>
            <div className="mb-2 mt-1">
              {Object.keys(voicesRecord)
                .filter((value) => value.includes("asian"))
                .map((value) => {
                  const object_key = value as VoiceEnum;
                  return (
                    <SelectVoiceCard
                      key={object_key}
                      voiceEnum={object_key}
                      onSelect={selectVoice}
                      handlePlayAudio={handlePlayAudio}
                    />
                  );
                })}
            </div>
          </div>
          <div>
            <h4>British</h4>
            <div className="mb-2 mt-1">
              {Object.keys(voicesRecord)
                .filter((value) => value.includes("british"))
                .map((value) => {
                  const object_key = value as VoiceEnum;
                  return (
                    <SelectVoiceCard
                      key={object_key}
                      voiceEnum={object_key}
                      onSelect={selectVoice}
                      handlePlayAudio={handlePlayAudio}
                    />
                  );
                })}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
import { Avatar } from "~/components/ui/avatar";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";
import { HiMiniSpeakerWave } from "react-icons/hi2";
import { ScrollArea } from "~/components/ui/scroll-area";
import { type user } from "@prisma/client";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import {
  type IngestWebsitesInput,
  ingestWebsitesSchema,
} from "~/features/knowledge/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icons } from "~/components/Icons";
import FileUpload from "./documents/FileUpload";
import { useRouter } from "next/navigation";
import { env } from "~/env";
function SelectVoiceCard({
  voiceEnum,
  handlePlayAudio,
  onSelect,
}: {
  voiceEnum: VoiceEnum;
  handlePlayAudio: (url: string) => void;
  onSelect: (voiceEnum: VoiceEnum) => void;
}) {
  const voiceRecord = voicesRecord[voiceEnum];
  return (
    <div
      className="mb-2 flex gap-2 rounded-lg border-[1px] border-primary px-2 py-2 duration-300 hover:cursor-pointer hover:bg-background"
      onClick={() => onSelect(voiceEnum)}
    >
      <div>
        <Avatar className="h-[60px] w-[60px] rounded-lg">
          <Image
            src={voiceRecord.picSrc}
            alt={voiceRecord.name}
            quality={100}
            width={60}
            height={60}
          />
        </Avatar>
      </div>
      <div className="flex flex-grow items-start justify-between">
        <div>
          <p className="mb-1 text-xs opacity-60">
            {voiceRecord.gender === "male" ? "Man" : "Woman"}
          </p>
          <h6>{voiceRecord.description}</h6>
        </div>
        <Button
          size={"icon"}
          onClick={(e) => {
            e.stopPropagation();
            handlePlayAudio(voiceRecord.demoAudio);
          }}
        >
          <HiMiniSpeakerWave size={16} />
        </Button>
      </div>
    </div>
  );
}

function EnterNameStep({ onNextStep }: { onNextStep: (name: string) => void }) {
  const [name, setName] = React.useState("");
  const handleSubmitName = () => {
    if (name.length <= 0) {
      void message.error("Name cannot be empty");
    } else {
      onNextStep(name);
    }
  };
  return (
    <div className="flex h-full w-full flex-col self-start">
      <h2 className="font-semibold">Enter their name</h2>
      <h6 className="mb-4">
        The receptionist will refer to themselves using this name
      </h6>
      <Input
        placeholder="Syntag"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Button className="mt-4" onClick={handleSubmitName}>
        Next
      </Button>
    </div>
  );
}
