import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.diarytips.app",
  appName: "DiaryTrips",
  webDir: "dist",
  server: {
    // For live-reload during development:
    // url: "http://YOUR_LOCAL_IP:8080",
    // cleartext: true,
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
    },
  },
};

export default config;
