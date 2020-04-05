'use strict'

function Server() {
	this.gamerooms = {};
	this.roomplayersdata = {};
	this.playerscount = {};
	this.playersindex = {};


	this.rows = 9;
	this.cols = 6;

	this.pcolors = ['green', 'red', 'blue', 'orange', 'pink', 'purple'];

	// this.http = require('http');
	// this.express = require('express');
	this.express = require('express');
	this.app = this.express();
	this.httpServer = require('http').Server(this.app);
	// this.app = require('express.io')();
	this.io = require('socket.io')(this.httpServer);
	this.json = require('express-json');
	this.bodyParser = require('body-parser');
	this.session = require('express-session');
	this.favicon = require('serve-favicon');
}

Server.prototype.setConfiguration = function () {
	// this.app.http().io();
	this.app.set('port', process.env.PORT || 4545);
	this.app.set('view engine', 'ejs');
	this.app.set('view options', { pretty: true });
	this.app.set('views', __dirname + '/views');
	this.app.use(this.express.static(__dirname + '/public'));
	this.app.set('assets', __dirname + '/public');
	this.app.use(this.bodyParser.json());
	this.app.use(this.bodyParser.urlencoded({ extended: false }));
	this.app.use(this.favicon(this.app.get('assets') + '/images/favicon.ico'));
}

Server.prototype.start = function () {
	this.httpServer.listen(this.app.get('port'));
	console.log('Server Started On Port : ' + this.app.get('port'));
	this.renderView();
	this.realTimeRoutes();
}

Server.prototype.renderView = function () {
	var self = this;
	self.app.get('/', function (req, res) {
		var key = self.generateKey();
		res.render('index', { game: 'creategame', key: key, baseurl: req.headers.host, pcolors: self.pcolors, buttonlabel: 'CREATE GAME' });
	});
	self.app.param('gamekey', function (req, res, next, gamekey) {
		req.gamekey = gamekey;
		next();
	});
	self.app.get('/:gamekey', function (req, res) {
		res.render('index', { game: 'joingame', key: req.gamekey, baseurl: req.headers.host, pcolors: self.pcolors, buttonlabel: 'JOIN GAME' });
	});
}

Server.prototype.createGrid = function () {
	var grid = [], i, j, k = 0;
	grid.push('<table class="grid" border="1">');
	for (i = 0; i < this.rows; i++) {
		grid.push('<tr>');
		for (j = 0; j < this.cols; j++) {
			grid.push('<td data-index="' + k + '" data-row-index="' + i + '" data-col-index="' + j + '"></td>');
			k++;
		}
		grid.push('</tr>');
	}
	grid.push('</table>');
	return grid;
}

Server.prototype.gridMatrix = function () {
	var i, j, k = 0, matrix = [];
	for (i = 0; i < this.rows; i++) {
		matrix[i] = [];
		for (j = 0; j < this.cols; j++) {
			matrix[i].push(k);
			k++;
		}
	}
	return matrix;
}

Server.prototype.gridSides = function () {
	var i, j, k = 0, sides = [];
	for (i = 0; i < this.rows; i++) {
		for (j = 0; j < this.cols; j++) {
			if (i == 0 && (j > 0 && j < parseInt(this.cols) - 1)) {
				sides.push(k);
			}
			if (i == parseInt(this.rows) - 1 && (j > 0 && j < parseInt(this.cols) - 1)) {
				sides.push(k);
			}
			if (j == 0 && (i > 0 && i < parseInt(this.rows) - 1)) {
				sides.push(k);
			}
			if (j == parseInt(this.cols) - 1 && (i > 0 && i < parseInt(this.rows) - 1)) {
				sides.push(k);
			}
			k++;
		}
	}
	return sides;
}

