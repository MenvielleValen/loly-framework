import { useRouter } from '@lolyjs/core/hooks'
import React from 'react'
import { Button } from '../ui/button';

export const TestRouter = () => {
    const router = useRouter();

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      await router.push("/");
    };

  return (
    <div>
        <Button type="button" onClick={handleClick}>Go to home</Button>
    </div>
  )
}
