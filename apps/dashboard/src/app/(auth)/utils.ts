import { jwtVerify, importSPKI } from "jose";

const PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAq4XnKAnmIkakEia8XJcW
z1ZMX0CIve3f/qWVAHW41dQ5i9ciusEfUoJqm5kvNqMR9nvazouG3POLVjklHxcl
YydBzmcs2JZrZkXk9fLyrnjJy6eXrnOrAhjKs1c7lCiTRzP4Y3IuU5Gol/MlTzH9
1gb8hjMwdGeWaiKM5liq9MpypKm+1IXDblWiY7uvIfWe113WKX6D0JTb1/V79T+m
Arq6yoYSxnSxQAVrE3VFKAJplMnq+vbmX/trXWLH6B0hkyFWKRLbHIllUEDZ58Zd
9Y3oEifG8MBlYca86l1gVRqPXUjfR3IfUz5g5ThjOXjRs5AlC9l6bfkA0kMbRv3w
+QIDAQAB
-----END PUBLIC KEY-----`;

export async function isTokenValid(token: string | null | undefined) {
  try {
    const publicKey = await importSPKI(PEM, "RS256");
    let decoded;
    if (token) {
      decoded = await jwtVerify(token, publicKey);
      return decoded.payload;
    }
  } catch (error) {
    console.warn(error);
    return false;
  }
}

import type {
  SignedOutAuthObject,
  SignedInAuthObject,
} from "@clerk/backend/internal";
import { cookies } from "next/headers";
type AuthObject = SignedInAuthObject | SignedOutAuthObject;
type Auth = AuthObject & {
  redirectToSignIn: () => void;
  protect: () => SignedInAuthObject | never;
};
export interface UserAuth {
  userId: string;
  sessionClaims: CustomJwtSessionClaims & { external_id: string };
  getToken: () => Promise<string | null>;
}

export type ActualAuth =
  | UserAuth
  | {
      userId: string;
      sessionClaims: CustomJwtSessionClaims;
      getToken: () => Promise<string | null>;
    }
  | {
      userId: null;
      sessionClaims: null;
      getToken: () => Promise<string | null>;
    };

export const getActualAuth = async (auth: Auth): Promise<ActualAuth> => {
  if (auth.userId) {
    return {
      userId: auth.userId,
      sessionClaims: auth.sessionClaims,
      getToken: () => auth.getToken(),
    };
  }
  const token = cookies().get("__session")?.value;
  const is_valid = await isTokenValid(token);
  if (!is_valid) {
    return {
      userId: null,
      sessionClaims: null,
      getToken: () => Promise.resolve(null),
    };
  }
  const newSignedIn = {
    userId: is_valid.sub!,

    sessionClaims: {
      external_id: is_valid.external_id as string | undefined,
    } as CustomJwtSessionClaims,
    getToken: () => Promise.resolve(token ?? null),
  };
  return newSignedIn;
};
