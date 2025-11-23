// Styles import
import "./app/styles.css";

import {
  routes,
  type ClientRouteLoaded,
} from "./.fw/routes-client";


import { bootstrapClient } from "@loly/core/modules/runtime/client";


bootstrapClient(routes as ClientRouteLoaded[]);