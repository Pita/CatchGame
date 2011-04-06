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

var http = require('http')
  , url = require('url')
  , fs = require('fs')
  , io = require('socket.io')
  , sys = require('sys')
  , server;

server = http.createServer(function(req, res){
  var path = url.parse(req.url).pathname;
  
  if(path == "/")
  {
    sendFile(res, path, __dirname + "/static/loading.html");
  }
  else if(path == "/favicon.ico")
  {
    sendFile(res, path, __dirname + "/static/favicon.ico");
  }
  else if(path == "/robots.txt")
  {
    sendFile(res, path, __dirname + "/static/robots.txt");
  }
  else if(path.substring(0,"/static".length) == "/static")
  {
    sendFile(res, path, __dirname + path);
  }
  else if(path.match("/room/[1-5][0-9][0-9][0-9][0-9]"))
  {
    sendFile(res, path, __dirname + "/static/game.html");
  }
  else if(path.substring(0,"/urlroom/".length) == "/urlroom/")
  {
    sendFile(res, path, __dirname + "/static/game.html");
  }
  else
  {
    send404(res, path);
  }
});
server.listen(80);

function sendFile(res, reqPath, path)
{
  path=path.replace("../","");

  fs.readFile(path, function(err, data){
    if (err){
      send404(res, reqPath);
    } else {
      var contentType = "text/html";
    
      if (path.substring(path.length -3, path.length) == ".js")
        contentType = "text/javascript";
      else if (path.substring(path.length -4, path.length) == ".css")
        contentType = "text/css";
      else if (path.substring(path.length -4, path.length) == ".gif")
        contentType = "image/gif";
      else if (path.substring(path.length -4, path.length) == ".png")
        contentType = "image/png";   
      else if (path.substring(path.length -4, path.length) == ".ico")
        contentType = "image/x-icon";

    
      res.writeHead(200, {'Content-Type': contentType});
      res.write(data, 'utf8');
      res.end();
      
      requestLog(200, reqPath, "-> " + path);
    }
  });
}

function send404(res, reqPath)
{
  res.writeHead(404);
  res.write("404 - Not Found");
  res.end();
  
  requestLog(404, reqPath, "NOT FOUND!");
}

function sendRedirect(res, reqPath, location)
{
  res.writeHead(302, {'Location': location});
  res.end();
  
  requestLog(302, reqPath, "-> " + location);
}

function requestLog(code, path, desc)
{
  console.log(code +", " + path + ", " + desc);
}

var io = io.listen(server);
var messageHandler = require("./MessageHandler");
messageHandler.setSocketIO(io);

io.on('connection', function(client){
  try{
    messageHandler.handleConnect(client);
  }catch(e){exception(e);}
  
  client.on('message', function(message){
    try{
      messageHandler.handleMessage(client, message);
    }catch(e){exception(e);}
  });

  client.on('disconnect', function(){
    try{
      messageHandler.handleDisconnect(client);
    }catch(e){exception(e);}
  });
});

function exception(e)
{
  if(typeof e == "string")
  {
    console.error("Throw: " + e);
  }
  else if(e.stack)
  {
    console.error("Stack: " + e.stack);
  }
  else
  {
    console.error(JSON.stringify(e));
  }
}

// socket.io, I choose you
/*var io = io.listen(server);

var globalvars = [];
var users = [];
  
io.on('connection', function(client){
  client.broadcast({ announcement: client.sessionId + ' connected' });

  var buffer = [];

  buffer.push({userid : client.sessionId});

  for(i=0; i < users.length; i++)
  {
    buffer.push({announcement: users[i].sessionId + ' connected'});
    
    for (var value in users[i]) 
    {
      if(value != "sessionId" && users[i][value]!=null && users[i][value].message)
        buffer.push(users[i][value]);
    }
  }
  
  users.push({sessionId : client.sessionId});  
  ensureThereIsACatcher();
  
  for (var globalvar in globalvars) 
  {
      if(globalvar != null)
        buffer.push(globalvars[globalvar]);
  }
  
  client.send({ buffer: buffer });

  client.on('message', function(message){
    if(message == "ping")
    {
      client.send({pingback : true});
      return;
    }
  
    var msg = { message: [client.sessionId, message] };
    client.broadcast(msg);
    client.send(msg);
    console.log(msg);
    
    if(message.split(':')[0] == "global")
    {
      globalvars[message.split(':')[1]] = msg;
    }
    else
    {
      for ( i=0; i < users.length; i++ )
      {
        if(users[i].sessionId == client.sessionId)
        {
          var typ = message.split(':')[0];
          users[i][typ]=msg;
          
          if(message.split(':')[0] == "pos")
            users[i]["lastmove"] = new Date().getTime();
          
          break;
        }
      }
    }
  });

  client.on('disconnect', function(){
    client.broadcast({ announcement: client.sessionId + ' disconnected' });
    
    for ( i=0; i < users.length; i++ )
    {
      if(users[i].sessionId == client.sessionId)
      {
        users.splice(i,1);
        break;
      }
    }
    
    ensureThereIsACatcher()
  });
  
  function ensureThereIsACatcher()
  {
     var catcherId=globalvars.catcher != null ? globalvars.catcher.message[1].split(":")[2] : -1;
     var needANewCatcher=true;

     if(catcherId != -1)
     {
       for ( i=0; i < users.length; i++ )
       {
         if(users[i].sessionId == catcherId)
         {
           needANewCatcher=false;
           break;
         }
       }
     }  
     
     if(needANewCatcher && users.length > 0)
     {
        var newCatcherIndex = Math.floor(Math.random() * users.length);
        var newCatcherId = users[newCatcherIndex].sessionId;
        
        var msg = { message: [newCatcherId, "global:catcher:" + newCatcherId] };
        globalvars.catcher = msg;
        client.broadcast(msg);
        console.log(msg);
     }
     else if(users.length == 0)
     {
       globalvars.catcher = null;
     }
  }
});

setInterval(tellUsersTheScore,5000);
setInterval(updateScore,1000);

function updateScore()
{
  var catcherId=globalvars.catcher != null ? globalvars.catcher.message[1].split(":")[2] : -1;    

  for ( i=0; i < users.length; i++ )
  {
    if(users[i]["score"])
    {
      var score = Number(users[i]["score"].message[1].split(":")[1]);
  
      if(users[i].sessionId != catcherId && users[i]["score"] && (new Date().getTime() - users[i]["lastmove"] < 1000))
      {  
        score++;
        users[i]["score"].message[1] = "score:" + score;
      }
    }
  }
}
  
function tellUsersTheScore()
{ 
  var buffer = [];
  
  for ( i=0; i < users.length; i++ )
  {
    buffer.push(users[i]["score"]);
  }
    
  io.broadcast({ buffer: buffer });
}*/

