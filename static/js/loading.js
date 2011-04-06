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

var timePingStart;
var pingtimes = [];

/* Added by John to add functionality for URL rooms */
$.extend({
  getUrlVars: function(){
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
      hash = hashes[i].split('=');
      vars.push(hash[0]);
      vars[hash[0]] = hash[1];
    }
    return vars;
  },
  getUrlVar: function(name){
    return $.getUrlVars()[name];
  }
});

$.extend({
  getUrlVars: function(){
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
      hash = hashes[i].split('=');
      vars.push(hash[0]);
      vars[hash[0]] = hash[1];
    }
    return vars;
  },
  getUrlVar: function(name){
    return $.getUrlVars()[name];
  }
});
// get the url and check for a parameter
/* End of new code */

function startPing()
{
  timePingStart = new Date().getTime();
  socket.send(
  {
    type: "ping",
    data: ""
  });
}
function pingedBack()
{
  var timePingBack = new Date().getTime();
  var pingLatency = (timePingBack - timePingStart) / 2;
  pingtimes.push(pingLatency);
  if (pingtimes.length < 3)
  {
  startPing();
  }
  else
  {
    var pingSum = 0;
    for (var i = 0; i < pingtimes.length; i++)
    {
      pingSum += pingtimes[i];
    }
    latency = Math.round(pingSum / pingtimes.length);
//    $('#latency').text(latency);
    if (latency > 100){
       document.location = "/static/about.html";
    }
    else {
      var url = $.getUrlVar('source');
      if (url)
      {
        url = escape(url);
        url.replace("/","");
        document.location = '/urlroom/'+url;
      }
      else
      {
        socket.send({type: "requestRoom", data: {latency: latency}});
      }
   }
}
}

function connect()
{
  socket = new io.Socket();
  socket.connect();
  socket.on('connect', function (obj)
  {
    startPing();
  });
  socket.on('message', function (obj)
  {
    message(obj);
  });
}

function redirectRoom(roomNum)
  {
  document.location = '/room/'+roomNum;
  } 

function message(obj)
{
  if (obj == null) return;
  if (obj.type == "pingback")
  {
    pingedBack();
    return;
  }
  if (obj.type == "responseRoom")
  {
    //console.log(obj.data.roomNum);
    redirectRoom(obj.data.roomNum);
    return;
  }
}

$(document).ready(function ()
{
  var url = $.getUrlVar('source');
  if (!url)
  {
    connect();
  }
  else
  {
  url = escape(url);
  url = url.replace(/\//g,"");
  document.location = '/urlroom/'+url;
  }
});





