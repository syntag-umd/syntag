export {};

declare global {
  interface CustomJwtSessionClaims {
    external_id?: string;
  }
}
