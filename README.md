# Slack Approval Workflow Bot

A Node.js Slack bot that manages approval requests with interactive Approve/Reject buttons.

## 🚀 Quick Start

1. **Clone & Setup**
```bash
git clone https://github.com/yourusername/slack-approval-bot.git
cd slack-approval-bot
npm install

```
2. **Clone & Setup**
Create .env file with
SLACK_CLIENT_ID=your_client_id
SLACK_CLIENT_SECRET=your_client_secret
SLACK_SIGNING_SECRET=your_signing_secret
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
PORT=3000

3.  **Start the server**
node index.js

🔧 Tech Stack
Node.js + Express
Slack Bolt SDK
OAuth 2.0 flow
Interactive Components

Features
Slash command integration
Real-time approval workflow
User notifications
Secure token handling

Currently running in local ngrok server . Will Change it to a AWS Lambda Soon. 
