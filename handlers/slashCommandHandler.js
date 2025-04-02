export default function slashCommandHandler(slackApp) {
    slackApp.command('/approval-test', async ({ ack, body, client }) => {
        await ack(); // Acknowledge request

        // Open modal
        await client.views.open({
            trigger_id: body.trigger_id,
            view: {
                type: 'modal',
                callback_id: 'approval_modal',
                title: { type: 'plain_text', text: 'Approval Request' },
                blocks: [
                    {
                        type: 'input',
                        block_id: 'approver_select',
                        label: { type: 'plain_text', text: 'Select an Approver' },
                        element: {
                            type: 'users_select',
                            action_id: 'approver'
                        }
                    },
                    {
                        type: 'input',
                        block_id: 'request_text',
                        label: { type: 'plain_text', text: 'Approval Details' },
                        element: {
                            type: 'plain_text_input',
                            action_id: 'details'
                        }
                    }
                ],
                submit: { type: 'plain_text', text: 'Submit' }
            }
        });
    });
}
