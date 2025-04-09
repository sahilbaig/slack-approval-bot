import fetch from 'node-fetch';

const getSlackMembers = async () => {
    try {
        //Fetch the list of users from Slack API
        const response = await fetch("https://slack.com/api/users.list", {
            method: "GET",
            headers: {
                // This is bot token for authentication
                "Authorization": `Bearer ${process.env.SLACK_BOT_TOKEN}`,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();


        if (!data.ok) {

            console.error("Error fetching users:", data.error);
            return [];
        }

        // Filter out bots and deactivated users
        const members = data.members
            .filter(user => !user.is_bot && !user.deleted)
            .map(user => ({
                id: user.id,
                name: user.real_name || user.name
            }));

        // Log names and IDs
        members.forEach(member => {
            console.log(`${member.name}: ${member.id}`);
        });

        return members;

    } catch (error) {
        console.error("Error fetching Slack members:", error);
        return [];
    }
};

export default getSlackMembers;
