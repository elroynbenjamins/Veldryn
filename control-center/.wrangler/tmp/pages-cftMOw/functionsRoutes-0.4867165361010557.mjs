import { onRequest as __api_admin_js_onRequest } from "C:\\src\\Veldryn\\control-center\\functions\\api\\admin.js"

export const routes = [
    {
      routePath: "/api/admin",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_admin_js_onRequest],
    },
  ]