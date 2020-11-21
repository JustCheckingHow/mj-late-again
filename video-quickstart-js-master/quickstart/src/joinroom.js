'use strict';

const { connect, createLocalVideoTrack } = require('twilio-video');
const { isMobile } = require('./browser');

const $leave = $('#leave-room');
const $room = $('#room');
const $activeParticipant = $('div#active-participant > div.participant.main', $room);
const $activeVideo = $('video', $activeParticipant);
const $participants = $('div#participants', $room);

// The current active Participant in the Room.
let activeParticipant = null;

// Whether the user has selected the active Participant by clicking on
// one of the video thumbnails.
let isActiveParticipantPinned = false;

/**
 * Set the active Participant's video.
 * @param participant - the active Participant
 */
paper.Raster.prototype.rescale = function (width, height) {
  this.scale(width / this.width, height / this.height);
};

let player, map, bounds;

class BoardMap {
  constructor(offset, w, draw_bbox) {
    this.offset = [50, 50];
    this.boundsOffset = [parseInt(offset), parseInt(offset)];
    this.w = [parseInt(w), parseInt(w * 2 / 3)];
    this.participants = new Map();

    this.body = new paper.Raster("img/blueprint-paper.jpg");
    this.body.position = new paper.Point(this.offset[0], this.offset[1]);
    this.body.view.draw();
  }

  GetBounds(off, axis) {
    if (off < this.boundsOffset[axis]) {
      return this.boundsOffset[axis];
    }
    if (off > this.w[axis] + this.boundsOffset[axis])
      return this.w[axis] + this.boundsOffset[axis];

    return off;
  }

  AddParticipant(name) {
    if (typeof name != "undefined") {
      var partip = new Participant(50, 50, name);
      this.participants.set(name, partip);
      this.body.sendToBack();
    }
  }

