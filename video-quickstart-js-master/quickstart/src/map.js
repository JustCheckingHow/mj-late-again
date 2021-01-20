class BoundingBoxManager {
    constructor(canvasWidth, canvasHeight, drawBBox) {
        this.drawBBox = drawBBox;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        var aspect = canvasWidth / canvasHeight
        this.offsetStart = [50, 50 / aspect];
        this.sizeStart = [this.canvasWidth / 2, this.canvasHeight / 2];

        this.offset = [...this.offsetStart];
        this.size = [...this.sizeStart];

        if (this.drawBBox)
            this.DrawBBox();
    }

    DrawBBox() {
        this.bounds = new paper.Shape.Rectangle(this.offset[0], this.offset[1], this.size[0], this.size[1]);
        this.bounds.fillColor = "#00eeff";
        this.bounds.view.draw();
    }

    Rescale(x, y) {
        var factX = x / this.canvasWidth;
        var factY = y / this.canvasHeight;
        console.log(this.offset, this.offsetStart);
        console.log(this.size, this.sizeStart);

        this.offset[0] = this.offsetStart[0] * factX;
        this.offset[1] = this.offsetStart[1] * factY;

        this.size[0] = this.sizeStart[0] * factX;
        this.size[1] = this.sizeStart[1] * factY;

        if (this.drawBBox) {
            this.bounds.size = [...this.size];
            this.bounds.position = [this.offset[0] * 2, this.offset[1] * 2];

            this.bounds.view.draw();
        }
    }

    GetBounds(off, axis) {
        // if(axis==0){
        //     console.log("X-offset: ", off, this.offset[1] + this.size[1]);
        //     console.log(off > this.offset[1] + this.size[1]);
        // }
        // Left or upper bound
        if (off < this.offset[axis]) {
            return this.offset[axis];
        }

        // Right or lower bound
        if (off > this.size[axis] + this.offset[axis]){
            // console.log("lol");
            return this.size[axis] + this.offset[axis];
        }

        return off;
    }
}

class BoardMap {
    constructor(offset, w, draw_bbox) {
        this.bboxManager = new BoundingBoxManager(w[0], w[1], true);

        this.offset = [50, 50];

        this.participants = new Map();

        this.body = new paper.Raster("img/blueprint-paper.jpg");
        this.body.position = new paper.Point(this.offset[0], this.offset[1]);
        this.body.view.draw();

        var canvas = document.getElementById('canvas');

        console.log(canvas.width);

        this.spawnLocation = [-100, -100];
    }

    Rescale(x, y) {
        console.log("Rescaling!");
        console.log(x);
        console.log(y);

        this.bboxManager.Rescale(x, y);
    }

    GetBounds(off, axis) {
        return this.bboxManager.GetBounds(off, axis);
    }

    AddParticipant(name) {
        if (name != room.localParticipant.identity) {
            var partip = new Participant(this.spawnLocation[0], this.spawnLocation[1], name);
            this.participants.set(name, partip);
            this.body.sendToBack();
        }
    }

    AddOffset(val, axis) {
        console.log("Offset: ", val, axis);
        this.offset[axis] += val;
    }

    ReceiveUpdate(name, posX, posY) {
        this.participants.get(name).globalPos[0] = posX;
        this.participants.get(name).globalPos[1] = posY;
    }

    Update() {
        for (var [key, value] of this.participants) {
            value.repr.position = new paper.Point(map.offset[0] + value.globalPos[0], map.offset[1] + value.globalPos[1]);
        }
        this.body.position = new paper.Point(this.offset[0], this.offset[1]);
    }
}

class Participant {
    constructor(posX, posY, name) {
        console.log("Create participant: " + name);
        this.globalPos = [posX, posY];
        this.name = name;

        var group = new paper.Group();

        var identityText = new paper.PointText(0, 80);
        identityText.content = name;
        identityText.style = {
            fontWeight: 'bold',
            fontSize: 20,
            fillColor: '#F2F2F2',
            justification: 'center',
        }
        var rect = new paper.Path.Rectangle(identityText.bounds);
        rect.fillColor = 'black';
        rect.fillColor.alpha = 0.6;
        identityText.insertAbove(rect);

        var path = new paper.Path.Circle(new paper.Point(0, 0), 40);
        const color = stringToColor(name)
        path.fillColor = new paper.Color(color.r, color.g, color.b);
        path.strokeColor = 'black';
        path.strokeWidth = 5;

        group.addChild(path);
        group.addChild(rect);
        group.addChild(identityText);
        group.view.draw();

        this.repr = group;
    }
    Destroy() {
        this.repr.remove();
    }
}

