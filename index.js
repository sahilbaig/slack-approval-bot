import express from 'express';
import pkg from '@slack/bolt';
const { App, ExpressReceiver } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Create an ExpressReceiver
const receiver = new ExpressReceiver({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const slackApp = new App({
    token: process.env.SLACK_BOT_TOKEN,
    receiver,
});

const app = express();
const PORT = 3000;

app.use(express.json());
app.use('/slack/events', receiver.router);

// Handle Slack challenge verification
app.post('/slack/events', async (req, res) => {

    // Respond to Slack challenge
    if (req.body.challenge) {
        return res.status(200).send(req.body.challenge);
    }

    // Handle app_mention event
    if (req.body.event && req.body.event.type === 'app_mention') {
        console.log("✅ App Mention Triggered:", req.body.event.text);

        // Respond back to the channel
        const { event } = req.body;
        try {
            const slackResponse = await fetch("https://slack.com/api/chat.postMessage", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.SLACK_BOT_TOKEN}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    channel: event.channel,
                    text: `👋 Hello <@${event.user}>, I see you mentioned me!`
                })
            });

            const result = await slackResponse.json();
            console.log("📤 Slack Response:", result);
        } catch (error) {
            console.error("❌ Error sending message:", error);
        }
    }

    // Acknowledge receipt of the event
    res.status(200).send();
});
app.get('/', (req, res) => {
    res.send('Slack Bot is running');
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
