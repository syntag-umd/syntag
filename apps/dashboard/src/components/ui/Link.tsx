import React from "react";
import NextLink from "next/link";
export default function Link(props: {
  children: React.ReactNode;
  href: string;
  [key: string]: any;
}) {
  return (
    <NextLink {...props} href={props.href} className="text-blue-500 underline">
      {props.children}
    </NextLink>
  );
}
