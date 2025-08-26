module.exports = {
    apps: [
        {
            name: "design-portal",          // frontend app name
            script: "npm",                  // command to run
            args: "start",                  // npm start
            cwd: "./design_portal",         // go inside frontend folder
            env: {
                NODE_ENV: "production",
                PORT: 3000,
            },
        },
        {
            name: "backend",                // backend app name
            script: "pipenv",               // use pipenv
            args: "run uvicorn main:app --host 0.0.0.0 --port 8000",
            cwd: "./backend",               // go inside backend folder
            env: {
                ENV: "production",
            },
        },
    ],
};
