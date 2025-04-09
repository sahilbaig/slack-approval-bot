import express from 'express';
import pkg from '@slack/bolt';
const { App, ExpressReceiver } = pkg;
import dotenv from 'dotenv';

import getSlackMembers from './utils/getSlackMembers.js';

dotenv.config();

const receiver = new ExpressReceiver({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
});
// This is for recieving events from Slack

const slackApp = new App({
    token: process.env.SLACK_BOT_TOKEN,
    receiver,
});
// This is the bot 
// Reciever is set to our Custom Express Receiver

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// For Getting Slack Members
// We use this to get list of members in dropdown to select approver
app.get('/slack/members', async (req, res) => {
    const members = await getSlackMembers();
    res.json(members);
});

// Handling Events in Slack
app.post('/slack/events', async (req, res) => {
    // This is one time event for testing if backend recieves data from slack
    if (req.body.challenge) {
        return res.status(200).send(req.body.challenge);
    }

    // Recieving Payload 
    if (req.body.payload) {
        const payload = JSON.parse(req.body.payload);

        if (payload.type === 'view_submission' && payload.view.callback_id === 'approval_modal') {
            const approverId = payload.view.state.values.approver_block.approver_select.selected_option.value;
            const messageText = payload.view.state.values.message_block.message_input.value;
            const requesterId = payload.user.id;

            console.log("Selected Approver:", approverId); // Debugging
            console.log("Approval Message:", messageText); //Debugging

            // Checking for approval Request
            await slackApp.client.chat.postMessage({
                channel: approverId,
                text: 'Approval request received',
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn', //Since I needed bold and mentions 
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
                // Sending Data from here containing requesterID
                metadata: {
                    event_type: 'approval_request',
                    event_payload: {
                        requesterId
                    }
                }
            });
            // This is for closing the modal 
            return res.status(200).json({ response_action: "clear" });
        }

        // Button click (Approve / Reject)
        if (payload.type === 'block_actions') {
            const action = payload.actions[0];
            const approverId = payload.user.id;
            const requesterId = payload.message.metadata?.event_payload?.requesterId;


            let decision = '';
            // Check which button is clicked
            if (action.action_id === 'approve_request') {
                decision = 'Approved ';
            } else {
                decision = 'Rejected ';
            }

            // Notify requester that approval is Rejected or Approved
            await slackApp.client.chat.postMessage({
                channel: requesterId,
                text: `Your request has been *${decision}* by <@${approverId}>.`,
            });

            //Update the Original Message in Approver DM
            await slackApp.client.chat.update({
                channel: payload.channel.id,
                ts: payload.message.ts, //Required for editing
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

// Slash Command open a Modal with required Fields
app.post('/slack/commands', async (req, res) => {
    const { command, trigger_id } = req.body;
    //Triggger_id for openign a modal
    if (command === '/approval-test') {
        try {
            const members = await getSlackMembers();

            await slackApp.client.views.open({
                // Modal
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
                        // Actual data inside the modal
                        {
                            type: 'input',
                            block_id: 'approver_block',
                            label: {
                                type: 'plain_text',
                                text: 'Select Approver',
                            },
                            element: {
                                type: 'static_select',
                                // Can replace this with User_select -> No need to fetch users manually
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
                            // What message to send to approver
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
            console.error('Error opening modal:', error);
            res.status(500).send('Failed to open modal');
        }
    } else {
        res.send('Unknown command');
    }
});

// Health check
app.get('/', (req, res) => {
    res.send('Slack Bot is running');
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
