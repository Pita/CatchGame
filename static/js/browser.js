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

$(document).ready(function () {
    var ieadvice = 'Internet explorer does not support web sockets, we recommend using <a href="http://www.google.com/chrome">Google Chrome</a> or <a href="http://firefox.com">Mozilla FireFox</a>';
    var oldfirefox = 'Your Firefox is out of date, <a href="http://firefox.com">update to the latest Firefox here</a>';
    var firefoxsocketsdisabled = 'You need to enable websockets in Firefox, to do this:<Br/><br/>1. Type about:config in address bar and continue by clicking I will be careful, I promise.<br/><Br/>2. Set network.websocket.enabled  value to true and set network.websocket.override-security-block preferences to true.<Br/><Br/>3. Restart Firefox browser.';
    var oldchrome = 'Your Chrome is out of date, <a href="http://google.com/chrome">update to the latest Chrome here</a>';
    var oldsafari = 'Your Safari is out of date..  Go update...';
    var oldopera = 'Your Opera is out of date..  Go update...';
    var operasocketsdisabled = 'You need to enable websockets in Opera, to do this: <br/><br/>1. Type opera:config in the address bar and press Enter.<br/><br/>2. In the Preferences Editor, expand the "User Prefs" topic and see "Enable WebSockets".<br/><br/>3. Click the "Enable WebSockets" check box.';
   

    function detectBrowserVersion() {
        var userAgent = navigator.userAgent.toLowerCase();
        $.browser.chrome = /chrome/.test(navigator.userAgent.toLowerCase());
        var version = 0;

        // Is this a version of IE?
        if ($.browser.msie) {
            userAgent = $.browser.version;
            userAgent = userAgent.substring(0, userAgent.indexOf('.'));
            version = userAgent;
        }

        // Is this a version of Chrome?
        if ($.browser.chrome) {
            userAgent = userAgent.substring(userAgent.indexOf('chrome/') + 7);
            userAgent = userAgent.substring(0, userAgent.indexOf('.'));
            version = userAgent;
            // If it is chrome then jQuery thinks it's safari so we have to tell it it isn't
            $.browser.safari = false;
        }

        // Is this a version of Safari?
        if ($.browser.safari) {
            userAgent = userAgent.substring(userAgent.indexOf('safari/') + 7);
            userAgent = userAgent.substring(0, userAgent.indexOf('.'));
            version = userAgent;
        }

        // Is this a version of Mozilla?
        if ($.browser.mozilla) {
            //Is it Firefox?
            if (navigator.userAgent.toLowerCase().indexOf('firefox') != -1) {
                userAgent = userAgent.substring(userAgent.indexOf('firefox/') + 8);
                userAgent = userAgent.substring(0, userAgent.indexOf('.'));
                version = userAgent;
            }
            // If not then it must be another Mozilla
            else {}
        }

        // Is this a version of Opera?
        if ($.browser.opera) {
            userAgent = userAgent.substring(userAgent.indexOf('version/') + 8);
            userAgent = userAgent.substring(0, userAgent.indexOf('.'));
            version = userAgent;
        }
        return version;
    }

    // ie, lols
    if ($.browser.msie) $('#advice').html(ieadvice);

    // firefox
    if ($.browser.mozilla) {
        if (detectBrowserVersion() < 4) $('#advice').html(oldfirefox);
        if (detectBrowserVersion() >= 4) $('#advice').html(firefoxsocketsdisabled);
    }

    // chrome
    if ($.browser.chrome) {
        if (detectBrowserVersion() < 10) $('#advice').html(oldchrome);
    }

    // safari
    if ($.browser.safari) {
        if (detectBrowserVersion() < 5) $('#advice').html(oldsafari);
    }

    // opera
    if ($.browser.opera) {
        if (detectBrowserVersion() < 11) $('#advice').html(oldopera);
        if (detectBrowserVersion() >= 11) $('#advice').html(operasocketsdisabled);
    }

    
});
