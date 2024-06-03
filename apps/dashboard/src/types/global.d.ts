export {};

declare global {
  interface CustomJwtSessionClaims {
    external_id?: string;
    //clerk id stored in sub
  }

  interface AgentCardProps {
    voice_assistant_uuid: string;
    name: string;
    role: string;
    assistantId: Assistant;
    profileUrl?: string;
    phoneNumber?: string;
  }
}
