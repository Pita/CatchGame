/*
 * Copyright 2011 Primary Technology Ltd
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var session2room = {};
var room2sessions = {};

var socketio;

//Saves the values of all rooms
//key is the wallNum, values are globalvars and users, both objects
var rooms = {};

/**
 * Sets the socketio. This function is needed to initalize the MessageHandler
 */
exports.setSocketIO = function(socket_io)
{
  socketio=socket_io;
}

/**
 * Handles the connect of a client
 */
exports.handleConnect = function(client)
{
  //empty
}

/**
 * Handles the disconnect of a client
 */
exports.handleDisconnect = function(client)
{
  var room = session2room[client.sessionId];
  
  //if the session was releated to a room
  if(room != null)
  {
    onGameDisconnect(client);
  
    //destroy the session2room relation
    delete session2room[client.sessionId];
  
    //destroy the room2sessions relation
    for(i in room2sessions[room])
    {
      if(room2sessions[room][i] == client.sessionId)
      {
        room2sessions[room].splice(i,1);
        break;
      }
    }
  }
}

/**
 * Handles the message of a Client
 */
exports.handleMessage = function(client, message)
{
  console.log({"message": message});
   
  //If its a string, its a message of the old style, we kept them to save time 
  if(typeof message == "string")
  {
    onGameMessage(client, message);
  } 
  //Else its a message of the new style, with type and data
  else
  {
    if(message.type == null)
    {
      throw "Message have no type";
    }
    if(message.data == null)
    {
      throw "Message have no data";
    }
    
    if(message.type == "ping")
    {
      handlePing(client, message);
    }
    else if(message.type == "handshake")
    {
      handleHandshake(client, message);
    }
    else if(message.type == "requestRoom")
    {
      handleRequestRoom(client, message);
    }
    else
    {
      throw "Unkown type of Message '" + message.type + "'";
    }
  } 
}

/**
  * Handles a Ping and send a pingback to the client
  */
function handlePing(client, message)
{
  client.send({type:"pingback", data: message.data});
}

/**
  * Handles a handshake. A handshake is needed to save the relation between a session and a room
  */
function handleHandshake(client, message)
{
  if(message.data.roomNum == null)
  {
    throw "Handshake have no roomNum";
  }
  
  /*var roomNumber = Number(message.data.roomNum);
  if(roomNumber < 10000 || roomNumber > 50000)
  {
    throw "'" + roomNumber + "' is no valid roomNum";
  }*/
  
  //Save the relation between room and session
  session2room[client.sessionId] = message.data.roomNum;
  if(room2sessions[message.data.roomNum] == null)
  {
    room2sessions[message.data.roomNum] = [];
  }
  room2sessions[message.data.roomNum].push(client.sessionId);
  
  //If there is no data for this room, create empty objects
  if(rooms[message.data.roomNum] == null)
    rooms[message.data.roomNum] = {globalvars:[], users:[]};
  
  onGameConnect(client);
}

/**
  * Handles the Request for a Room. This Message is send from connection.html after it knows the latency.
  */
function handleRequestRoom(client, message)
{
  //check if all ok
  if(message.data.latency == null)
  {
    throw "RequestRoom have no Latency";
  }
  
  var clientLatency = Number(message.data.latency);
  if(clientLatency < 0 || clientLatency > 100)
  {
    throw "Latency '" + clientLatency + "' is invalid";
  }
  
  //find out with which room category we have.
  //all rooms from 10000-19999 are detecated to clients with latency < 20 and so on...
  var room;
  if(clientLatency < 20)
  {
    room=10000;
  }
  else if(clientLatency < 40)
  {
    room = 20000;
  }
  else if(clientLatency < 60)
  {
    room = 30000;
  }
  else if(clientLatency < 80)
  {
    room = 40000;
  }
  else
  {
    room = 50000;
  }
  
  //search for a room that have less than 10 users
  var roomFound = false;
  while(!roomFound)
  {
    //check if this room exist, if not, create it
    if(room2sessions[room] == null)
    {
      room2sessions[room] = [];
    }
    
    //Have this room less than 10 users, if yes, take it :)
    if(room2sessions[room].length < 10)
    {
      roomFound=true;
    }
    //no? try the next one
    else
    {
      room++;
    }
  }
  
  client.send({"type":"responseRoom","data":{"roomNum":room}});
}

