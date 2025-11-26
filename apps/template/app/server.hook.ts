import { ServerLoader } from "@loly/core";

export const getServerSideProps: ServerLoader = async (ctx) => {

  return {
    props: {
      appName: 'Loly'
    },
    className: 'dark'
  };
};
