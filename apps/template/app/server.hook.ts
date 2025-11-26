import { ServerLoader } from "@loly/core";

const getDb = async () => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        name: "valen",
        apellido: "test"
      })
    }, 100);
  })
}

export const getServerSideProps: ServerLoader = async (ctx) => {

  const data = await getDb();

  console.log("Desde el server", {
    data
  })

  return {
    props: {
      appName: 'Loly',
      data
    },
    className: 'dark'
  };
};
