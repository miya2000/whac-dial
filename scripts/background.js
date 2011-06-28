
// global variables
var storage = new StorageEx(localStorage);
var speeddial = (function() { try { return opera.contexts.speeddial; } catch(e) {} })();
var current_data = {
    title: null,
    url: null,
    score: 0,
    skip_reset_score_confirm: false,
    game: 'default',
    games_list: [],
    games_info: {
        'default': {
            src: 'character/gohst.svg',
            pref: {
                character: 'Akabei',
                direction: 'right'
            }
        }
    }
};
var isBackground = !!opera.extension.broadcastMessage;
var timer = new TimerManager();

// background initialize.
loadData();
updateSpeedDialPreferences();
listenExtensionMessage();

/**
 * load data from storage.
 */
function loadData() {
    // main data.
    current_data.title = def(storage.get('title'), current_data.title);
    current_data.url   = def(storage.get('url'), current_data.url);
    current_data.score = def(storage.get('score'), current_data.score);
    current_data.skip_reset_score_confirm = def(storage.get('skip_reset_score_confirm'), current_data.skip_reset_score_confirm);
    current_data.game = def(storage.get('game'), current_data.game);
    current_data.games_list = def(storage.get('games_list'), current_data.games_list);
    // game info.
    var default_gameinfo = current_data.games_info['default'];
    current_data.games_info = {};
    current_data.games_info['default'] = default_gameinfo;
    current_data.games_info['default'].pref = def(getGamePrefStorage('default'), default_gameinfo.pref);
    for (var i = 0, len = current_data.games_list.length; i < len; i++) {
        var game = current_data.games_list[i];
        current_data.games_info[game] = {
            src : getGameSrcStorage(game),
            pref: getGamePrefStorage(game)
        };
    }
    function def(value, defaultValue) {
        return (value != null) ? value : defaultValue;
    }
}
/**
 * get current game source.
 * @param {String} game game name. 
 * @return current game source.
 */
function getGameSrc(game) {
    return (current_data.games_info[game] || {}).src;
}
/**
 * get game preferences.
 * @param {String} game game name. 
 * @return current game preferences.
 */
function getGamePref(game) {
    return (current_data.games_info[game] || {}).pref;
}
/**
 * get current game source from storage.
 * @param {String} game game name. 
 * @return current game preferences.
 */
function getGameSrcStorage(game) {
    return storage.get('games_info.' + game + '.src') || null;
}
/**
 * set current game source to storage.
 * @param {String} game game name. 
 * @param {String} src game source.
 */
function setGameSrcStorage(game, src) {
    if (game == 'default') return;
    storage.set('games_info.' + game + '.src', src);
}
/**
 * get current game preferences from storage.
 * @param {String} game game name. 
 * @return current game preferences.
 */
function getGamePrefStorage(game) {
    return storage.get('games_info.' + game + '.pref') || {};
}
/**
 * set game preferences to storage.
 * @param {String} game game name. 
 * @return current game preferences.
 */
function setGamePrefStorage(game, pref) {
    storage.set('games_info.' + game + '.pref', pref);
}
/**
 * remove game info.
 * @param {String} game game name. 
 * @return current game preferences.
 */
function removeGame(game) {
    if (game == 'default') return;
    delete current_data.games_info[game];
    storage.remove('games_info.' + game + '.src');
    storage.remove('games_info.' + game + '.pref');
    current_data.games_list = current_data.games_list.filter(function(item) {
        return item != game;
    });
    storage.set('games_list', current_data.games_list);
}

/**
 * update SpeedDial Preferences to context.
 */
function updateSpeedDialPreferences() {
    if (speeddial) {
        if (current_data.title) {
            speeddial.title = current_data.title;
        }
        if (current_data.url) {
            speeddial.url = current_data.url;
        }
        else {
            speeddial.url = 'options.html';
            current_data.url = speeddial.url; // save "widget://wuid-xxx/options.html"
        }
    }
    $('#Dial_url').val(storage.get('url'));
    $('#Dial_title').val(storage.get('title'));
}

/**
 * listen Extension Message.
 */
