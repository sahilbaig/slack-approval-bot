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

app.post('/slack/events', async (req, res) => {
    if (req.body.challenge) {
        return res.status(200).send(req.body.challenge);
    }

    if (req.body.payload) {
        const payload = JSON.parse(req.body.payload);

        // ✅ Modal submission
        if (payload.type === 'view_submission' && payload.view.callback_id === 'approval_modal') {
            const approverId = payload.view.state.values.approver_block.approver_select.selected_option.value;
            const messageText = payload.view.state.values.message_block.message_input.value;
            const requesterId = payload.user.id;

            console.log("✅ Selected Approver:", approverId);
            console.log("✅ Approval Message:", messageText);

            await slackApp.client.chat.postMessage({
                channel: approverId,
                text: 'Approval request received',
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*Approval Request*\nFrom: <@${requesterId}>\n\n*Message:*\n${messageText}`,
                        },
                    },
                    {
                        type: 'actions',
                        block_id: 'approval_actions',
                        elements: [
                            {
                                type: 'button',
                                text: {
                                    type: 'plain_text',
                                    text: 'Approve',
                                },
                                style: 'primary',
                                action_id: 'approve_request',
                            },
                            {
                                type: 'button',
                                text: {
                                    type: 'plain_text',
                                    text: 'Reject',
                                },
                                style: 'danger',
                                action_id: 'reject_request',
                            },
                        ],
                    },
                ],
                metadata: {
                    event_type: 'approval_request',
                    event_payload: {
                        requesterId
                    }
                }
            });

            return res.status(200).json({ response_action: "clear" });
        }

        // ✅ Button click (Approve / Reject)
        if (payload.type === 'block_actions') {
            const action = payload.actions[0];
            const approverId = payload.user.id;
            const requesterId = payload.message.metadata?.event_payload?.requesterId;

            if (!requesterId) {
                console.error('❌ Missing requesterId in metadata');
                return res.status(200).send();
            }

            const decision = action.action_id === 'approve_request' ? 'Approved ✅' : 'Rejected ❌';

            // Notify requester
            await slackApp.client.chat.postMessage({
                channel: requesterId,
                text: `Your request has been *${decision}* by <@${approverId}>.`,
            });

            // Update original message
            await slackApp.client.chat.update({
                channel: payload.channel.id,
                ts: payload.message.ts,
                text: 'Approval request update',
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*Approval Request*\nFrom: <@${requesterId}>\n\n*Decision:* *${decision}* by <@${approverId}>`,
                        },
                    },
                ],
            });

            return res.status(200).send();
        }
    }

    res.status(200).send();
});

// ✅ Slash command opens modal
app.post('/slack/commands', async (req, res) => {
    const { command, trigger_id } = req.body;

    if (command === '/approval-test') {
        try {
            const members = await getSlackMembers();

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
                            block_id: 'approver_block',
                            label: {
                                type: 'plain_text',
                                text: 'Select Approver',
                            },
                            element: {
                                type: 'static_select',
                                action_id: 'approver_select',
                                options: members.map((m) => ({
                                    text: {
                                        type: 'plain_text',
                                        text: m.name,
                                    },
                                    value: m.id,
                                })),
                            },
                        },
                        {
                            type: 'input',
                            block_id: 'message_block',
                            label: {
                                type: 'plain_text',
                                text: 'Approval Message',
                            },
                            element: {
                                type: 'plain_text_input',
                                action_id: 'message_input',
                                multiline: true,
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
