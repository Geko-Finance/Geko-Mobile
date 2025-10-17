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
            "@gluestack-ui-provider": "./src/providers/gluestack-ui-provider",
            "tailwind.config": "./tailwind.config.js",
          },
        },
      ],
      "react-native-worklets/plugin",
    ],
  };
};
