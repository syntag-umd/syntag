/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { isNonJsonSerializable, type TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import SuperJSON from "superjson";
import { AppRouter } from "../root";

export function getBaseUrl(non_local = false) {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_ENV === "production")
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  if (non_local){
    throw new Error("getBaseUrl: non_local is true but no VERCEL_URL");
  }

  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export const customLink: TRPCLink<AppRouter> = () => {
  // here we just got initialized in the app - this happens once per app
  // useful for storing cache for instance
  return ({ next, op }) => {
    // this is when passing the result to the next link
    // each link needs to return an observable which propagates results
    return observable((observer) => {
      console.log("performing operation:", op);

      const unsubscribe = next(op).subscribe({
        next(value) {
          console.log("we received value", value);
          observer.next(value);
        },
        error(err) {
          console.log("we received error", err);
          observer.error(err);
        },
        complete() {
          observer.complete();
        },
      });
      return unsubscribe;
    });
  };
};

interface DataTransformer {
  serialize(object: any): any;
  deserialize(object: any): any;
}
interface InputDataTransformer extends DataTransformer {
  /**
   * This function runs **on the client** before sending the data to the server.
   */
  serialize(object: any): any;
  /**
   * This function runs **on the server** to transform the data before it is passed to the resolver
   */
  deserialize(object: any): any;
}
interface OutputDataTransformer extends DataTransformer {
  /**
   * This function runs **on the server** before sending the data to the client.
   */
  serialize(object: any): any;
  /**
   * This function runs **only on the client** to transform the data sent from the server.
   */
  deserialize(object: any): any;
}
interface CombinedDataTransformer {
  /**
   * Specify how the data sent from the client to the server should be transformed.
   */
  input: InputDataTransformer;
  /**
   * Specify how the data sent from the server to the client should be transformed.
   */
  output: OutputDataTransformer;
}

export const transformer: CombinedDataTransformer = {
  input: {
    serialize(object: any) {
      if (isNonJsonSerializable(object)) {
        return object;
      }
      return SuperJSON.serialize(object);
    },
    deserialize(object: any) {
      if (isNonJsonSerializable(object)) {
        return object;
      }
      return SuperJSON.deserialize(object);
    },
  },
  output: {
    serialize(object: any) {
      if (isNonJsonSerializable(object)) {
        return object;
      }
      return SuperJSON.serialize(object);
    },
    deserialize(object: any) {
      if (isNonJsonSerializable(object)) {
        return object;
      }
      return SuperJSON.deserialize(object);
    },
  },
};
