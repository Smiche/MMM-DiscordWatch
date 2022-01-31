const NodeHelper = require("node_helper");
const Log = require("../../js/logger");
const { Client, Intents } = require('discord.js');

module.exports = NodeHelper.create({
    // Override start method.
    start: function () {
        Log.log("Starting node helper for: " + this.name);
        this.fetchers = [];
    },

    // Override socketNotificationReceived method.
    socketNotificationReceived: function (notification, payload) {
        console.log("notification received.");
        if (notification === "ADD_DISCORD_CONFIG") {
            this.createDiscordClient(payload.config, payload.id);
        }
    },

    createDiscordClient: function (config, identifier) {
        let self = this;
        console.log("connecting to discord.");
        // no token provided, we exit
        if (!config.discordToken) {
            self.sendSocketNotification("ERROR", { id: identifier, err: "Missing discord token." });
            return;
        }

        const client = new Client({
            intents: Object.keys(Intents.FLAGS)
        });

        client.on('ready', () => {
            console.debug(`Logged in as ${client.user.tag}!`);
            self.sendSocketNotification("CONNECTED", { id: identifier });
            //request the last x messages
            this.requestLastMessages(client, config, identifier);
        });

        client.on('messageCreate', msg => {
            if (config.subscribedChannels.indexOf(msg.channel.id) > -1) {
                self.sendSocketNotification("NEW_MESSAGE", { id: identifier, text: msg.content, author: msg.author.username, channel: msg.channel.name, createdAt: msg.createdAt })
            }
        });

        client.login(config.discordToken).catch(err => {
            console.error(err);
            self.sendSocketNotification("ERROR", { id: identifier, err: err });
        });
    },

    /**
     * This will attempt to fetch maxEntries amount of messages from each subscribed channel,
     * then sort by date and submit the newest maxEntries amount of messages.
     *
     * @param {*} client discord client that is already connected preferably
     * @param {*} config
     */
    requestLastMessages: function (client, config, identifier) {
        let self = this;
        let channels = [];
        config.subscribedChannels.forEach((ChId) => {
            channels.push(client.channels.cache.get(ChId));
        })

        let promises = [];
        for (const Channel of channels) promises.push(Channel.messages.fetch({ limit: config.maxEntries }));

        Promise.all(promises).then((messagesArray) => {
            let messages = [];
            messagesArray.forEach(arr => {
                messages = messages.concat(...arr.values());
            });
            //console.log("MessArr:", messages);
            messages = messages.sort((a, b) => {
                return new Date(b.createdAt) - new Date(a.createdAt);
            })
            //console.log("Sorted?");
            messages.splice(config.maxEntries);
            //console.log(messages);
            messages = messages.map((msg) => {
                return { text: msg.content, author: msg.author.username, channel: msg.channel.name, createdAt: msg.createdAt };
            });
            self.sendSocketNotification("NEW_MESSAGE", { id: identifier, messages: messages });
        }).catch(err => {
            console.error(err);
        });
    }
});
