import React from "react";
import { Button, type ButtonProps } from "./button";
import { Icons } from "../Icons";

export default function LoadingButton(
  props: { loading: boolean } & ButtonProps,
) {
  if (props.loading) {
    return (
      <Button {...props} disabled={true}>
        <Icons.spinner className="animate-spin" />
      </Button>
    );
  } else {
    return <Button {...props} />;
  }
}
