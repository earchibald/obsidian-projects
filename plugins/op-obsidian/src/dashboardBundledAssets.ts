import daemonSource from "../dashboard/op-dashboard.py";
import clientIndexHtml from "../dashboard/client/index.html";

export interface BundledDashboardAssets {
  sourceLabel: string;
  daemonContent: string;
  clientContent: string;
}

export const BUNDLED_DASHBOARD_ASSETS: BundledDashboardAssets = {
  sourceLabel: "Embedded in the plugin bundle (`dashboard/op-dashboard.py` + `dashboard/client/index.html`)",
  daemonContent: daemonSource,
  clientContent: clientIndexHtml,
};
