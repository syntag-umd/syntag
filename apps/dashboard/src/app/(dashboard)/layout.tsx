import React from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { Grid, GridItem, Stack } from "@chakra-ui/react";
export default function layout(props: { children: React.ReactNode }) {

  return (
    <Stack className="h-screen">
        <Navbar />
        <Grid templateColumns="repeat(12, 1fr)" gap={4} className="h-full">
          <GridItem className="p-5" colSpan={3}>
            <Sidebar />
          </GridItem>
          <GridItem colSpan={9}>
            <div className="overflow-x-hidden pt-navbar-height-p ">
              <div>{props.children}</div>
            </div>
          </GridItem>
        </Grid>
    </Stack>
  );
}