  AddOffset(val, axis) {
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

class Player {
  constructor(map, identity) {
    this.identity = identity;

    var group = new paper.Group();
    var identityText = new paper.PointText();
    identityText.content = identity;

    var path = new paper.Path.Circle(new paper.Point(150, 150), 40);
    const color = stringToColor(identity)
    path.fillColor = new paper.Color(color.r, color.g, color.b)

    group.addChild(identityText);
    group.addChild(path);
    group.view.draw();

    this.repr = group;
    this.map = map;

    this.localX = 0;
    this.localY = 0;
    this.globalX = 0;
    this.globalY = 0;

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

  AddVelocity(val, dir) {
    val = parseInt(val, 10);
    if (dir == 0) {
      var off = this.newv(val, 37, 39);
      var newX = this.map.GetBounds(off, dir);
      if (newX == val)
        this.map.AddOffset(val - off, 0);

      this.localX = newX;
    }
    if (dir == 1) {
      var off = this.newv(val, 38, 40);
      var newY = this.map.GetBounds(off, dir);
      if (newY == val)
        this.map.AddOffset(val - off, 1);

      this.localY = newY;
    }
  }

  Move(tick) {
    this.AddVelocity(this.localX, 0);
    this.AddVelocity(this.localY, 1);
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

class Participant {
  constructor(posX, posY, name) {
    console.log("Create participant: " + name);
    this.globalPos = [posX, posY];
    this.name = name;

    var identityText = new paper.PointText();
    identityText.content = name;

    var path = new paper.Path.Circle(new paper.Point(posX, posY), 40);
    var group = new paper.Group();
    const color = stringToColor(name)
    path.fillColor = new paper.Color(color.r, color.g, color.b)
    group.addChild(path);
    group.addChild(identityText);
    group.view.draw();
    
    this.repr = group;
  }
}

// var w = (1800 - 128) / 3,
//   offset = w / 3 * 2;
function setupCanvas(room) {
  var canvas = document.getElementById('canvas');
  var w = (canvas.width - 128) * 2;
  var offset = canvas.width;

  paper.setup(canvas);
  map = new BoardMap(offset, w, true);
  player = new Player(map, room.localParticipant.identity);

  $(window).keydown(function (e) { player.d[e.which] = true; });
  $(window).keyup(function (e) { player.d[e.which] = false; });

  // map.AddParticipant(new Participant(300, 300));
  // map.AddParticipant(new Participant(400, 150));
  // map.AddParticipant(new Participant(800, 600));

  window.map = map;

  function onFrame(event) {
    if (event.count % 2 == 0) {
      map.Update(event.count);
      player.Move();
    }
  }
  paper.view.onFrame = onFrame;
}

function setActiveParticipant(participant) {
  if (activeParticipant) {
    const $activeParticipant = $(`div#${activeParticipant.sid}`, $participants);
    $activeParticipant.removeClass('active');
    $activeParticipant.removeClass('pinned');

    // Detach any existing VideoTrack of the active Participant.
    const { track: activeTrack } = Array.from(activeParticipant.videoTracks.values())[0] || {};
    if (activeTrack) {
      activeTrack.detach($activeVideo.get(0));
      $activeVideo.css('opacity', '0');
    }
  }

  // Set the new active Participant.
  activeParticipant = participant;
  const { identity, sid } = participant;
  const $participant = $(`div#${sid}`, $participants);

  $participant.addClass('active');
  if (isActiveParticipantPinned) {
    $participant.addClass('pinned');
  }

  // Attach the new active Participant's video.
  const { track } = Array.from(participant.videoTracks.values())[0] || {};
  if (track) {
    track.attach($activeVideo.get(0));
    $activeVideo.css('opacity', '');
  }

  // Set the new active Participant's identity
  $activeParticipant.attr('data-identity', identity);
}

/**
 * Set the current active Participant in the Room.
 * @param room - the Room which contains the current active Participant
 */
function setCurrentActiveParticipant(room) {
  // const { dominantSpeaker, localParticipant } = room;
  // setActiveParticipant(dominantSpeaker || localParticipant);

}

/**
 * Set up the Participant's media container.
 * @param participant - the Participant whose media container is to be set up
 * @param room - the Room that the Participant joined
 */
function setupParticipantContainer(participant, room) {
  const { identity, sid } = participant;

  // Add a container for the Participant's media.
  const $container = $(`<div class="participant" data-identity="${identity}" id="${sid}" style="outline: 4px solid ${RGBToString(stringToColor(identity))}">
    <audio autoplay ${participant === room.localParticipant ? 'muted' : ''} style="opacity: 0"></audio>
    <video autoplay muted playsinline style="opacity: 0"></video>
  </div>`);

  // Toggle the pinning of the active Participant's video.
  // $container.on('click', () => {
  //   if (activeParticipant === participant && isActiveParticipantPinned) {
  //     // Unpin the RemoteParticipant and update the current active Participant.
  //     setVideoPriority(participant, null);
  //     isActiveParticipantPinned = false;
  //     setCurrentActiveParticipant(room);
  //   } else {
  //     // Pin the RemoteParticipant as the active Participant.
  //     if (isActiveParticipantPinned) {
  //       setVideoPriority(activeParticipant, null);
  //     }
  //     setVideoPriority(participant, 'high');
  //     isActiveParticipantPinned = true;
  //     setActiveParticipant(participant);
  //   }
  // });

  // Add the Participant's container to the DOM.
  $participants.append($container);

}

/**
 * Set the VideoTrack priority for the given RemoteParticipant. This has no
 * effect in Peer-to-Peer Rooms.
 * @param participant - the RemoteParticipant whose VideoTrack priority is to be set
 * @param priority - null | 'low' | 'standard' | 'high'
 */
function setVideoPriority(participant, priority) {
  participant.videoTracks.forEach(publication => {
    const track = publication.track;
    if (track && track.setPriority) {
      track.setPriority(priority);
    }
  });
}

/**
 * Attach a Track to the DOM.
 * @param track - the Track to attach
 * @param participant - the Participant which published the Track
 */
function attachTrack(track, participant) {
  // Attach the Participant's Track to the thumbnail.
  const $media = $(`div#${participant.sid} > ${track.kind}`, $participants);
  $media.css('opacity', '');

  if (track.kind === 'data') {
    track.on('message', function (message) {
      console.log([participant.identity, message])
      const position = JSON.parse(message)
      let localAudioTrack = Array.from(room.localParticipant.audioTracks.values())[0].track;
      const $media = $(`div#${participant.sid} > ${localAudioTrack.kind}`, $participants);
      const channel = $media.get(0);
      if (position.x < 400) {
        channel.muted = true;
        $("#" + participant.sid).hide()
      } else {
        channel.muted = false;
        $("#" + participant.sid).show()
      }

      map.ReceiveUpdate(participant.identity, position.x, position.y);
    })
  } else {
    track.attach($media.get(0));
  }


  // If the attached Track is a VideoTrack that is published by the active
  // Participant, then attach it to the main video as well.
  if (track.kind === 'video' && participant === activeParticipant) {
    track.attach($activeVideo.get(0));
    $activeVideo.css('opacity', '');
  }
}

/**
 * Detach a Track from the DOM.
 * @param track - the Track to be detached
 * @param participant - the Participant that is publishing the Track
 */
function detachTrack(track, participant) {
  // Detach the Participant's Track from the thumbnail.
  const $media = $(`div#${participant.sid} > ${track.kind}`, $participants);
  $media.css('opacity', '0');
  track.detach($media.get(0));

  // If the detached Track is a VideoTrack that is published by the active
  // Participant, then detach it from the main video as well.
  if (track.kind === 'video' && participant === activeParticipant) {
    track.detach($activeVideo.get(0));
    $activeVideo.css('opacity', '0');
  }
}

/**
 * Handle the Participant's media.
 * @param participant - the Participant
 * @param room - the Room that the Participant joined
 */
function participantConnected(participant, room) {
  // Set up the Participant's media container.
  setupParticipantContainer(participant, room);

  // Handle the TrackPublications already published by the Participant.
  participant.tracks.forEach(publication => {
    trackPublished(publication, participant);
  });

  // Handle theTrackPublications that will be published by the Participant later.
  participant.on('trackPublished', publication => {
    trackPublished(publication, participant);
  });

  map.AddParticipant(participant.identity);
}

/**
 * Handle a disconnected Participant.
 * @param participant - the disconnected Participant
 * @param room - the Room that the Participant disconnected from
 */
function participantDisconnected(participant, room) {
  // If the disconnected Participant was pinned as the active Participant, then
  // unpin it so that the active Participant can be updated.
  if (activeParticipant === participant && isActiveParticipantPinned) {
    isActiveParticipantPinned = false;
    setCurrentActiveParticipant(room);
  }

  // Remove the Participant's media container.
  $(`div#${participant.sid}`, $participants).remove();
}

/**
 * Handle to the TrackPublication's media.
 * @param publication - the TrackPublication
 * @param participant - the publishing Participant
 */
function trackPublished(publication, participant) {
  // If the TrackPublication is already subscribed to, then attach the Track to the DOM.
  if (publication.track) {
    attachTrack(publication.track, participant);
  }

  // Once the TrackPublication is subscribed to, attach the Track to the DOM.
  publication.on('subscribed', track => {
    attachTrack(track, participant);
  });

  // Once the TrackPublication is unsubscribed from, detach the Track from the DOM.
  publication.on('unsubscribed', track => {
    detachTrack(track, participant);
  });
}

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

function RGBToString(color) {
  return "rgb(" + Math.round(color.r * 255) + "," + Math.round(color.g * 255) + "," + Math.round(color.b * 255) + ")";
}



/**
 * Join a Room.
 * @param token - the AccessToken used to join a Room
 * @param connectOptions - the ConnectOptions used to join a Room
 */
async function joinRoom(token, connectOptions, localDataTrack) {
  // Join to the Room with the given AccessToken and ConnectOptions.
  window.localDataTrack = localDataTrack;

  const room = await connect(token, connectOptions);

  // Save the LocalVideoTrack.
  let localVideoTrack = Array.from(room.localParticipant.videoTracks.values())[0].track;

  // window.addEventListener('mousemove', function(e) {
  //   localDataTrack.send(JSON.stringify({
  //     x: e.clientX,
  //     y: e.clientY
  //   }));
  // });

  // Make the Room available in the JavaScript console for debugging.
  window.room = room;
  setupCanvas(room);

  // Handle the LocalParticipant's media.
  participantConnected(room.localParticipant, room);

  // Subscribe to the media published by RemoteParticipants already in the Room.
  room.participants.forEach(participant => {
    participantConnected(participant, room);
  });

  // Subscribe to the media published by RemoteParticipants joining the Room later.
  room.on('participantConnected', participant => {
    participantConnected(participant, room);
  });

  // Handle a disconnected RemoteParticipant.
  room.on('participantDisconnected', participant => {
    participantDisconnected(participant, room);
  });

  // Set the current active Participant.
  setCurrentActiveParticipant(room);

  // // Update the active Participant when changed, only if the user has not
  // // pinned any particular Participant as the active Participant.
  // room.on('dominantSpeakerChanged', () => {
  //   if (!isActiveParticipantPinned) {
  //     setCurrentActiveParticipant(room);
  //   }
  // });

  // Leave the Room when the "Leave Room" button is clicked.
  $leave.click(function onLeave() {
    $leave.off('click', onLeave);
    room.disconnect();
  });

  return new Promise((resolve, reject) => {
    // Leave the Room when the "beforeunload" event is fired.
    window.onbeforeunload = () => {
      room.disconnect();
    };

    if (isMobile) {
      // TODO(mmalavalli): investigate why "pagehide" is not working in iOS Safari.
      // In iOS Safari, "beforeunload" is not fired, so use "pagehide" instead.
      window.onpagehide = () => {
        room.disconnect();
      };

      // On mobile browsers, use "visibilitychange" event to determine when
      // the app is backgrounded or foregrounded.
      document.onvisibilitychange = async () => {
        if (document.visibilityState === 'hidden') {
          // When the app is backgrounded, your app can no longer capture
          // video frames. So, stop and unpublish the LocalVideoTrack.
          localVideoTrack.stop();
          room.localParticipant.unpublishTrack(localVideoTrack);
        } else {
          // When the app is foregrounded, your app can now continue to
          // capture video frames. So, publish a new LocalVideoTrack.
          localVideoTrack = await createLocalVideoTrack(connectOptions.video);
          await room.localParticipant.publishTrack(localVideoTrack);
        }
      };
    }

    room.once('disconnected', (room, error) => {
      // Clear the event handlers on document and window..
      window.onbeforeunload = null;
      if (isMobile) {
        window.onpagehide = null;
        document.onvisibilitychange = null;
      }

      // Stop the LocalVideoTrack.
      localVideoTrack.stop();

      // Handle the disconnected LocalParticipant.
      participantDisconnected(room.localParticipant, room);

      // Handle the disconnected RemoteParticipants.
      room.participants.forEach(participant => {
        participantDisconnected(participant, room);
      });

      // Clear the active Participant's video.
      $activeVideo.get(0).srcObject = null;

      // Clear the Room reference used for debugging from the JavaScript console.
      window.room = null;

      if (error) {
        // Reject the Promise with the TwilioError so that the Room selection
        // modal (plus the TwilioError message) can be displayed.
        reject(error);
      } else {
        // Resolve the Promise so that the Room selection modal can be
        // displayed.
        resolve();
      }
    });
  });
}

module.exports = joinRoom;
