export default function interactionsHandler(slackApp) {
    slackApp.view('approval_modal', async ({ ack, body, view, client }) => {
        await ack(); // Acknowledge submission

        const approver = view.state.values.approver_select.approver.selected_user;
        const details = view.state.values.request_text.details.value;
        const requester = body.user.id;

        // Send message to approver
        await client.chat.postMessage({
            channel: approver,
            text: `Approval request from <@${requester}>:\n\n${details}`,
            attachments: [
                {
                    text: "Do you approve this request?",
                    fallback: "Approve or Reject",
                    callback_id: "approval_action",
                    actions: [
                        { type: "button", text: "Approve", style: "primary", action_id: "approve_request" },
                        { type: "button", text: "Reject", style: "danger", action_id: "reject_request" }
                    ]
                }
            ]
        });
    });

    // Approve/Reject Buttons
    slackApp.action('approve_request', async ({ ack, body, client }) => {
        await ack();
        const requester = body.message.text.match(/<@(.*?)>/)[1];

        await client.chat.postMessage({
            channel: requester,
            text: `✅ Your request has been *approved*!`
        });
    });

    slackApp.action('reject_request', async ({ ack, body, client }) => {
        await ack();
        const requester = body.message.text.match(/<@(.*?)>/)[1];

        await client.chat.postMessage({
            channel: requester,
            text: `❌ Your request has been *rejected*.`
        });
    });
}
