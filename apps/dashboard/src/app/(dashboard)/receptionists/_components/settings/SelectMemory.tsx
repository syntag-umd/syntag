import { type CheckedState } from "@radix-ui/react-checkbox";
import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormLabel } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type ClientFile } from "../../../documents/types";

export default function SelectMemory(props: {
  clientFiles: ClientFile[];
  selectedKnowledge: string[];
  setSelectedKnowledge: (files: string[]) => void;
}) {
  const handleChange = (checked: CheckedState, file: string) => {
    if (checked === true) {
      props.setSelectedKnowledge([...props.selectedKnowledge, file]);
    } else {
      props.setSelectedKnowledge(
        props.selectedKnowledge.filter((f) => f !== file),
      );
    }
  };
  const handleAll = (event: React.BaseSyntheticEvent) => {
    event.preventDefault();

    if (props.selectedKnowledge.length > 0) {
      props.setSelectedKnowledge([]);
    } else {
      props.setSelectedKnowledge(
        props.clientFiles
          .filter((v) => v.displayName.includes(search))
          .map((file) => file.knowledge_uuid),
      );
    }
  };
  const [search, setSearch] = React.useState<string>("");
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <FormLabel>Select memory</FormLabel>
        </div>
        <div>
          <Button onClick={handleAll} variant={"secondary"} size={"sm"}>
            {props.selectedKnowledge?.length > 0 ? "Clear All" : "Select All"}
          </Button>
        </div>
      </div>
      <div className="mt-2">
        <input
          className="w-full px-2 py-1 text-sm focus:outline-none"
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <ScrollArea className="mt-3 h-[120px]" type="auto">
        {props.clientFiles
          .filter((v) => v.displayName.includes(search))
          .map((file) => (
            <div key={file.knowledge_uuid} className="mb-2 flex gap-2">
              <Checkbox
                id={`filecheckbox-${file.knowledge_uuid}`}
                checked={props.selectedKnowledge?.includes(file.knowledge_uuid)}
                onCheckedChange={(checked) =>
                  handleChange(checked, file.knowledge_uuid)
                }
              />

              <Label htmlFor={`filecheckbox-${file.knowledge_uuid}`}>
                {file.displayName}
              </Label>
            </div>
          ))}
      </ScrollArea>
    </div>
  );
}
