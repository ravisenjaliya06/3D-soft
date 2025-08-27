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
            args: "run gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000",
            cwd: "./backend",
            env: {
                ENV: "production",
            },
        },
    ],
};