function listenExtensionMessage() {
    opera.extension.onmessage = on_extension_message;
}

/**
 * get game screen window.
 * @return {Window} game screen window.
 */
function $screen(game) {
    var game = game || current_data.game;
    var screen_object;
    if (game == 'default') {
        screen_object = document.getElementById('MAIN_SCREEN');
    }
    else {
        screen_object = document.getElementById('MAIN_SCREEN_EXTRA');
    }
    if (!screen_object || !screen_object.contentWindow) return null;
    return screen_object.contentWindow;
}

/**
 * send game command.
 * @param {Object} data comand data.
 * @return {Function} [callback] callback function that receive command result.
 */
function sendCommand(data, callback, game) {
    var targetWindow = $screen(game);
    if (!targetWindow) return;
    if (typeof callback == 'function') {
        var channel = new MessageChannel();
        var port = channel.port1;
        port.onmessage = function on_port_message_sendCommand(e) {
            try {
                if (e.data instanceof Error) {
                    debug(e.data);
                }
                else {
                    callback(e.data);
                }
            }
            finally {
                port.close();
            }
        };
        targetWindow.postMessage(data, '*', [channel.port2]);
    }
    else {
        targetWindow.postMessage(data, '*');
    }
}
/**
 * listen command from game window.
 * @return {Function} callback callback function that receive command from game window.
 */
function listenCommand(callback) {
    var targetWindow = $screen();
    if (!targetWindow) return;
    var channel = new MessageChannel();
    var port = channel.port1;
    port.onmessage = function on_port_message_listenCommand(e) {
        if (e.data instanceof Error) {
            debug(e.data);
        }
        else {
            callback(e.data);
        }
    };
    targetWindow.postMessage({type: 'connect'}, '*', [channel.port2]);
}

/**
 * update current data and preferences.
 */
function update() {
    var pre_data = cloneObject(current_data);
    loadData();
    
    if (current_data.url != pre_data.url || current_data.title != pre_data.title) {
        updateSpeedDialPreferences();
    }
    if (current_data.score != pre_data.score) {
        setScore(current_data.score, true);
    }
    if (current_data.skip_reset_score_confirm != pre_data.skip_reset_score_confirm) {
        setSkipResetScoreConfirm(current_data.skip_reset_score_confirm, true);
    }
    if (current_data.game != pre_data.game ||
        current_data.games_info[current_data.game].src != pre_data.games_info[pre_data.game].src
    ) {
        setGame(current_data.game, true);
    }
    else {
        var current_pref = (current_data.games_info[current_data.game] || {}).pref;
        var pre_pref = (pre_data.games_info[current_data.game] || {}).pref;
        for (var k in current_pref) {
            if (current_pref.hasOwnProperty(k)) {
                if (current_pref[k] != pre_pref[k]) {
                    setGamePreference(current_data.game, k, current_pref[k], true);
                }
            }
        }
    }
    var pre_extra_src = pre_data.games_info.extra && pre_data.games_info.extra.src;
    var cur_extra_src = current_data.games_info.extra && current_data.games_info.extra.src;
    if (pre_extra_src != cur_extra_src) {
        setExtraUrl(cur_extra_src || '');
    }
}

/**
 * notify all extension pages of update of data and preferences.
 */
function notifyAllOfUpdate(){
    if (isBackground) {
        update();
        opera.extension.broadcastMessage({type:'update'});
    }
    else if (opera.extension.bgProcess) {
        opera.extension.bgProcess.top.notifyAllOfUpdate();
    }
}
/**
 * add game to game list.
 * @param {String} game game name.
 */
function addGamesList(game) {
    game = String(game);
    var list = current_data.games_list;
    if (list.indexOf(game) >= 0) return;
    list.push(game);
    storage.set('games_list', list);
}

/**
 * set speed dial url.
 * @param {String} value url
 * @param {Boolean} [fromBackground] call from background page or not.
 */
function setUrl(value, fromBackground) {
    current_data.url = value;
    if (!fromBackground) {
        storage.set('url', value);
        notifyAllOfUpdate();
    }
}
/**
 * set speed dial title.
 * @param {String} value title
 * @param {Boolean} [fromBackground] call from background page or not.
 */
