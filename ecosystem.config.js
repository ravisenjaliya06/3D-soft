module.exports = {
  apps: [
    {
      name: "design-portal",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: "/root/bravento/design_portal",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      post_update: ["npm install", "npm run build"]
    },
  ],
};
