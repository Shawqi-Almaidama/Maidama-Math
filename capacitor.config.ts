export interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  server?: {
    androidScheme?: string;
    cleartext?: boolean;
    url?: string;
  };
  plugins?: Record<string, any>;
  android?: {
    allowMixedContent?: boolean;
    webContentsDebuggingEnabled?: boolean;
    [key: string]: any;
  };
  [key: string]: any;
}

const config: CapacitorConfig = {
  appId: 'com.maidamamath.app',
  appName: 'Maidama Math | ميدمة ماث',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      backgroundColor: '#1e1b4b',
      androidSplashResourceName: 'splash',
    },
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
