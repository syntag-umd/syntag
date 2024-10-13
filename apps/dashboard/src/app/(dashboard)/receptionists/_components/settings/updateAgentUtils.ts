import { type UpdateAgentSchema } from "~/features/agents/types";
import { api } from "~/server/trpc/clients/react";

export function useUpdateAgent(props: { agent_id?: string }) {
  const apiUtils = api.useUtils();
  const agentMutation = api.agent.update.useMutation();

  const mutateAgent = async (values: UpdateAgentSchema) => {
    const new_agent = await agentMutation.mutateAsync(values);
    if (props.agent_id) {
      apiUtils.agent.get.setData({ agent_id: props.agent_id }, new_agent);
    }
    return new_agent;
  };
  return { mutateAgent };
}
