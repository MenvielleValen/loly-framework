import { MetadataLoader } from "@loly/core";

export const getMetadata: MetadataLoader = async () => {
  return {
    title: `Loly framework`,
    description: `Loly framework`,
  };
};
