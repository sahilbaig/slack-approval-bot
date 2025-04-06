import express from 'express';
import pkg from '@slack/bolt';
const { App, ExpressReceiver } = pkg;
import dotenv from 'dotenv';

import getSlackMembers from './utils/getSlackMembers.js';

dotenv.config();

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
app.use(express.urlencoded({ extended: true }));

// ✅ Get Slack members
app.get('/slack/members', async (req, res) => {
    const members = await getSlackMembers();
    res.json(members);
});

// ✅ Handle Slack events (mentions + modal submissions)
app.post('/slack/events', async (req, res) => {
    if (req.body.challenge) {
        return res.status(200).send(req.body.challenge);
    }

    // ✅ Handle modal submission
    if (req.body.payload) {
        const payload = JSON.parse(req.body.payload);

        if (payload.type === 'view_submission' && payload.view.callback_id === 'approval_modal') {
            const userInput = payload.view.state.values.feedback_block.feedback_input.value;
            console.log("✅ User submitted:", userInput);

            return res.status(200).json({ response_action: "clear" });
        }
    }

    // ✅ Handle app_mention
    if (req.body.event && req.body.event.type === 'app_mention') {
        console.log("✅ App Mention:", req.body.event.text);
    }

    res.status(200).send();
});

// ✅ Slash command opens modal
app.post('/slack/commands', async (req, res) => {
    const { command, trigger_id } = req.body;

    if (command === '/approval-test') {
        try {
            await slackApp.client.views.open({
                trigger_id,
                view: {
                    type: 'modal',
                    callback_id: 'approval_modal',
                    title: {
                        type: 'plain_text',
                        text: 'Approval Modal',
                    },
                    close: {
                        type: 'plain_text',
                        text: 'Close',
                    },
                    submit: {
                        type: 'plain_text',
                        text: 'Submit',
                    },
                    blocks: [
                        {
                            type: 'input',
                            block_id: 'feedback_block',
                            label: {
                                type: 'plain_text',
                                text: 'Your feedback',
                            },
                            element: {
                                type: 'plain_text_input',
                                action_id: 'feedback_input',
                            },
                        },
                    ],
                },
            });

            res.status(200).send();
        } catch (error) {
            console.error('❌ Error opening modal:', error);
            res.status(500).send('Failed to open modal');
        }
    } else {
        res.send('Unknown command');
    }
});

// ✅ Health check
app.get('/', (req, res) => {
    res.send('Slack Bot is running');
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