Server.prototype.realTimeRoutes = function () {
	var self = this;

	var grid = self.createGrid();
	grid = grid.join('');

	var matrix = self.gridMatrix();
	var sides = self.gridSides();

	this.io.on('connection', function (socket) {
		//Create Game Route
		socket.on('creategame', function (data) {
			console.log(data);
			socket.join(data.groom);
			self.playerscount[data.groom] = parseInt(data.playerscount);
			self.playersindex[data.groom] = 0;

			var playerdata = [data.urname, data.urcolor];

			if (Array.isArray(self.gamerooms[data.groom]) === false) {
				self.gamerooms[data.groom] = new Array(data.urname);
				self.roomplayersdata[data.groom] = new Array();
				self.roomplayersdata[data.groom].push(playerdata);
			} else {
				self.gamerooms[data.groom].push(data.urname);
				self.roomplayersdata[data.groom].push(playerdata);
			}

			// io.respond({ flag: 'join', grid: grid, matrix: matrix, sides: sides });
			socket.emit('respond', { type: 'creategame', flag: 'join', grid: grid, matrix: matrix, sides: sides });
		});

		socket.on('joingame', function (data) {
			if (self.gamerooms[data.groom] !== undefined) {
				var groomlen = self.gamerooms[data.groom].length;
				var playerindex = parseInt(self.playersindex[data.groom]) + 1;
				var playerdata = [data.urname, data.urcolor];

				if (playerindex < self.playerscount[data.groom]) {
					if (self.checkColorExistGRoom(data.urcolor, data.groom) == false) {
						socket.join(data.groom);
						self.playersindex[data.groom] = parseInt(self.playersindex[data.groom]) + 1
						if (Array.isArray(self.gamerooms[data.groom]) === false) {
							self.gamerooms[data.groom] = new Array(data.urname);
							self.roomplayersdata[data.groom] = new Array();
							self.roomplayersdata[data.groom].push(playerdata);
						} else {
							self.gamerooms[data.groom].push(data.urname);
							self.roomplayersdata[data.groom].push(playerdata);
						}

						// req.io.respond({ flag: 'join', grid: grid, matrix: matrix, sides: sides });
						socket.emit('respond', { type: 'joingame', flag: 'join', grid: grid, matrix: matrix, sides: sides });

						self.io.in(data.groom).emit('joined', {
							room: data.groom,
							pcount: self.gamerooms[data.groom].length,
							roomplayersdata: self.roomplayersdata[data.groom]
						});

						console.log(self.roomplayersdata[data.groom]);
					} else {
						// req.io.respond({ flag: 'colorexist' });
						socket.emit('respond', { type: 'joingame', flag: 'colorexist' });
						console.log('colorexist');
					}
				} else {
					// req.io.respond({ flag: 'roomfull' });
					socket.emit('respond', { type: 'joingame', flag: 'roomfull' });
					console.log('roomfull');
				}
			} else {
				// req.io.respond({ flag: 'notexist' });
				socket.emit('respond', { type: 'joingame', flag: 'notexist' });
				console.log('notexist');
			}
		});

		socket.on('move', function (data) {
			var moveindex = data.moveindex;
			var groom = data.groom;
			var name = data.name;
			var color = data.color;
			var nexturnname = data.nexturnname;
			var nexturncolor = data.nexturncolor;

			socket.broadcast.to(groom).emit('onmove', {
				name: name,
				color: color,
				nexturnname: nexturnname,
				nexturncolor: nexturncolor,
				moveindex: moveindex,
				groom: groom
			});
		});

		//Remove Game Room Route
		socket.on('removegame', function (data) {
			var groom = data.groom;
			self.gamerooms = self.removeGameRoom(self.gamerooms, groom);
			self.roomplayersdata = self.removeGameRoom(self.roomplayersdata, groom);
			console.log(self.gamerooms);
			console.log(self.roomplayersdata);
		});
	});


}

Server.prototype.removeGameRoom = function (arrayName, key) {
	var x;
	var tmpArray = new Array();
	for (x in arrayName) {
		if (x != key) {
			tmpArray[x] = arrayName[x];
		}
	}
	return tmpArray;
}

Server.prototype.checkNameExistGRoom = function (name, groom) {
	var self = this, i = 0, exist = false;
	do {
		if (self.gamerooms[groom][i] == name) {
			exist = true;
		}
		i++;
	} while (i < self.gamerooms[groom].length);
	return exist;
}

Server.prototype.checkColorExistGRoom = function (color, groom) {
	var self = this, i = 0, exist = false;
	do {
		if (self.roomplayersdata[groom][i][1] == color) {
			exist = true;
		}
		i++;
	} while (i < self.roomplayersdata[groom].length);
	return exist;
}

Server.prototype.generateKey = function () {
	var key = '';
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

	for (var i = 0; i < 6; i++)
		key += possible.charAt(Math.floor(Math.random() * possible.length));

	return key;
}

var server = new Server();
server.setConfiguration();
server.start();
