import type { ServerLoader } from "@lolyjs/core";
import { getSpaceXLaunch } from "@/lib/space-api";

// Use SSR for individual launch (dynamic data)
export const dynamic = "force-dynamic" as const;

export const getServerSideProps: ServerLoader = async (ctx) => {
  const { id } = ctx.params;
  const launch = await getSpaceXLaunch(id as string);

  if (!launch) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      launch,
    },
    metadata: {
      title: `${launch.name} | Space Explorer`,
      description: launch.details || `Launch details for ${launch.name}`,
      metaTags: [
        {
          property: "og:title",
          content: `${launch.name} | Space Explorer`,
        },
        {
          property: "og:description",
          content: launch.details || `Launch details for ${launch.name}`,
        },
      ],
    },
  };
};

