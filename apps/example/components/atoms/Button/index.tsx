import axios from "axios";
import { PropsWithChildren } from "react";

export const Button = ({
  children,
  slug,
}: PropsWithChildren<{ slug: string }>) => {
  const handleClick = async () => {
    try {
      const { data } = await axios.post(
        `http://localhost:3000/api/test/${slug}`,
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
      {children}
    </button>
  );
};