function setTitle(value, fromBackground) {
    current_data.title = value;
    if (!fromBackground) {
        storage.set('title', value);
        notifyAllOfUpdate();
    }
}
/**
 * set game score to 0.
 * @param {Boolean} [fromBackground] call from background page or not.
 */
function resetScore(fromBackground) {
    setScore(0, fromBackground);
}
/**
 * set game score.
 * @param {String} value score
 * @param {Boolean} [fromBackground] call from background page or not.
 */
function setScore(value, fromBackground) {
    sendCommand({type: 'score', value: value}, function receive_score(result) {
        current_data.score = result;
        if (!fromBackground) {
            storage.set('score', value);
            notifyAllOfUpdate();
        }
    });
}
/**
 * set SkipResetScoreConfirm.
 * @param {String} value SkipResetScoreConfirm
 * @param {Boolean} [fromBackground] call from background page or not.
 */
function setSkipResetScoreConfirm(value, fromBackground) {
    current_data.skip_reset_score_confirm = value || '';
    if (!fromBackground) {
        storage.set('skip_reset_score_confirm', value);
        notifyAllOfUpdate();
    }
    $('#Score_skip_reset_score_confirm').prop('checked', current_data.skip_reset_score_confirm);
}
/**
 * set game preference.
 * @param {String} game game name to set preference.
 * @param {String} name preference name.
 * @param {String} value preference value.
 * @param {Boolean} [fromBackground] call from background page or not.
 */
function setGamePreference(game, name, value, fromBackground) {
    var current_pref = getGamePref(game);
    // Workaround for Bug on Opera 11.50 beta Build 1040
    // (.oex couldn't execute below.)
    //if (name in current_pref) { 
        sendCommand({type: name, value: value}, function receive_data(result) {
            if (current_pref[name] != result) {
                current_pref[name] = result;
                if (!fromBackground) {
                    setGamePrefStorage(game, current_pref);
                    notifyAllOfUpdate();
                }
            }
            setGamePreferenceUI(game, name, result);
        }, game);
    //}
}
/**
 * set game preference UI.
 * @param {String} game game name to set preference.
 * @param {String} name preference name.
 * @param {String} value preference value.
 */
function setGamePreferenceUI(game, name, value) {
    $('*[data-game="' + escQuery(game) + '"][name="' + escQuery(name) + '"]').each(function() {
        var q = $(this);
        if (q.prop('type') == 'radio') {
            if (q.val() == value) {
                q.prop('checked', true);
                debug(q.val() + ' ' + q.prop('checked') + ' ' + location.href)
            }
        }
        else if (q.prop('type') == 'checkbox') {
            q.prop('checked', q.val() == value);
        }
        else {
            q.val(value);
        }
    });
}

/**
 * build screen.
 */
function buildScreen() {
    var game = current_data.game;
    var src = getGameSrc(game);
    var pref = getGamePref(game);
    
    var params = { score: current_data.score };
    applyProperty(params, pref);
    var href = /^data:/.test(src) ? src : appendQuery(src, params);
    
    var object_main = $q('#MAIN_SCREEN');
    var object_extra = $q('#MAIN_SCREEN_EXTRA');
    var object;
    hide(object_main);
    hide(object_extra);
    if (game == 'default') {
        object = object_main;
    }
    else {
        object = object_extra;
    }
    applyAttribute(object, { data: href });
    
    var p = object.parentNode;
    var n = object.nectSibling;
    p.removeChild(object);
    show(object);
    object.onload = on_screen_load;
    p.insertBefore(object, n);
}
/**
 * set game.
 * @param {String} game game name.
 * @param {Boolean} [fromBackground] call from background page or not.
 */
function setGame(game, fromBackground) {
    if (!getGameSrc(game)) {
        game = 'default';
    }
    if (current_data.game != game || fromBackground) {
        current_data.game = game;
        buildScreen();
        if (!fromBackground) {
            storage.set('game', game);
            notifyAllOfUpdate();
        }
    }
    $('#Extra_use_extra_game_url').prop('checked', game == 'extra');
}
/**
 * set game source.
 * @param {String} game game name.
 * @param {String} src game src.
 * @param {Boolean} [fromBackground] call from background page or not.
 */