/**
  * Broadcast the Message to all Clients in the room of 'client'
  */
function broadcast2room(client, message)
{
  //Whats the session of this client?
  var room = session2room[client.sessionId];
  
  //If there is a session to this room, send the message to all sessions in this room
  if(room != null)
  {
    for(i in room2sessions[room])
    {
      if(room2sessions[room][i] != client.sessionId)
      {
        socketio.clients[room2sessions[room][i]].send(message);
      }
    }
  }
  else
  {
    throw "There is no session of this client available";
  }
}

/*******************
**GAME FUNCTIONS****
*******************/

/**
  * Copied from the old source code, sends the inital values to the new client
  */
function onGameConnect(client)
{
  //client.broadcast({ announcement: client.sessionId + ' connected' });
  //broadcast that a new clients connected
  broadcast2room(client, {
    announcement: client.sessionId + ' connected'
  });

  //on which room we are?
  var roomNum = session2room[client.sessionId];

  //Create a Buffer that will be filled with the initalized vars
  var buffer = [];

  //Tell the user which userid it have
  buffer.push(
  {
    userid: client.sessionId
  });

  var timeSinceLastBreak = Math.round(new Date().getTime() - lastGameBreak);

  if(timeSinceLastBreak < 10)
  {
    buffer.push({break:timeSinceLastBreak});
  }

  //Loop trough all users of this room and add the last messages of this this user to the buffer
  for (i = 0; i < rooms[roomNum].users.length; i++)
  {
    //Add the connect announcement 
    buffer.push(
    {
      announcement: rooms[roomNum].users[i].sessionId + ' connected'
    });

    //Add all value messages of this user
    for (var value in rooms[roomNum].users[i])
    {
      if (value != "sessionId" && rooms[roomNum].users[i][value] != null && rooms[roomNum].users[i][value].message) 
        buffer.push(rooms[roomNum].users[i][value]);
    }
  }

  //Add yourself to the users array
  rooms[roomNum].users.push(
  {
    sessionId: client.sessionId
  });
  ensureThereIsACatcher(client);

  //Add all globalVars to the Buffer
  for (var globalvar in rooms[roomNum].globalvars)
  {
    if (globalvar != null) buffer.push(rooms[roomNum].globalvars[globalvar]);
  }

  //Send the buffer :)
  client.send(
  {
    buffer: buffer
  });
}

/**
  * Copied from the old source code, saves the message from the client and broadcast it
  */
function onGameMessage(client, message)
{
  //If this is a ping, send a pingback
  if (message == "ping")
  {
    client.send(
    {
      pingback: true
    });
    return;
  }

  var msg = {
    message: [client.sessionId, message]
  };

  //broadcast this message to every user and the client itself
  broadcast2room(client, msg);
  client.send(msg);
  console.log(msg);
  
  //on which room we are?
  var roomNum = session2room[client.sessionId];

  //is this a global value? so save in the globalvars
  if (message.split(':')[0] == "global")
  {
    rooms[roomNum].globalvars[message.split(':')[1]] = msg;
  }
  else
  {
    //It's a user value, so save this message in the user array
    for (i = 0; i < rooms[roomNum].users.length; i++)
    {
      if (rooms[roomNum].users[i].sessionId == client.sessionId)
      {
        var typ = message.split(':')[0];
        rooms[roomNum].users[i][typ] = msg;

        if (message.split(':')[0] == "pos") 
          rooms[roomNum].users[i]["lastmove"] = new Date().getTime();

        break;
      }
    }
  }
}

