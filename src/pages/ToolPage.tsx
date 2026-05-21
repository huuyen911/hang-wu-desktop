import { getToolById } from "@/tools/registry";
import { Center, Loader } from "@mantine/core";
import { Suspense } from "react";
import { Navigate, useParams } from "react-router-dom";

export default function ToolPage() {
  const { toolId } = useParams<{ toolId: string }>();
  const tool = toolId ? getToolById(toolId) : undefined;

  if (!tool) return <Navigate to="/" replace />;

  const Component = tool.component;

  return (
    <Suspense
      fallback={
        <Center h={200}>
          <Loader />
        </Center>
      }
    >
      <Component />
    </Suspense>
  );
}