function setGameSrc(game, src, fromBackground) {
    if (game == 'default') return;
    if (!current_data.games_info[game]) {
        current_data.games_info[game] = {};
        addGamesList(game);
    }
    if (current_data.games_info[game].src != src || fromBackground) {
        current_data.games_info[game].src = src;
        if (current_data.game == game) {
            buildScreen();
        }
        if (!fromBackground) {
            setGameSrcStorage(game, src);
            notifyAllOfUpdate();
        }
    }
}

/**
 * set use extra url or not.
 * @param {Boolean} value use extra url or not.
 */
function setUseExtraUrl(value) {
    if (value) {
        setGame('extra');
    }
    else {
        setGame('default');
    }
}
/**
 * set extra url.
 * if url is empty, remove extra game info and set game to default.
 * @param {String} url url
 */
function setExtraUrl(url) {
    var url = trim(url);
    $('#Extra_url').text(url);
    if (url) {
        setGameSrc('extra', url);
        $('#Extra_use_extra_game_url_container').show();
        $('#Extra_url_container').show();
    }
    else {
        removeGame('extra');
        setUseExtraUrl(false);
        $('#Extra_use_extra_game_url_container').hide();
        $('#Extra_url_container').hide();
    }
}

var uiBlocker;
function showDialog(content) {
    // if already blocking, replace content and return;
    if (uiBlocker) {
        if (uiBlocker.content) uiBlocker.content.parentNode.removeChild(uiBlocker.content);
        uiBlocker.content = setContent(content);
        return;
    }
    function setContent(content) {
        if (!content || typeof content == 'string') {
            var message = content || '';
            content = document.createElement('p');
            content.style.cssText = 'color: white; font-size: 18px; text-align: center; max-width: 60%;';
            content.textContent = message;
        }
        if (content) {
            content.style.position = 'absolute';
            content.style.zIndex = '1001';
            content.style.display = 'block';
            if (!content.parentElement) {
                document.body.appendChild(content);
            }
            content.style.top  = (Math.max((window.innerHeight - content.offsetHeight) / 2 - 50, 10) + document.documentElement.scrollTop ) + 'px';
            content.style.left = (Math.max((window.innerWidth  - content.offsetWidth ) / 2, 5) + document.documentElement.scrollLeft) + 'px';
            content.addEventListener('mousedown', function(e) {
                var inputs = $X('descendant::*[self::input or self::select or self::button or self::textarea]', content);
                if (inputs.indexOf(e.target) < 0) {
                    e.preventDefault();
                }
            }, false);
        }
        return content;
    }
    uiBlocker = {
    };
    var self = this;
    var background = uiBlocker.background = document.createElement('div');
    background.style.cssText = 'width: 100%; height: 100%; position: fixed; top: 0; left: 0; z-index: 1000; background-color: #000; opacity: 0.3;';
    background.addEventListener('mousedown', function(e) { e.preventDefault() }, false);
    background.addEventListener('dblclick', function(e) { hideDialog() }, false);
    document.body.appendChild(background);
    var dummy = document.createElement('input');
    dummy.style.cssText = 'visibility: hidden; width: 0; height: 0;';
    background.appendChild(dummy);
    dummy.focus();
    
    uiBlocker.content = setContent(content);
    if (uiBlocker.content) {
        var inputs = $X('descendant::*[self::input or self::select or self::button or self::textarea]', uiBlocker.content);
        if (inputs.length > 0) {
            //timer.setTimeout('focus', function() { inputs[0].focus(); }, 0);
        }
    }
    uiBlocker.handler = function(e) {
        if (e.keyCode == 27) { // Esc
            hideDialog();
        }
        else if (e.keyCode == 9) { // Tab
            var inputs = $X('descendant::*[self::input or self::select or self::button or self::textarea]', uiBlocker.content); // for dynamic change.
            if (inputs.length == 0) {
                e.preventDefault();
            }
            else if (inputs.indexOf(e.target) < 0) {
                e.preventDefault();
                inputs[0].focus();
            }
            else if (e.target == inputs[0] && e.shiftKey) {
                e.preventDefault();
                inputs[inputs.length -1].focus();
            }
            else if (e.target == inputs[inputs.length -1] && !e.shiftKey) {
                e.preventDefault();
                inputs[0].focus();
            }
        }
    }
    window.addEventListener('keypress', uiBlocker.handler, false);
}
function hideDialog() {
    if (!uiBlocker) return;
    window.removeEventListener('keypress', uiBlocker.handler, false);
    uiBlocker.background.parentNode.removeChild(uiBlocker.background);
    if (uiBlocker.content) {
        uiBlocker.content.style.display = 'none';
    }
    uiBlocker = null;
};

