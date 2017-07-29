
PokerClient = function (id, apiKey, user, host, whenReady) {
    var self = this;

    //uploadmydata-peerjsserver.azurewebsites.net
    this.peer = new Peer(id, { host: 'localhost', port: 1337, path: '/peerserver' });

    this.id = id;
    this.ready = false;
    this.user = user;
    this.host = host;

    this.clients = [];
    this.history = [];


    this.peer.on('open', function (id) {
        //receive
        self.peer.on('connection', function (conn) {
            conn.on('data', function (data) {
                console.log(data);
                self.processMessage(data);
            });
        });

        self.commands = [
            { command: "join", fn: self.hostJoined },
            { command: "start", fn: self.hostStart },
            { command: "playCard", fn: self.hostPlay },
            { command: "playedCard", fn: self.playedCard },
            { command: "callGame", fn: self.hostCallGame },
            { command: "gameCalled", fn: self.gameCalled },
            { command: "startGame", fn: self.hostStartGame },
            { command: "gameStarted", fn: self.gameStarted },
            { command: "nameChanged", fn: self.hostNameChanged },
            { command: "changeName", fn: self.changeName },
            
        ];        
        whenReady();
    });

    this.processMessage = function (data) {
        var msg = JSON.parse(data);
        for (var i = 0; i < self.commands.length; i++) {
            var element = self.commands[i];
            if (element.command === msg.command) {
                element.fn.apply(element.fn, msg.parameters);
            }
        }
    }

    this.sendMessage = function (destination, command, parameters) {
        var msg = {
            from: self.id,
            command: command,
            parameters: parameters
        };
        var jsonMsg = JSON.stringify(msg);
        if (destination == self.id) {
            self.processMessage(jsonMsg);
        }
        else {
            self.send(destination, jsonMsg);
        }
    };

    this.broadcastMessage = function (command, parameters) {

        for (var i = 0; i < self.clients.length; i++) {
            self.sendMessage(self.clients[i].id, command, parameters);
        }
        //todo dry
        var msg = {
            from: self.id,
            command: command,
            parameters: parameters
        };
        self.history.push(msg);
    }
    
    this.send = function (destination, message) {
        var conn = self.peer.connect(destination);
        conn.on('open', function () {
            conn.send(message);
        });
    };

    /*******************************/
    /* HOST CODE
    /*******************************/
    this.hostJoined = function (id, user) {
        self.sendMessage(self.host, "start", []);
        var client;
        var i = 0;
        for (i = 0; i < self.clients.length; i++) {
            if (self.clients[i].id === id) {
                client = self.clients[i];
            }
        }
        if (!client) {
            self.clients.push({id: id, user: user});
        }        
        self.sendMessage(id, "start", []);
        for (i = 0; i < self.history.length; i++) {
            self.sendMessage(id, self.history[i].command, self.history[i].parameters);
        }

    };    

    this.hostStart = function () {
    };

    this.hostPlay = function (user, card) {
        self.broadcastMessage("playedCard", [user, card]);
    };

    this.hostCallGame = function () {
        self.broadcastMessage("gameCalled", []);
    };

    this.hostStartGame = function () {
        self.history = [];
        self.broadcastMessage("gameStarted", []);        
    };

    this.hostNameChanged = function (txt) {
        self.broadcastMessage("changeName", [txt]);
    };

    /*******************************/
    /* CLIENT CODE
    /*******************************/

    this.joinGame = function () {
        self.sendMessage(self.host, "join", [self.id, self.user]);
    };
    
    this.playCard = function (user, card) {
        self.sendMessage(self.host, "playCard", [user, card]);
    };

    this.newGame = function () {
        self.sendMessage(self.host, "startGame", []);
        self.sendMessage(self.host, "nameChanged", [document.getElementById("gamename").value]);
    };

    this.nameChange = function () {
        self.sendMessage(self.host, "nameChanged", [document.getElementById("gamename").value]);
    }

    this.changeName = function (txt) {
        document.getElementById("gamename").value = txt;
    }

    this.callGame = function () {
        self.sendMessage(self.host, "callGame", []);
    };
    
    this.clearTable = function () {
        var hand = document.getElementById("hand");
        hand.innerHTML = "";
        var table = document.getElementById("table");
        table.innerHTML = "";
    };

    this.dealCards = function () {
        self.clearTable();
        var hand = document.getElementById("hand");        
        var cards = ["0", "½", "1", "2", "3", "5", "8", "13", "20", "40", "100", "?", "♣"];
        
        for (var i = 0; i < cards.length; i++) {
            hand.innerHTML += "<div class='card' id='_playercard" + i + "'><p>" + cards[i] + "</p></div>";            
        }
        for (var i = 0; i < cards.length; i++) {
            document.getElementById("_playercard" + i).addEventListener("click", function () { self.playCard(self.user, this.innerText); });
        }
    };

    this.showCards = function () {
        var elements = document.querySelectorAll(".playedcard");
        for (var i = 0; i < elements.length; i++) {            
            splits = elements[i].id.split("_");
            elements[i].innerHTML = "<p>" + splits[splits.length - 1] + "</p>";
        }
    };

    this.playedCard = function (user, card) {
        var table = document.getElementById("table");

        var playedCard = document.getElementById("_playedcard_" + user);
        var html = "<table id='_playedcard_" + user + "' style='float:left;'><tr>";
        var value = card;
        if (self.user != user) {
            value = "<p style='color:red;'>♥</p>";
        }

        html += "<td><div style='float:left;padding-left:10px;'><center><span class='username'>" + user + "</span><br/><div class='card playedcard' id='_card_" + user + "_" + card + "' style='float:none;'><p>" + value + "</p></div></center></div></td>";
        html += "</tr></table>";

        if (playedCard) {
            playedCard.outerHTML = html;
        }
        else {
            table.innerHTML += html
        }
    };

    this.gameStarted = function () {
        self.clearTable();
        self.dealCards();
    };
    
    this.gameCalled = function () {
        var hand = document.getElementById("hand");  
        hand.innerHTML = "";
        self.showCards();
    };
}