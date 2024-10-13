import React, { useRef } from "react";
import { type Control } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import {
  Accents,
  VoiceEnum,
  VoiceOption,
  voicesRecord,
} from "~/features/agents/types";
import Image from "next/image";
import { Avatar } from "~/components/ui/avatar";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { HiMiniSpeakerWave } from "react-icons/hi2";
import { useTheme } from "next-themes";

export default function SelectVoice(props: {
  control: Control<any, any>;
  name: string;
}) {
  const { resolvedTheme } = useTheme();
  const audioRef = useRef<HTMLAudioElement>(null);
  const handlePlayAudio = async (url: string) => {
    if (audioRef.current) {
      audioRef.current.src = url;
      await audioRef.current.play();
    }
  };
  const [dialogOpen, setDialogOpen] = React.useState(false);
  return (
    <FormField
      control={props.control}
      name={props.name}
      render={({ field }) => {
        const current_voice = field.value as VoiceEnum;
        return (
          <FormItem className="flex flex-col">
            <FormLabel>Voice</FormLabel>
            <audio
              ref={audioRef}
              src="/audio/11labs.ErXwobaYiN019PkySvjV.mp3"
            />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <div
                  className="flex items-center rounded-lg border px-4 py-2 hover:cursor-pointer"
                  style={{
                    transition: "border-color 0.3s ease",
                    borderColor:
                      resolvedTheme === "dark" ? "#424242" : "#D2D2D2",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "var(--primary)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor =
                      resolvedTheme === "dark" ? "#424242" : "#D2D2D2")
                  }
                >
                  {" "}
                  <div
                    key={current_voice}
                    className="flex w-full max-w-[75vw] items-center justify-start gap-4"
                  >
                    <div className="flex flex-col gap-x-4 sm:flex-row">
                      <Avatar className="h-[50px] w-[50px] rounded-lg">
                        <Image
                          src={voicesRecord[current_voice].picSrc}
                          alt={voicesRecord[current_voice].name}
                          quality={100}
                          width={50}
                          height={50}
                        />
                      </Avatar>
                    </div>

                    <div className="flex h-[50px] flex-grow text-base opacity-60 sm:text-lg">
                      <div className="flex h-full items-center justify-start border-l-[1px] border-input pl-4">
                        {`${
                          voicesRecord[current_voice].gender === "male"
                            ? "Man"
                            : "Woman"
                        } with ${Accents[voicesRecord[current_voice].accent]} accent`}
                      </div>
                    </div>
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent
                style={{ maxWidth: "max(32rem, min(1100px, 90vw))" }}
              >
                <DialogHeader>
                  <DialogTitle className="text-center">
                    Select voice
                  </DialogTitle>
                </DialogHeader>
                <DialogDescription>
                  <ScrollArea className="h-[400px] pr-4" type="always">
                    <div className="grid auto-rows-auto grid-cols-1 gap-x-4 gap-y-6 lg:grid-cols-2">
                      {Object.keys(voicesRecord).map((value, index) => {
                        const object_key = value as VoiceEnum;
                        return (
                          <SelectVoiceCard
                            key={object_key}
                            object_key={object_key}
                            onChange={field.onChange}
                            setDialogOpen={setDialogOpen}
                            handlePlayAudio={handlePlayAudio}
                          />
                        );
                      })}
                    </div>
                  </ScrollArea>
                </DialogDescription>
              </DialogContent>
            </Dialog>

            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

function SelectVoiceCard({
  object_key,
  onChange,
  setDialogOpen,
  handlePlayAudio,
}: {
  object_key: VoiceEnum;
  onChange: (value: VoiceEnum) => void;
  setDialogOpen: (value: boolean) => void;
  handlePlayAudio: (url: string) => void;
}) {
  return (
    <div
      className={`rounded-lg border-[1px] border-background px-2 py-2 hover:cursor-pointer hover:border-solid hover:border-primary`}
      onClick={() => {
        onChange(object_key);
        setDialogOpen(false);
      }}
    >
      <div
        key={object_key}
        className="relative flex w-full items-center justify-start gap-4"
      >
        <Avatar className="h-[80px] w-[80px] rounded-lg">
          <Image
            src={voicesRecord[object_key].picSrc}
            alt={voicesRecord[object_key].name}
            quality={100}
            width={80}
            height={80}
          />
        </Avatar>
        <div className="relative flex h-[80px] flex-grow flex-col justify-start">
          <div className="flex justify-between gap-2">
            <div className="flex text-base sm:text-lg">
              <div className="flex h-full items-center justify-start">
                {`${
                  voicesRecord[object_key].gender === "male" ? "Man" : "Woman"
                } with ${Accents[voicesRecord[object_key].accent]} accent`}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size={"icon"}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayAudio(voicesRecord[object_key].demoAudio);
                }}
              >
                <HiMiniSpeakerWave size={16} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
