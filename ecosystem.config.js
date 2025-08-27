module.exports = {
  apps: [
    {
      name: "design-portal",
      script: "npm",
      args: "start",
      cwd: "/root/bravento/design_portal",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
