This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/en) installed on your System.
(node-v22.11.0)

### Installation Steps

1. **Go to Project Folder**:

```bash
cd design_portal
cp env.local.example .env.local
```

2. **Install Dependencies**:

```bash
npm install
```

### Running the Project

To start the development server, run:

```bash
npm run dev
```

## Formatter code

To format your code using Prettier, run the following command:

```
npm run format
```

This command will apply the formatting rules defined in your `.prettierrc` file to your codebase.

## ESLint linter

To check your code for linting issues using ESLint, run the following command:

```
npm run lint
```

## All Command Run

run the following command:

```
check.bat or .\check.bat
For Ubuntu/Linux use ./check.sh
```

This command will analyze your code for potential errors and enforce coding standards. If there are any issues, ESLint will provide feedback on how to fix them.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
