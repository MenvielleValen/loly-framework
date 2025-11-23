import { usePageProps } from "@loly/core/modules/components";
import axios from "axios";
import { PropsWithChildren } from "react";

export const Button = ({
  children,
  slug,
}: PropsWithChildren<{ slug: string }>) => {

  const { props } = usePageProps() as any;

  console.log("Page props", props);


  const handleClick = async () => {
    try {
      const { data } = await axios.post(
        `http://localhost:3000/api/blog/${slug}`,
        {
          test: "prueba",
        }
      );
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <button onClick={handleClick} className="bg-amber-300 p-2 rounded-md">
      {children || props?.user?.name}
    </button>
  );
};
