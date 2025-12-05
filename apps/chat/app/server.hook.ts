import { ServerLoader } from "@lolyjs/core";

export const getServerSideProps: ServerLoader = async () => {
  return {
    props: {},
    metadata: {
      title: `Loly chat`,
      description: `Loly chat`,
    },
  };
};
