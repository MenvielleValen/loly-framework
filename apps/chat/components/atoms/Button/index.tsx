import { usePageProps } from "@lolyjs/core/hooks";
import axios from "axios";
import { PropsWithChildren } from "react";

export const Button = ({
  children,
  slug,
}: PropsWithChildren<{ slug: string }>) => {
  const { props } = usePageProps() as any;

  const handleClick = async () => {
    try {
      // Use relative URL (works in both dev and production)
      const apiUrl = typeof window !== "undefined" 
        ? `${window.location.origin}/api/blog/${slug}`
        : `/api/blog/${slug}`;
      
      const { data } = await axios.post(apiUrl, {
        test: "prueba",
      });
    } catch (error) {
      console.error("Error in Button click handler:", error);
    }
  };

  return (
    <button onClick={handleClick} className="bg-amber-300 p-2 rounded-md">
      {children || props?.user?.name}
    </button>
  );
};