class Player {
    KEY_UP = 38
    KEY_DOWN = 40
    KEY_LEFT = 37
    KEY_RIGHT = 39

    constructor(map, identity) {
        this.identity = identity;

        const color = stringToColor(identity)

        var group = new paper.Group();
        var path = new paper.Path.Circle(new paper.Point(0, 0), 40);
        path.strokeColor = 'black';
        path.strokeWidth = 5;
        path.fillColor = new paper.Color(color.r, color.g, color.b)

        var identityText = new paper.PointText(0, 80);
        identityText.content = identity;
        identityText.style = {
            fontWeight: 'bold',
            fontSize: 20,
            fillColor: '#F2F2F2',
            justification: 'center',
        }
        var rect = new paper.Path.Rectangle(identityText.bounds);
        rect.fillColor = 'black';
        rect.fillColor.alpha = 0.6;
        identityText.insertAbove(rect);

        group.addChild(rect);
        group.addChild(path);
        group.addChild(identityText);
        group.view.draw();

        this.repr = group;
        this.map = map;

        this.localX = 0;
        this.localY = 0;
        this.globalX = this.map.spawnLocation[0];
        this.globalY = this.map.spawnLocation[1];

        this.d = {};
        this.velocity = 10;
    }

    newv(n, a, b) {
        if (this.d[a])
            n -= this.velocity;
        if (this.d[b])
            n += this.velocity;

        return n
    }

    // Add velocity if user presses a key
    AddVelocity() {
        var currentPosX = Math.floor(this.localX, 10);
        var currentPosY = Math.floor(this.localY, 10);

        var toCheck = [this.KEY_DOWN, this.KEY_UP, this.KEY_LEFT, this.KEY_RIGHT];
        var axis = [1, 1, 0, 0];
        var sign = [1, -1, -1, 1];
        var movement = [0, 0];

        for(var i=0; i<4; i++){
            var button = toCheck[i];
            var ax = axis[i];
            
            if(this.d[button])
                movement[ax] += sign[i]*this.velocity;            
        }
        console.log(movement);

        var newX = Math.floor(this.map.GetBounds(this.localX + movement[0], 0));
        var newY = Math.floor(this.map.GetBounds(this.localY + movement[1], 1));

        if(newX == currentPosX) {
            this.map.AddOffset(-movement[0], 0);
        }
        if(newY == currentPosY)
            this.map.AddOffset(-movement[1], 1);

        this.localX = newX;
        this.localY = newY;
    }

    Move(tick) {
        this.AddVelocity();
        this.globalX = - this.map.offset[0] + this.localX;
        this.globalY = - this.map.offset[1] + this.localY;

        this.repr.position = new paper.Point(this.localX, this.localY);

        // if (tick % 10 == 0) {
        if (typeof window.localDataTrack != 'undefined') {
            window.localDataTrack.send(JSON.stringify({
                x: this.globalX,
                y: this.globalY
            }));
        }
        // }
    }
}


// ======================== UTILITIES ========================

function stringToColor(user) {
    return HSLToRGB((xmur3(user)() % 100) / 100, 0.7, 0.7)
}

function xmur3(str) {
    for (var i = 0, h = 1779033703 ^ str.length; i < str.length; i++)
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353),
            h = h << 13 | h >>> 19;
    return function () {
        h = Math.imul(h ^ h >>> 16, 2246822507);
        h = Math.imul(h ^ h >>> 13, 3266489909);
        return (h ^= h >>> 16) >>> 0;
    }
}

function HSLToRGB(h, s, v) {

    var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return { r, g, b }
}


exports.Player = Player;
exports.Participant = Participant;
exports.BoardMap = BoardMap;
exports.stringToColor = stringToColor;