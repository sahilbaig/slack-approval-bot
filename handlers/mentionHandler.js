export default function mentionHandler(slackApp) {
    slackApp.event('app_mention', async ({ event, say }) => {
        console.log('📩 Mention Event:', event.text);
        await say(`Hey <@${event.user}>, I am here! Type \`/approval-test\` to start an approval request.`);
    });
}