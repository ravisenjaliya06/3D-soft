import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import next from "@next/eslint-plugin-next";

export default [
    {
        ignores: ["node_modules/**", ".next/**"],
    },
    js.configs.recommended,
    {
        plugins: {
            react,
            "react-hooks": reactHooks,
            next
        },
        rules: {
            "react/react-in-jsx-scope": "off",
            "react/jsx-uses-react": "off",
        },
    },
    {
        languageOptions: {
            globals: {
                document: "readonly",
                window: "readonly"
            }
        }
    }
];
