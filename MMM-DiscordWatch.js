Module.register("MMM-DiscordWatch", {
    // Default module config.
    defaults: {
        discordToken: false,
        tableClass: "small",
        maxEntries: 10,
        maxMessageLength: 25,
        maxAuthorLength: 8,
        maxMessageLines: 1,
        wrapEvents: false, // wrap events to multiple lines breaking at maxMessageLength        
        fade: true,
        fadePoint: 0.25,
        showChannel: true,
        subscribedChannels: [],
    },

    // Define required scripts.
    getStyles: function () {
        return ["MMM-DiscordWatch.css", "font-awesome.css"];
    },

    getScripts: function () {
        return ["moment.js"];
    },
    start: function () {
        Log.log("Starting module: " + this.name);
        this.addDiscord(this.config);

        this.messages = [];
        this.loaded = false;
    },
    // Override socket notification handler.
    socketNotificationReceived: function (notification, payload) {
        if (this.identifier !== payload.id) {
            return;
        }

        if (notification === "NEW_MESSAGE") {
            if (payload.messages) {
                this.messages = this.messages.concat(payload.messages);
            } else {
                this.messages.pop();
                this.messages.unshift(payload);
            }
            this.loaded = true;
        } else if (notification === "ERROR") {
            Log.error("Error:", payload.err);
            this.loaded = true;
        } else if (notification === "CONNECTED") {
            this.loaded = true;
        }

        this.updateDom(0);
    },
    // Override dom generator.
    getDom: function () {
        Log.log("getDom: " + this.name);
        var messages = this.messages;
        var wrapper = document.createElement("table");
        wrapper.className = this.config.tableClass;

        if (messages.length === 0) {
            wrapper.innerHTML = this.loaded ? "No messages" : "Loading Discord connection";
            wrapper.className = this.config.tableClass + " dimmed";
            return wrapper;
        }

        if (this.config.fade && this.config.fadePoint < 1) {
            if (this.config.fadePoint < 0) {
                this.config.fadePoint = 0;
            }
            var startFade = messages.length * this.config.fadePoint;
            var fadeSteps = messages.length - startFade;
        }

        var currentFadeStep = 0;

        for (var mi in messages) {
            var message = messages[mi];
            console.log(message);

            var mesWrapper = document.createElement("tr");
            mesWrapper.className = "normal";
            if (mi >= startFade) {
                currentFadeStep = mi - startFade;
                mesWrapper.style.opacity = 1 - (1 / fadeSteps) * currentFadeStep;
            }

            //author
            var authorWrapper = document.createElement("td");
            authorWrapper.innerHTML = this.titleTransform(message.author, false, this.config.maxAuthorLength, 1);
            authorWrapper.className = "author";
            mesWrapper.appendChild(authorWrapper);

            var contentWrapper = document.createElement("td");

            //message text
            var messageDiv = document.createElement("div");
            messageDiv.innerHTML = this.titleTransform(message.text, this.config.wrapEvents, this.config.maxMessageLength, this.config.maxMessageLines);
            messageDiv.className = "message"
            contentWrapper.appendChild(messageDiv);

            //channel name
            if (this.config.showChannel) {
                var channel = document.createElement("div");
                channel.innerHTML = this.titleTransform(message.channel, this.config.wrapEvents, this.config.maxMessageLength, this.config.maxMessageLines);
                channel.className = "channel"
                contentWrapper.appendChild(channel);
            }

            mesWrapper.appendChild(contentWrapper);

            //timestamp
            var timeWrapper = document.createElement("td");
            timeWrapper.innerHTML = this.capFirst(moment.utc(message.createdAt).fromNow()); //time should be Date from discordjs
            timeWrapper.className = "time light";
            mesWrapper.appendChild(timeWrapper);

            wrapper.appendChild(mesWrapper);
        }
        return wrapper;
    },
    /**
     * Will send a socket notification to the helper, which will create a Discordjs client with provided api token.
     * @param {*} config module config
     */
    addDiscord: function (config) {
        this.sendSocketNotification("ADD_DISCORD_CONFIG", {
            id: this.identifier,
            config: config
        });
    },
    /**
     * I found this in the gitlab MR module, I guess it trims titles to fit a certain size.
     * @param {*} string 
     * @param {*} wrapEvents 
     * @param {*} maxLength 
     * @param {*} maxMessageLines 
     */
    titleTransform: function (string, wrapEvents, maxLength, maxMessageLines) {
        if (typeof string !== "string") {
            return "";
        }

        if (wrapEvents === true) {
            var temp = "";
            var currentLine = "";
            var words = string.split(" ");
            var line = 0;

            for (var i = 0; i < words.length; i++) {
                var word = words[i];
                if (currentLine.length + word.length < (typeof maxLength === "number" ? maxLength : 25) - 1) {
                    // max - 1 to account for a space
                    currentLine += word + " ";
                } else {
                    line++;
                    if (line > maxMessageLines - 1) {
                        if (i < words.length) {
                            currentLine += "&hellip;";
                        }
                        break;
                    }

                    if (currentLine.length > 0) {
                        temp += currentLine + "<br>" + word + " ";
                    } else {
                        temp += word + "<br>";
                    }
                    currentLine = "";
                }
            }

            return (temp + currentLine).trim();
        } else {
            if (maxLength && typeof maxLength === "number" && string.length > maxLength) {
                return string.trim().slice(0, maxLength) + "&hellip;";
            } else {
                return string.trim();
            }
        }
    },
    capFirst: function (string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },

});