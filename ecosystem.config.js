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
        {
            name: "backend",
            script: "pipenv",
            args: "run uvicorn main:app --host 0.0.0.0 --port 8000",
            cwd: "./backend",
            env: {
                ENV: "production",
            },
        },
    ],
};