function showExtraDialog() {
    var ele = $('.extra_dialog');
    ele.find('#Extra_Dialog_url').change(extraDialog_url_onchange);
    ele.find('#Extra_Dialog_url').keydown(extraDialog_url_keydown);
    if (current_data.games_info.extra) {
        ele.find('#Extra_Dialog_url').val(current_data.games_info.extra.src);
        ele.find('#Extra_Dialog_screen').attr('src', current_data.games_info.extra.src);
    }
    showDialog(ele.get(0));
}

function extraDialog_url_onchange(e) {
    extraDialog_replaceScreen(this.value);
}
function extraDialog_url_keydown(e) {
    if (e.keyCode == 13) { // Enter
        this.blur(); this.focus();
    }
}

function extraDialog_replaceScreen(url) {
    var url = trim(url);
    if (!url) {
        url = 'empty.html';
    }
    var iframe = $('#Extra_Dialog_screen');
    if (iframe.attr('src') != url) {
        $('#Extra_Dialog_ok').prop('disabled', true);
        var parent = iframe.parent();
        //iframe.remove();
        //iframe = iframe.clone(false);
        iframe.attr('src', url);
        iframe.load(extraDialog_screen_onload);
        //parent.append(iframe); // Workaround for Crash on Opera 11.50 beta Build 1040
    }
}
function extraDialog_screen_onload() {
    $('#Extra_Dialog_ok').prop('disabled', false);
    if ($('#Extra_Dialog_url').val() != '') {
        $('#Extra_Dialog_url').val($('#Extra_Dialog_screen').prop('src'));
    }
}
function extraDialog_ok() {
    var url = $('#Extra_Dialog_url').val();
    setExtraUrl(url);
    setUseExtraUrl(true);
    hideDialog();
}

/**
 * set game preference.
 * @param {String} url opened url.
 * @param {Function} callback callback.
 */
function opened(url, callback) {
    // allow '/' redirection.
    if (String(url).replace(/\/$/, '') == String(current_data.url).replace(/\/$/, '')) {
        sendCommand({type: 'hit'}, callback);
    }
}

/**
 * loaded game screen.
 * @param {Event} event object.
 */
function on_screen_load(e) {
    listenCommand(on_screen_message);
}

/**
 * receive command from injected script or the other extension page.
 * @param {MessageEvent} event object.
 */
function on_extension_message(event) {
    switch(event.data.type){
        case 'update': 
            update();
            break;
        case 'open': 
            opened(event.data.url);
            break;
    }
};

/**
 * handler of message event from game screen.
 * @param {Object} data message data.
 * @param {String} data.type message type.
 */
function on_screen_message(data) {
    if (data.type == 'hit') {
        sendCommand({type: 'score'}, function receive_score(result) {
            setScore(result);
        });
    }
}

/**
 * page initialze.
 */
function init() {
    if (opera.extension.bgProcess) {
        opera.extension.bgProcess.top.opened(location.href, function recieve_result(result) {
            if (result == true) {
                sendCommand({type: 'effect', value: 'hit'});
            }
        });
    }
    // Workaround for Bug on Opera 11.50 alpha Build 1009
    if (isBackground) {
        try {
            var screen = $screen();
            if (screen) {
                screen.opera.extension.onmessage = opera.extension.onmessage;
            }
        } catch (x) {debug(x);}
    }
}
window.onload = init;
