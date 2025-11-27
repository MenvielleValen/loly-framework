import { usePageProps } from "@loly/core/hooks";
import { PropsWithChildren } from "react";

export const Button = ({
  children,
  slug,
}: PropsWithChildren<{ slug: string }>) => {

  const { props } = usePageProps() as any;

 


  const handleClick = async () => {
    console.log("Page props", props);
  };

  return (
    <button onClick={handleClick} className="bg-amber-300 p-2 rounded-md">
      {children || props?.user?.name}
    </button>
  );
};
