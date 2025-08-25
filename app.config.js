module.exports = () => {
  const dotenv = require('dotenv');
  dotenv.config();

  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || '';

  return {
    expo: {
      name: "Mirae SafePlaces",
      slug: "Mirae-safeplaces",
      version: "1.0.0",
      orientation: "portrait",
      icon: "./assets/icon.png",
      userInterfaceStyle: "light",
      platforms: ["ios", "android", "web"],
      splash: {
        image: "./assets/icon.png",
        resizeMode: "contain",
        backgroundColor: "#FF6B6B",
      },
      assetBundlePatterns: ["**/*"],
      ios: {
        supportsTablet: true,
        bundleIdentifier: "com.mirae.safeplaces",
        infoPlist: {
          NSLocationWhenInUseUsageDescription:
            "This app needs location access to show nearby LGBTQ+ friendly places and send location-based event notifications.",
          NSLocationAlwaysAndWhenInUseUsageDescription:
            "This app needs location access to show nearby LGBTQ+ friendly places and send event notifications.",
          ITSAppUsesNonExemptEncryption: false,
        },
        config: {
          googleMapsApiKey,
        },
      },
      android: {
        adaptiveIcon: {
          foregroundImage: "./assets/adaptive-icon.png",
          backgroundColor: "#FF6B6B",
        },
        package: "com.mirae.safeplaces",
        softwareKeyboardLayoutMode: "resize",
        permissions: [
          "android.permission.CAMERA",
          "android.permission.RECORD_AUDIO",
          "ACCESS_FINE_LOCATION",
          "ACCESS_COARSE_LOCATION",
          "RECEIVE_BOOT_COMPLETED",
          "VIBRATE",
          "WAKE_LOCK",
          "android.permission.ACCESS_COARSE_LOCATION",
          "android.permission.ACCESS_FINE_LOCATION",
        ],
        config: {
          googleMaps: {
            apiKey: googleMapsApiKey,
          },
        },
      },
      web: {
        favicon: "./assets/favicon.png",
        bundler: "metro",
      },
      plugins: [
        [
          "expo-location",
          {
            locationAlwaysAndWhenInUsePermission:
              "Allow Mirae SafePlaces to use your location to find nearby LGBTQ+ friendly businesses and send event notifications.",
          },
        ],
        [
          "expo-notifications",
          {
            icon: "./assets/logoM.png",
            color: "#FF6B6B",
          },
        ],
        "expo-font",
      ],
      extra: {
        supabaseUrl: " https://pvvkdtlkjulvutzyzaxb.supabase.co",
        supabaseAnonKey:
          " eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2dmtkdGxranVsdnV0enl6YXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NzI2NzIsImV4cCI6MjA3MDA0ODY3Mn0.xDn8Wyq_hVwC6gUwaRn94Nt6VKAYWowEju6AQWBvhKI",
        eas: {
        "projectId": "0013a8cd-8d09-47fe-8b1b-36e85ccc37be"
      }
      },
    },
  };
};