module.exports = function (api) {
  api.cache(true);

  return {
    presets: [["babel-preset-expo"], "nativewind/babel"],

    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],

          alias: {
            "@": "./",
            "@ui": "./components/ui",
            "@gluestack-ui-provider": "./src/features/shared/providers/gluestack-ui-provider",
            "@hooks": "./src/features/shared/hooks/global",
            "@features": "./src/features",
            "@shared": "./src/features/shared",
            "@shared/hooks": "./src/features/shared/hooks",
            "@shared/components": "./src/features/shared/components",
            "@shared/components/ui": "./src/features/shared/components/ui",
            "@shared/utils": "./src/features/shared/utils",
            "@shared/constants": "./src/features/shared/constants",
            "@shared/providers": "./src/features/shared/providers",
            "@shared/assets": "./src/features/shared/assets",
            "@constants": "./src/features/shared/constants",
            "@utils": "./src/features/shared/utils",
            "@providers": "./src/features/shared/providers",
            "@assets": "./src/features/shared/assets",
            "tailwind.config": "./tailwind.config.js",
          },
        },
      ],
      "react-native-worklets/plugin",
    ],
  };
};
