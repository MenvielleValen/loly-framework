import type { ServerLoader } from "@lolyjs/core";
import { getNASAPOD } from "@/lib/space-api";

// Use SSR for APOD (changes daily)
export const dynamic = "force-dynamic" as const;

export const getServerSideProps: ServerLoader = async (ctx: any) => {
  const apod = await getNASAPOD();

  return {
    props: {
      apod,
    },
    metadata: {
      title: `${apod?.title} | APOD | Space Explorer`,
      description: apod.explanation.substring(0, 160),
      metaTags: [
        {
          property: "og:title",
          content: `${apod?.title} | APOD`,
        },
        {
          property: "og:description",
          content: apod?.explanation.substring(0, 160),
        },
        ...(apod?.media_type === "image"
          ? [
              {
                property: "og:image",
                content: apod?.hdurl || apod?.url,
              },
            ]
          : []),
      ],
    },
  };
};

