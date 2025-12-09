import { RouterData } from "@rendering/index.types";
import { Request } from "express";

export const buildRouterData = (req: Request): RouterData => {
  return {
    pathname: req.path,
    params: req.params,
    searchParams: req.query,
  };
};