/**
  * Copied from the old source code, removed the disconnecting client from the intern array
  */
function onGameDisconnect(client)
{
  //broadcast the disconnect
  broadcast2room(client,
  {
    announcement: client.sessionId + ' disconnected'
  });

  //on which room we are?
  var roomNum = session2room[client.sessionId];

  //go trough all users of this room and remove the leaving one out of the array
  for (i = 0; i < rooms[roomNum].users.length; i++)
  {
    if (rooms[roomNum].users[i].sessionId == client.sessionId)
    {
      rooms[roomNum].users.splice(i, 1);
      break;
    }
  }

  ensureThereIsACatcher(client);
}

function ensureThereIsACatcher(client)
{
  //on which room we are?
  var roomNum = session2room[client.sessionId];

  //Who is the the catcher? extract out of saved message
  var catcherId = rooms[roomNum].globalvars.catcher != null ? rooms[roomNum].globalvars.catcher.message[1].split(":")[2] : -1;
  var needANewCatcher = true;

  //if a catcher is set, check if the catcher is still in the room
  if (catcherId != -1)
  {
    for (var i = 0; i < rooms[roomNum].users.length; i++)
    {
      if (rooms[roomNum].users[i].sessionId == catcherId)
      {
        needANewCatcher = false;
        break;
      }
    }
  }

  //if we need a new catcher and there are users in the room, select randomised a new catcher
  if (needANewCatcher && rooms[roomNum].users.length > 0)
  {
    var newCatcherIndex = Math.floor(Math.random() * rooms[roomNum].users.length);
    var newCatcherId = rooms[roomNum].users[newCatcherIndex].sessionId;

    var msg = {
      message: [newCatcherId, "global:catcher:" + newCatcherId]
    };
    rooms[roomNum].globalvars.catcher = msg;
    broadcast2room(client, msg);
  }
  //if noone is in the room, set catcher to null
  else if (rooms[roomNum].users.length == 0)
  {
    rooms[roomNum].globalvars.catcher = null;
  }
}

/*******************
**INTERVAL TASKS ***
*******************/

setInterval(updateScore,1000);

function updateScore()
{
  for(var roomNum in rooms)
  {
    var catcherId=rooms[roomNum].globalvars.catcher != null ? rooms[roomNum].globalvars.catcher.message[1].split(":")[2] : -1;
    
    for ( i=0; i < rooms[roomNum].users.length; i++ )
    {
      if(rooms[roomNum].users[i]["score"])
      {
        var score = Number(rooms[roomNum].users[i]["score"].message[1].split(":")[1]);
    
        if(rooms[roomNum].users[i].sessionId != catcherId && rooms[roomNum].users[i]["score"] && (new Date().getTime() - rooms[roomNum].users[i]["lastmove"] < 1000))
        {  
          score++;
          rooms[roomNum].users[i]["score"].message[1] = "score:" + score;
        }
      }
    }
  }
}

setInterval(tellUsersTheScore,5000);

function tellUsersTheScore()
{ 
  for(var roomNum in rooms)
  {
    var buffer = [];
    
    for (var i=0; i < rooms[roomNum].users.length; i++ )
    {
      buffer.push(rooms[roomNum].users[i]["score"]);
    }
      
    for(var i in room2sessions[roomNum])
    {
      socketio.clients[room2sessions[roomNum][i]].send({ buffer: buffer });
    }
  }
}

var lastGameBreak=new Date().getTime();

setTimeout(breakGame,60000);

function breakGame()
{
  lastGameBreak=new Date().getTime();
  socketio.broadcast({break:10});
  
  //clear all scores
  for(var roomNum in rooms)
  {
    for ( i=0; i < rooms[roomNum].users.length; i++ )
    {
      if(rooms[roomNum].users[i]["score"])
      {
         rooms[roomNum].users[i]["score"].message[1] = "score:" + 0;
      }
    }
  }
  
  setTimeout(breakGame,70000);
}
