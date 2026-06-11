# AI-Powered Education Exam Platform

A Creative Apps submission concept for the Microsoft Agents League contest. The platform helps learners prepare for technical certification exams and enjoy kid-friendly quiz rounds with grounded explanations and a simple user dashboard.

## What this project does
- Lets users sign up and log in
- Offers technical exams for AWS, Azure, Kubernetes, and Docker
- Includes a 50-question exam flow with review explanations after submission
- Includes a kid-friendly quiz mode with 10-question riddles
- Tracks each user’s exam history in a personal dashboard

## Tech stack
- React for the frontend
- Node.js + Express for the backend
- PostgreSQL-compatible storage via a Neon-style DATABASE_URL
- Vite for development

## Local setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the server folder with:
   ```env
   DATABASE_URL=postgresql://<user>:<password>@<host>/<database>?sslmode=require
   PORT=5000
   ```
3. Start the app:
   ```bash
   npm run dev
   ```
4. Open the frontend at `http://localhost:3000` and the API at `http://localhost:5000/health`

## AI workflow for future expansion
The intended production flow is:
1. Use Claude API via `claude-3-5-sonnet` to generate questions
2. Manually review a sample set to remove weak items
3. Keep the highest-quality questions and store them for use in the platform
4. Validate explanations and answers against official documentation using a Foundry IQ-style grounding approach

## Security and compliance
- Keep secrets in environment variables only
- Do not commit `.env` files
- Use MIT license for the repository

## License
MIT
