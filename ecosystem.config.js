module.exports = {
    apps: [
        {
            name: "design-portal",
            script: "npm",
            args: "start",
            cwd: "./design_portal",
            env: {
                NODE_ENV: "production",
                PORT: 3000,
            },
        },
    ],
};