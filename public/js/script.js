var io = io.connect();

var ChainReaction = {
  body: document.querySelector('body'),
  game: 'creategame',
  gkey: '',
  baseurl: '',
  roomplayersdata: [],
  myturn: 'no',
  chainevent: null,
  eachturn: 0,
  wcheckflag: true,
  pcount: 0,
  matrix: [],
  sides: [],
  rows: 9,
  cols: 6,
  chaineventflag: true,
  expchainprocess: null,
  urname: '',
  urcolor: '',

  INIT: function () {
    this.connectServer();
    this.onRTRoutes();
    this.checkChainEventRegister();
    this.events();
    this.bindChainEvent();
  },

  connectServer: function () {
    this.game = this.body.getAttribute('data-game');
    this.gkey = this.body.getAttribute('data-game-key');
    this.baseurl = this.body.getAttribute('data-base-url');
    if (this.game == 'creategame') {
      this.createGame();
    } else {
      this.joinGame();
    }
  },

  createGame: function () {
    document.querySelector('.selectnplayers__section').style.display = 'block';
    document.querySelector('#joingameurl').value = 'http://' + this.baseurl + '/' + this.gkey;
  },

  joinGame: function () {
    document.querySelector('.selectnplayers__section').style.display = 'none';
    document.querySelector('.namecolor__section').style.display = 'block';
  },

  onRTRoutes: function () {
    var self = this;
    io.on('joined', function (data) {
      if (data.room == self.gkey) {
        self.roomplayersdata = data.roomplayersdata;
        self.pcount = data.pcount;

        li = [];
        for (var i = 0; i < self.roomplayersdata.length; i++) {
          pname = self.roomplayersdata[i][0];
          pcolor = self.roomplayersdata[i][1];
          if (self.urname == pname && self.urcolor == pcolor) {
            name = 'You';
          } else {
            name = self.roomplayersdata[i][0];
          }
          li.push(
            '<li class="mdl-button mdl-js-button mdl-button--raised mdl-button--accent" data-player="' +
            pcolor +
            '" data-player-name="' +
            pname +
            '">' +
            name +
            '<div class="ink"></div></li>'
          );
        }
        document.querySelector('.joinedplayers ul').innerHTML = li.join('');
      }
    });

    io.on('onmove', function (data) {
      console.log('DATA ON MOVE ',  data);
      name = data.name;
      color = data.color;
      groom = data.groom;
      moveindex = data.moveindex;
      nexturnname = data.nexturnname;
      nexturncolor = data.nexturncolor;

      cell = document.querySelector('td[data-index="' + moveindex + '"]');
      self.dot(cell, color, '');
      self.eachturn++;

      document.dispatchEvent(self.chainevent);

      setTimeout(function () {
        if (nexturnname == self.urname && nexturncolor == self.urcolor) {
          self.myturn = 'yes';
        }
        if (self.wcheckflag == true) {
          self.checkWhoTurn(nexturnname, nexturncolor);
        }
      }, 800);
    });

    io.on('respond', function (data) {
      if (data.type === 'creategame') {
        self.nplayers = data.nplayers;
        self.matrix = data.matrix;
        self.sides = data.sides;
        self.urname = localStorage.getItem('urname');
        self.urcolor = localStorage.getItem('urcolor');
        document.querySelector('.gridwrap .gridinner').innerHTML = data.grid;
        self.myturn = 'yes';
        self.loadPlayBoard();
        self.keepGridCellsData();
      } else if (data.type === 'joingame') {
        if (data.flag == 'join') {
          self.nplayers = data.nplayers;
          self.matrix = data.matrix;
          self.sides = data.sides;
          self.urname = localStorage.getItem('urname');
          self.urcolor = localStorage.getItem('urcolor');
          document.querySelector('.gridwrap .gridinner').innerHTML = data.grid;
          document.querySelector('.joingameurlfield').style.display = 'none';
          self.loadPlayBoard();
          self.keepGridCellsData();
        } else if (data.flag == 'roomfull') {
          alert('Sorry game room is full now !!!');
        } else if (data.flag == 'colorexist') {
          alert('Please select another color !!!');
        } else if (data.flag == 'notexist') {
          alert('Sorry this game room is not exist !!!');
        } else {
          alert('Server Error !!!');
        }
      }
    });
  },

  checkWhoTurn: function (nexturnname, nexturncolor) {
    var self = this;
    [].forEach.call(document.querySelectorAll('.joinedplayers li'), function (el) {
      el.querySelector('.ink').classList.remove('animateripple');
      if (el.getAttribute('data-player-name') == nexturnname && el.getAttribute('data-player') == nexturncolor) {
        el.querySelector('.ink').classList.add('animateripple');
      }
    });
  },

  loadPlayBoard: function () {
    var self = this;
    setTimeout(function () {
      document.querySelector('.namecolor__section').classList.add('animated', 'bounceOutLeft');
      document.querySelector('.playgame__section').classList.add('showsection', 'animated', 'bounceInRight');
      self.playMove();
    }, 500);
  },

  keepGridCellsData: function () {
    [].forEach.call(document.querySelectorAll('td'), function (el) {
      index = el.getAttribute('data-index');
      rowindex = el.getAttribute('data-row-index');
      colindex = el.getAttribute('data-col-index');
      el.cellindex = index;
      el.cellrowindex = rowindex;
      el.cellcolindex = colindex;
    });
  },

  bindChainEvent: function () {
    var self = this;
    document.addEventListener('checkingchain', self.checkChain, false);
  },

  checkChainEventRegister: function () {
    var self = this;
    if (window.CustomEvent) {
      this.chainevent = new CustomEvent('checkingchain', {
        detail: {
          crobject: self,
          time: new Date()
        },
        bubbles: true,
        cancelable: true
      });
    }
  },

  checkChain: function (e) {
    var self = e.detail.crobject;
    self.removePlayMove();
    [].forEach.call(document.querySelectorAll('td'), function (el) {
      dots_count = el.querySelectorAll('.dots').length;
      if (dots_count > 0) {
        self.explodeChain(el);
      }
    });

    if (self.wcheckflag === true) {
      self.checkWinner();
      self.playMove();
    }
  },

  checkWinner: function () {
    var self = this;
    if (self.eachturn > parseInt(self.pcount) - 1) {
      self.score();
    }
  },

  explodeChain: function (el) {
    var self = this;
    dots_count = el.querySelectorAll('.dots').length;
    if (dots_count > 0) {
      (chLIndex = 0), (chRIndex = 0);

      index = el.cellindex;
      rowIndex = el.cellrowindex;
      colIndex = el.cellcolindex;
      pturn = el.cellplayer;

      trow_index = parseInt(rowIndex) - 1;
      brow_index = parseInt(rowIndex) + 1;

      t_index = trow_index != -1 ? self.matrix[trow_index][colIndex] : -1;
      b_index = brow_index != -1 && brow_index <= self.rows - 1 ? self.matrix[brow_index][colIndex] : -1;

      l_index = parseInt(index) - 1;
      r_index = parseInt(index) + 1;

      if (parseInt(colIndex) - 1 > -1) {
        cindex = parseInt(colIndex) - 1;
        chLIndex = self.matrix[rowIndex][cindex];
      }
      if (parseInt(colIndex) + 1 <= parseInt(self.cols) - 1) {
        cindex = parseInt(colIndex) + 1;
        chRIndex = self.matrix[rowIndex][cindex];
      }

      l_index = chLIndex === l_index ? l_index : -1;
      r_index = chRIndex === r_index ? r_index : -1;

      topEl = t_index > -1 ? document.querySelector('td[data-index="' + t_index + '"]') : null;
      bottomEl = b_index > -1 ? document.querySelector('td[data-index="' + b_index + '"]') : null;

      leftEl = l_index > -1 ? document.querySelector('td[data-index="' + l_index + '"]') : null;
      rightEl = r_index > -1 ? document.querySelector('td[data-index="' + r_index + '"]') : null;

      topLeftCorner = self.matrix[0][0];
      bottomLeftCorner = self.matrix[self.rows - 1][0];
      topRightCorner = self.matrix[0][self.cols - 1];
      bottomRightCorner = self.matrix[self.rows - 1][self.cols - 1];

      explodeCount = 4;
      if (topLeftCorner == index || bottomLeftCorner == index || topRightCorner == index || bottomRightCorner == index) {
        explodeCount = 2;
      }

      if (self.sides.indexOf(parseInt(index)) !== -1) {
        explodeCount = 3;
      }

      if (dots_count >= explodeCount) {
        el.innerHTML = '';
        el.removeAttribute('data-player');
        el.cellplayer = null;

        if (topEl != null) {
          self.dot(topEl, pturn, ' top');
        }
        if (bottomEl != null) {
          self.dot(bottomEl, pturn, ' bottom');
        }
        if (leftEl != null && l_index > -1) {
          self.dot(leftEl, pturn, ' left');
        }
        if (rightEl != null && r_index > -1) {
          self.dot(rightEl, pturn, ' right');
        }

        if (self.wcheckflag == true) {
          setTimeout(function () {
            document.dispatchEvent(self.chainevent);
          }, 500);
        }
      }
    }
  },

  score: function () {
    var self = this,
      i = 0,
      j = 0,
      wmatrix = [];
    do {
      box = document.querySelector('td[data-index="' + i + '"]');
      if (box.cellplayer != null) {
        player = box.cellplayer;
        count = wmatrix[player] ? wmatrix[player] : 0;
        wmatrix[player] = count + 1;
      }
      i++;
    } while (i < this.rows * this.cols);

    winPlayer = [];

    do {
      pname = self.roomplayersdata[j][0];
      pcolor = self.roomplayersdata[j][1];
      if (wmatrix[pcolor]) {
        winPlayer.push(self.roomplayersdata[j]);
      }
      j++;
    } while (j < this.roomplayersdata.length);

    if (winPlayer.length == 1) {
      self.removePlayMove();

      winname = winPlayer[0][0];
      wincolor = winPlayer[0][1];
      winnername = winPlayer[0][0];

      self.checkWhoTurn('', '');
      setTimeout(function () {
        if (winname == self.urname && wincolor == self.urcolor) {
          winnername = 'you';
        }
        winnername = winnername.toUpperCase();

        [].forEach.call(document.querySelectorAll('.joinedplayers li'), function (el) {
          if (el.getAttribute('data-player-name') == winname && el.getAttribute('data-player') == wincolor) {
            el.innerHTML = winnername + ' WON !!!';
          }
        });

        document.querySelector('.gamecompleteoverlay').style.display = 'block';

        // Remove Game Room
        if (self.game == 'creategame') {
          io.emit('removegame', { groom: self.gkey });
        }
      }, 1000);
      self.wcheckflag = false;
    }
  },

  events: function () {
    var self = this;

    // Select Number of Players
    [].forEach.call(document.querySelectorAll('li.menuitem'), function (item) {
      item.addEventListener('click', function (e) {
        playercount = item.getAttribute('data-players');
        label = item.querySelector('label').innerHTML;
        document.querySelector('.selectnplayers .text').innerHTML = label;
        localStorage.setItem('playerscount', playercount);

        setTimeout(function () {
          document.querySelector('.selectnplayers__section').classList.add('animated', 'bounceOutLeft');
          document.querySelector('.namecolor__section').classList.add('showsection', 'animated', 'bounceInRight');
        }, 500);
      });
    });

    // Select Color
    [].forEach.call(document.querySelectorAll('li.coloritem'), function (item) {
      item.addEventListener('click', function (e) {
        color = item.getAttribute('data-color');
        label = item.querySelector('label').innerHTML;
        document.querySelector('.selectcolor .text').innerHTML = label;
        document.querySelector('.selectcolor').style.backgroundColor = color;
        document.querySelector('.selectcolor').classList.add('selectedcolor');
        localStorage.setItem('urcolor', color);
        document.querySelector('#urcolor').value = color;
      });
    });

    // Enter Your Name
    document.querySelector('#startgamebutton').addEventListener('click', function (e) {
      document.querySelector('.nonameerror').style.visibility = 'hidden';
      document.querySelector('.nocolorerror').style.visibility = 'hidden';

      urname = document.querySelector('#urname').value;
      urname = urname.replace(/\s/g, '');
      urname = urname.toLowerCase();

      urcolor = document.querySelector('#urcolor').value;

      if (urname != '' && urcolor != '') {
        localStorage.setItem('urname', urname);
        if (self.game == 'creategame') {
          playerscount = localStorage.getItem('playerscount');
          io.emit('creategame', { groom: self.gkey, urname: urname, urcolor: urcolor, playerscount: playerscount }, function (data) {
            self.nplayers = data.nplayers;
            self.matrix = data.matrix;
            self.sides = data.sides;
            self.urname = localStorage.getItem('urname');
            self.urcolor = localStorage.getItem('urcolor');
            document.querySelector('.gridwrap .gridinner').innerHTML = data.grid;
            self.myturn = 'yes';
            self.loadPlayBoard();
            self.keepGridCellsData();
          });
        } else {
          io.emit('joingame', { groom: self.gkey, urname: urname, urcolor: urcolor }, function (data) {
            if (data.flag == 'join') {
              self.nplayers = data.nplayers;
              self.matrix = data.matrix;
              self.sides = data.sides;
              self.urname = localStorage.getItem('urname');
              self.urcolor = localStorage.getItem('urcolor');
              document.querySelector('.gridwrap .gridinner').innerHTML = data.grid;
              document.querySelector('.joingameurlfield').style.display = 'none';
              self.loadPlayBoard();
              self.keepGridCellsData();
            } else if (data.flag == 'roomfull') {
              alert('Sorry game room is full now !!!');
            } else if (data.flag == 'colorexist') {
              alert('Please select another color !!!');
            } else if (data.flag == 'notexist') {
              alert('Sorry this game room is not exist !!!');
            } else {
              alert('Server Error !!!');
            }
          });
        }
      } else {
        if (urname == '') {
          document.querySelector('.nonameerror').style.visibility = 'visible';
        }
        if (urcolor == '') {
          document.querySelector('.nocolorerror').style.visibility = 'visible';
        }
      }
    });
  },

  removePlayMove: function () {
    var self = this;
    [].forEach.call(document.querySelectorAll('td'), function (cell) {
      cell.removeEventListener(
        'click',
        function (e) {
          self.moveListener(cell);
        },
        false
      );
    });
  },

  playMove: function () {
    var self = this;
    [].forEach.call(document.querySelectorAll('td'), function (cell) {
      cell.addEventListener(
        'click',
        function (e) {
          self.moveListener(cell);
        },
        false
      );
    });
  },

  moveListener: function (cell) {
    var self = this;
    cellplayer = cell.cellplayer;
    urcolor = localStorage.getItem('urcolor');
    if (self.myturn == 'yes' && (cellplayer == null || cellplayer == urcolor)) {
      moveindex = cell.cellindex;
      name = localStorage.getItem('urname');
      self.dot(cell, urcolor, '');
      nexturnindex = self.findPlayerIndex(self.urcolor) + 1;
      nexturnindex = nexturnindex < self.roomplayersdata.length ? nexturnindex : 0;
      nexturnname = self.roomplayersdata[nexturnindex][0];
      nexturncolor = self.roomplayersdata[nexturnindex][1];
      io.emit('move', {
        groom: self.gkey,
        moveindex: moveindex,
        name: name,
        color: urcolor,
        nexturnname: nexturnname,
        nexturncolor: nexturncolor
      });
      self.myturn = 'no';
      self.eachturn++;
      self.checkWhoTurn(nexturnname, nexturncolor);
      document.dispatchEvent(self.chainevent);
    }
  },

  dot: function (cell, color, direction) {
    cell.setAttribute('data-player', color);
    cell.cellplayer = color;
    cell.insertAdjacentHTML('beforeend', '<i class="dots' + direction + '"></i>');
  },

  findPlayerIndex: function (color) {
    var self = this,
      j = 0,
      playersdata = self.roomplayersdata,
      pindex = -1;
      console.log(playersdata);
    if (playersdata.length > 0) {
      do {
        if (playersdata[j][1] == color) {
          pindex = j;
        }
        j++;
      } while (j < self.roomplayersdata.length);
    }
    return pindex;
  }
};

ChainReaction.INIT();
